import * as fs from "node:fs";
import * as path from "node:path";
import { createPublicClient, http } from "viem";
import { base } from "viem/chains";
import { configuredRpcUrls, withRpcFailover } from "./rpcFailoverRuntime.mjs";
import {
  RANGE_MANAGER_ADDRESS,
  TREASURY_SAFE_ADDRESS,
  USDC_ADDRESS,
  RANGE_MANAGER_ABI,
  ERC20_ABI,
  analyzeGridLiquidity,
  synthesizeBuyBracket,
  synthesizeSellBracket,
  buildSafeBatchJson,
  buildRangeRangerTelegramAlert,
} from "./rangeRangerRuntime.mjs";

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const enabled = ["true", "1"].includes(String(process.env.RANGE_RANGER_ALERT_ENABLED || "false").toLowerCase());
const testNotification = process.argv.includes("--test-notification");
const runOnce = process.argv.includes("--once");

if (!enabled && !testNotification) {
  console.log("Range Ranger watcher is disabled. Set RANGE_RANGER_ALERT_ENABLED=true to activate.");
  process.exit(0);
}

const botToken = process.env.TELEGRAM_BOT_TOKEN;
const chatId = process.env.TELEGRAM_CHAT_ID;
const pollSeconds = Number(process.env.RANGE_RANGER_POLL_SECONDS || "30");
const trancheUsdc = Number(process.env.RANGE_RANGER_TRANCHE_USDC || "600");
const trancheNara = Number(process.env.RANGE_RANGER_TRANCHE_NARA || "20000");
const minGapPct = Number(process.env.RANGE_RANGER_MIN_GAP_PCT || "20");
const minVolPct = Number(process.env.RANGE_RANGER_VOLATILITY_PCT || "15");

const rpcUrls = configuredRpcUrls();
const redactions = [botToken, ...rpcUrls].filter(Boolean);

function safeMessage(error) {
  let message = error instanceof Error ? error.message : "unknown error";
  for (const secret of redactions) message = message.replaceAll(secret, "[redacted]");
  return message;
}

async function sendTelegram(text) {
  if (!botToken || !chatId) {
    console.log("Telegram not configured. Message preview:\n", text);
    return;
  }
  const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text, disable_web_page_preview: true }),
  });
  if (!response.ok) throw new Error(`Telegram send failed with HTTP ${response.status}`);
}

async function fetchOnChainState(client) {
  const poolState = await client.readContract({
    address: RANGE_MANAGER_ADDRESS,
    abi: RANGE_MANAGER_ABI,
    functionName: "currentPoolState",
  });

  const [orderIds] = await client.readContract({
    address: RANGE_MANAGER_ADDRESS,
    abi: RANGE_MANAGER_ABI,
    functionName: "getActiveOrderIds",
    args: [0n, 50n],
  });

  const activeOrders = [];
  for (const id of orderIds) {
    const raw = await client.readContract({
      address: RANGE_MANAGER_ADDRESS,
      abi: RANGE_MANAGER_ABI,
      functionName: "getOrder",
      args: [id],
    });
    activeOrders.push({
      orderId: id,
      tokenId: raw[0],
      inputAmount: raw[1],
      minimumOutputAmount: raw[2],
      strategyHash: raw[3],
      liquidity: raw[4],
      tickLower: raw[5],
      tickUpper: raw[6],
      side: raw[10],
      status: raw[11],
    });
  }

  const safeUsdcBalance = await client.readContract({
    address: USDC_ADDRESS,
    abi: ERC20_ABI,
    functionName: "balanceOf",
    args: [TREASURY_SAFE_ADDRESS],
  });

  return {
    currentTick: poolState[1],
    sqrtPriceX96: poolState[0],
    activeOrders,
    safeUsdcBalance,
  };
}

async function executeCycle(client, lastState) {
  const state = await fetchOnChainState(client);
  const analysis = analyzeGridLiquidity(state.currentTick, state.activeOrders);

  const now = Date.now();
  let triggerReason = null;

  if (analysis.closestBuyDistancePct === null || analysis.closestBuyDistancePct >= minGapPct) {
    triggerReason = `Liquidity Gap: ${analysis.closestBuyDistancePct !== null ? analysis.closestBuyDistancePct.toFixed(1) + "%" : "No Support"} below spot`;
  }

  if (!triggerReason && lastState.lastAlertPrice) {
    const priceChangePct = Math.abs((analysis.spotPrice - lastState.lastAlertPrice) / lastState.lastAlertPrice) * 100;
    if (priceChangePct >= minVolPct) {
      triggerReason = `Volatile Price Move: ${priceChangePct.toFixed(1)}% shift`;
    }
  }

  const timeSinceLastAlert = now - (lastState.lastAlertTime || 0);
  const isRateLimited = timeSinceLastAlert < 30 * 60 * 1000;

  console.log(
    `[${new Date().toISOString()}] Spot: $${analysis.spotPrice.toFixed(4)} | Nearest Buy: ${
      analysis.closestBuyDistancePct !== null ? analysis.closestBuyDistancePct.toFixed(1) + "%" : "None"
    } | Active Orders: ${analysis.activeBuyCount}B / ${analysis.activeSellCount}S | Safe USDC: $${(
      Number(state.safeUsdcBalance) / 1e6
    ).toFixed(2)}`
  );

  if (triggerReason && (!isRateLimited || testNotification)) {
    console.log(`⚡ Trigger fired: ${triggerReason}`);

    const buyBands = synthesizeBuyBracket(analysis.spotPrice, trancheUsdc, state.currentTick);
    const sellBands = synthesizeSellBracket(analysis.spotPrice, trancheNara, state.currentTick);
    const safeBatch = buildSafeBatchJson({
      chainId: 8453,
      safeAddress: TREASURY_SAFE_ADDRESS,
      staleOrders: analysis.staleOrders,
      buyBands,
      sellBands,
    });

    const deploymentsDir = path.resolve("deployments");
    if (!fs.existsSync(deploymentsDir)) fs.mkdirSync(deploymentsDir, { recursive: true });

    const batchFilename = `UNEXECUTED-atomic-overhaul-${Date.now()}.json`;
    const batchPath = path.join(deploymentsDir, batchFilename);
    fs.writeFileSync(batchPath, JSON.stringify(safeBatch, null, 2));
    console.log(`📁 Saved Safe Batch JSON to ${batchPath}`);

    const alertMsg = buildRangeRangerTelegramAlert({
      reason: triggerReason,
      analysis,
      buyBands,
      sellBands,
      staleOrders: analysis.staleOrders,
      safeUsdcBalance: state.safeUsdcBalance,
      batchFilename: `deployments/${batchFilename}`,
    });

    await sendTelegram(alertMsg);
    console.log("📱 Telegram tactical alert dispatched.");

    lastState.lastAlertTime = now;
    lastState.lastAlertPrice = analysis.spotPrice;
  }

  return lastState;
}

export async function main() {
  console.log("🏹 NARA Range Ranger Watcher starting...");
  console.log(`Config: Poll ${pollSeconds}s | Buy Tranche: $${trancheUsdc} USDC | Sell Tranche: ${trancheNara} NARA | Gap Trigger: ${minGapPct}% | Vol Trigger: ${minVolPct}%`);

  let lastState = { lastAlertTime: 0, lastAlertPrice: null };

  await withRpcFailover(rpcUrls, async (rpcUrl) => {
    const client = createPublicClient({
      chain: base,
      transport: http(rpcUrl, { timeout: 15_000 }),
    });

    if (testNotification) {
      console.log("Running in test notification mode...");
      lastState.lastAlertTime = 0;
      await executeCycle(client, lastState);
      process.exit(0);
    }

    if (runOnce) {
      await executeCycle(client, lastState);
      process.exit(0);
    }

    while (true) {
      try {
        lastState = await executeCycle(client, lastState);
      } catch (error) {
        console.error("Error during Range Ranger cycle:", safeMessage(error));
      }
      await sleep(pollSeconds * 1000);
    }
  });
}

main().catch((err) => {
  console.error("Fatal Range Ranger error:", safeMessage(err));
  process.exit(1);
});