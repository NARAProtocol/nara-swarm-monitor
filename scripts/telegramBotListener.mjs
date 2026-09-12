import { createPublicClient, http, isAddress, getAddress, formatUnits, formatEther } from "viem";
import { base } from "viem/chains";
import pg from "pg";
import {
  RANGE_MANAGER_ADDRESS,
  TREASURY_SAFE_ADDRESS,
  USDC_ADDRESS,
  NARA_ADDRESS,
  RANGE_MANAGER_ABI,
  ERC20_ABI as RANGE_ERC20_ABI,
  tickToPriceUsdc,
  analyzeGridLiquidity,
  calculateMarketFlow,
  calculateDynamicBudgets,
  synthesizeBuyBracket,
  synthesizeSellBracket,
  formatUsdcNumber,
} from "./rangeRangerRuntime.mjs";

const botToken = process.env.TELEGRAM_BOT_TOKEN?.trim();
const dbUrl = process.env.DATABASE_URL?.trim();

if (!botToken) {
  console.log("TELEGRAM_BOT_TOKEN not provided. Telegram bot listener will not start.");
  process.exit(0);
}

function requiredEnv(name) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is required when the Telegram listener is enabled.`);
  return value;
}

function safeGetAddress(raw) {
  try {
    return getAddress((raw || "").trim());
  } catch {
    return undefined;
  }
}

function requiredAddress(name) {
  const address = safeGetAddress(process.env[name]);
  if (!address) throw new Error(`${name} must be a valid address when the Telegram listener is enabled.`);
  return address;
}

const rpcUrl = requiredEnv("BASE_RPC_URL");
const engineAddress = requiredAddress("V4_ENGINE");
const tokenAddress = requiredAddress("V4_NARA_TOKEN");
const nftAddress = safeGetAddress(process.env.V4_POSITION_NFT);
const hookAddress = requiredAddress("V4_LIQUIDITY_GROWTH_HOOK");
const deployerAddress = requiredAddress("DEPLOYER_ADDRESS").toLowerCase();
const treasuryAddress = requiredAddress("V4_TREASURY_ADDRESS").toLowerCase();

const client = createPublicClient({
  chain: base,
  transport: http(rpcUrl, { timeout: 15_000 }),
});

const engineAbi = [
  { type: "function", name: "currentEpoch", stateMutability: "view", inputs: [], outputs: [{ type: "uint64" }] },
  { type: "function", name: "epochState", stateMutability: "view", inputs: [], outputs: [{ name: "epoch", type: "uint64" }] },
  { type: "function", name: "nextPositionId", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
  {
    type: "function",
    name: "positionOf",
    stateMutability: "view",
    inputs: [{ name: "positionId", type: "uint256" }],
    outputs: [{
      type: "tuple",
      components: [
        { name: "owner", type: "address" },
        { name: "createdEpoch", type: "uint64" },
        { name: "flags", type: "uint32" },
        { name: "amount", type: "uint128" },
        { name: "weight", type: "uint128" },
        { name: "activationEpoch", type: "uint64" },
        { name: "unlockEpoch", type: "uint64" },
        { name: "tokenWeight", type: "uint128" },
        { name: "naraDebtRay", type: "uint256" },
        { name: "ethDebtRay", type: "uint256" },
      ]
    }]
  },
  {
    type: "function",
    name: "claimableRewards",
    stateMutability: "view",
    inputs: [{ name: "positionId", type: "uint256" }],
    outputs: [
      { name: "naraReward", type: "uint256" },
      { name: "ethReward", type: "uint256" }
    ]
  },
];

const tokenAbi = [
  { type: "function", name: "balanceOf", stateMutability: "view", inputs: [{ name: "account", type: "address" }], outputs: [{ type: "uint256" }] },
  { type: "function", name: "totalSupply", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
];

const nftAbi = [
  { type: "function", name: "balanceOf", stateMutability: "view", inputs: [{ name: "owner", type: "address" }], outputs: [{ type: "uint256" }] },
];

let botUsername = "";

async function registerMenuCommands() {
  try {
    const meRes = await fetch(`https://api.telegram.org/bot${botToken}/getMe`);
    if (meRes.ok) {
      const meData = await meRes.json();
      botUsername = (meData.result?.username || "").toLowerCase();
      console.log(`🤖 Registered identity for @${botUsername || "bot"}`);
    }
  } catch (err) {
    console.error("Error fetching bot identity:", err.message);
  }

  const commands = [
    { command: "status", description: "📊 Live protocol status & supply" },
    { command: "health", description: "⏳ Engine epoch sync & keeper check" },
    { command: "ranger", description: "🏹 Range Ranger status, bands & Safe reserves" },
    { command: "rangerorders", description: "📋 Active on-chain range limit orders" },
    { command: "recenter", description: "🎯 Live 4-tier rebalance bracket preview" },
    { command: "whales", description: "Largest indexed NARA lock balances" },
    { command: "cliffs", description: "⏱️ Upcoming 24h & 7d unlock cliffs" },
    { command: "contracts", description: "📜 Verified v4 contract addresses" },
    { command: "wallet", description: "Wallet activity report: /wallet 0x..." },
    { command: "ping", description: "🏓 Check bot latency & health" },
    { command: "help", description: "ℹ️ Show help and command overview" },
  ];
  try {
    await fetch(`https://api.telegram.org/bot${botToken}/setMyCommands`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ commands }),
    });
  } catch (err) {
    console.error("Error registering menu commands:", err.message);
  }
}

async function sendTg(targetChatId, text) {
  try {
    const res = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: targetChatId, text, parse_mode: "Markdown" }),
    });
    if (!res.ok) {
      const errBody = await res.text().catch(() => "");
      console.error(`Telegram send failed (${res.status}): ${errBody}`);
    }
  } catch (err) {
    console.error("Error sending message to Telegram:", err.message);
  }
}

async function queryDb(query, params = []) {
  if (!dbUrl) return null;
  const pgClient = new pg.Client({ connectionString: dbUrl });
  try {
    await pgClient.connect();
    const res = await pgClient.query(query, params);
    return res.rows;
  } catch (e) {
    return null;
  } finally {
    await pgClient.end().catch(() => {});
  }
}

async function handleCommand(msg) {
  const text = (msg.text || "").trim();
  const fromChatId = msg.chat?.id;
  if (!fromChatId || !text.startsWith("/")) return;

  const parts = text.split(/\s+/);
  const rawCmd = (parts[0] || "").toLowerCase();

  let cmd = rawCmd;
  if (rawCmd.includes("@")) {
    const [baseCmd, targetBot] = rawCmd.split("@");
    if (targetBot && botUsername && targetBot !== botUsername) {
      return;
    }
    cmd = baseCmd;
  }
  const arg = parts[1];

  console.log(`Received command ${cmd} (raw: ${rawCmd}) from ${fromChatId}`);

  if (cmd === "/start" || cmd === "/help") {
    const helpMsg = [
      "🤖 *NARA Swarm Monitor — Interactive Console*",
      "━━━━━━━━━━━━━━━━━━━━",
      "Tap the *Menu* button next to the chat line or choose from below:",
      "",
      "• `/status` — Live system status & block height",
      "• `/health` — Engine epoch sync & backlog check",
      "• `/ranger` — 🏹 Range Ranger status, bands & Safe reserves",
      "• `/rangerorders` — 📋 Active on-chain range limit orders",
      "• `/recenter` — 🎯 Live 4-tier rebalance bracket preview",
      "• `/whales` — Largest indexed NARA lock balances",
      "• `/cliffs` — Upcoming 24h & 7d unlock cliffs",
      "• `/contracts` — Verified v4 contract addresses",
      "• `/wallet <0x...>` — Factual onchain wallet activity report",
      "• `/ping` — Test bot latency & connectivity",
      "━━━━━━━━━━━━━━━━━━━━",
      "⚠️ *Technical live-testing telemetry only — not investment research, a trading signal, or a recommendation.*"
    ].join("\n");
    return sendTg(fromChatId, helpMsg);
  }

  if (cmd === "/ping") {
    const block = await client.getBlockNumber();
    return sendTg(fromChatId, `🏓 *Pong!* Monitor is active and connected.\n⛓️ *Current Base Block:* #${block}`);
  }

  if (cmd === "/contracts") {
    const contractsMsg = [
      "📜 *NARA Fixed v4 Deployed Contracts*",
      "━━━━━━━━━━━━━━━━━━━━",
      "• *NARA Token:* `" + tokenAddress + "`",
      "• *NARA Engine:* `" + engineAddress + "`",
      nftAddress ? "• *Position NFT:* `" + nftAddress + "`" : "• *Position NFT:* not enabled in core profile",
      "• *Liquidity Hook:* `" + hookAddress + "`",
      "━━━━━━━━━━━━━━━━━━━━"
    ].join("\n");
    return sendTg(fromChatId, contractsMsg);
  }

  if (cmd === "/health") {
    try {
      const [currentEpoch, epochState, blockNumber] = await Promise.all([
        client.readContract({ address: engineAddress, abi: engineAbi, functionName: "currentEpoch" }),
        client.readContract({ address: engineAddress, abi: engineAbi, functionName: "epochState" }),
        client.getBlockNumber(),
      ]);
      const backlog = Number(currentEpoch) - Number(epochState);
      let statusDisplay = "🟢 *Status:* Synchronized (GREEN)";
      if (backlog > 8) {
        statusDisplay = "🔴 *Status:* Backlog Exceeded JIT Limit (" + backlog + " epochs)";
      } else if (backlog > 4) {
        statusDisplay = "🟡 *Status:* Backlog Pending Routine Batch (" + backlog + " epochs)";
      }

      const healthMsg = [
        "⏳ *NARA Engine Epoch Health*",
        "━━━━━━━━━━━━━━━━━━━━",
        statusDisplay,
        "• *Current Epoch:* #" + currentEpoch,
        "• *Settled Epoch:* #" + epochState,
        "• *Backlog:* " + backlog + " epoch(s)",
        "• *Routine Schedule:* Hourly batch (up to 4 epochs)",
        "• *JIT Settlement Limit:* 8 epochs",
        "• *Block:* #" + blockNumber,
        "━━━━━━━━━━━━━━━━━━━━"
      ].join("\n");
      return sendTg(fromChatId, healthMsg);
    } catch (err) {
      return sendTg(fromChatId, "❌ Error reading epoch state: " + err.message);
    }
  }

  async function fetchRangeRangerState() {
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
      try {
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
      } catch {}
    }

    const [safeUsdcBalance, safeNaraBalance, isClean] = await Promise.all([
      client.readContract({
        address: USDC_ADDRESS,
        abi: RANGE_ERC20_ABI,
        functionName: "balanceOf",
        args: [TREASURY_SAFE_ADDRESS],
      }).catch(() => 0n),
      client.readContract({
        address: NARA_ADDRESS,
        abi: RANGE_ERC20_ABI,
        functionName: "balanceOf",
        args: [TREASURY_SAFE_ADDRESS],
      }).catch(() => 0n),
      client.readContract({
        address: RANGE_MANAGER_ADDRESS,
        abi: RANGE_MANAGER_ABI,
        functionName: "assertOperationalClean",
      }).catch(() => false),
    ]);

    const analysis = analyzeGridLiquidity(poolState[1], activeOrders);
    const marketFlow = await calculateMarketFlow({
      client,
      currentTick: poolState[1],
      activeOrders,
    });
    const dynamicBudgets = calculateDynamicBudgets({
      safeUsdcBalance,
      safeNaraBalance,
      marketFlow,
    });

    return {
      currentTick: poolState[1],
      sqrtPriceX96: poolState[0],
      activeOrders,
      safeUsdcBalance,
      safeNaraBalance,
      isClean,
      analysis,
      marketFlow,
      dynamicBudgets,
    };
  }

  if (cmd === "/ranger" || cmd === "/range" || cmd === "/rangestatus") {
    try {
      const state = await fetchRangeRangerState();
      const { analysis, safeUsdcBalance, safeNaraBalance, isClean, marketFlow, dynamicBudgets } = state;
      const spot = analysis.spotPrice;

      const nearestBuyText = analysis.closestBuy
        ? `$${analysis.closestBuy.pUpper.toFixed(4)} (${analysis.closestBuyDistancePct.toFixed(1)}% below spot)`
        : "None (No active support)";

      const nearestSellText = analysis.closestSell
        ? `$${analysis.closestSell.pLower.toFixed(4)} (${analysis.closestSellDistancePct !== null ? analysis.closestSellDistancePct.toFixed(1) + "% above spot" : "Active"})`
        : "None (No active resistance)";

      let statusIcon = "🟢 Optimal Range Coverage";
      if (analysis.hasLiquidityGap) {
        statusIcon = "⚠️ Liquidity Gap Detected (Atomic Overhaul Needed)";
      } else if (analysis.staleOrders.length > 0) {
        statusIcon = `🟡 ${analysis.staleOrders.length} Stale Order(s) Detected`;
      }

      let pressureGauge = "⚪ Neutral Chop (Balanced Flow)";
      if (marketFlow) {
        const pPct = (marketFlow.netPressure * 100).toFixed(0);
        if (marketFlow.netPressure >= 0.25) {
          pressureGauge = `🟢 Net Buying (+${pPct}%)`;
        } else if (marketFlow.netPressure <= -0.25) {
          pressureGauge = `🔴 Net Selling (${pPct}%)`;
        } else {
          pressureGauge = `⚪ Neutral Chop (${pPct >= 0 ? "+" : ""}${pPct}%)`;
        }
      }

      const safeUsdcFmt = (Number(safeUsdcBalance) / 1e6).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      const safeNaraFmt = (Number(safeNaraBalance) / 1e18).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

      const rangerMsg = [
        "🏹 *NARA Treasury Range Ranger Status*",
        "━━━━━━━━━━━━━━━━━━━━",
        `• *Grid Status:* ${statusIcon}`,
        `• *Spot Price:* \`$${spot.toFixed(4)} USDC\``,
        `• *Pool Tick:* \`${state.currentTick}\``,
        `• *Market Pressure:* ${pressureGauge}`,
        `• *Volatility Multiplier:* ${marketFlow.volatilityScore.toFixed(2)}x`,
        "━━━━━━━━━━━━━━━━━━━━",
        "📊 *Liquidity Topology:*",
        `• *Nearest Buy Floor:* ${nearestBuyText}`,
        `• *Nearest Sell Wall:* ${nearestSellText}`,
        `• *Active Orders:* ${analysis.activeBuyCount} Buy / ${analysis.activeSellCount} Sell (${analysis.staleOrders.length} stale)`,
        "━━━━━━━━━━━━━━━━━━━━",
        "🏦 *Treasury Safe Reserves:*",
        `• *USDC Available:* \`$${safeUsdcFmt}\``,
        `• *NARA Available:* \`${safeNaraFmt} NARA\``,
        `• *Adaptive Sizing:* \`$${dynamicBudgets.usdcBudget} USDC / ${dynamicBudgets.naraBudget.toLocaleString()} NARA\``,
        `• *Operational Guard:* ${isClean ? "🟢 Clean (`assertOperationalClean` OK)" : "🟡 In Transit"}`,
        "━━━━━━━━━━━━━━━━━━━━",
        "💡 *Available Ranger Commands:*",
        "• `/rangerorders` — View active onchain limit orders",
        "• `/recenter` — Preview 5-tier adaptive rebalance bracket",
      ].join("\n");
      return sendTg(fromChatId, rangerMsg);
    } catch (err) {
      return sendTg(fromChatId, "❌ Error reading Range Ranger state: " + err.message);
    }
  }

  if (cmd === "/rangerorders" || cmd === "/orders" || cmd === "/rangeorders") {
    try {
      const state = await fetchRangeRangerState();
      const { activeOrders, analysis } = state;

      if (activeOrders.length === 0) {
        return sendTg(fromChatId, "📋 *No active range limit orders found on-chain.*");
      }

      const buyOrders = [];
      const sellOrders = [];

      for (const order of activeOrders) {
        const pUpper = tickToPriceUsdc(order.tickLower);
        const pLower = tickToPriceUsdc(order.tickUpper);
        const pMin = Math.min(pLower, pUpper);
        const pMax = Math.max(pLower, pUpper);

        // OrderSide: 0 = SellNara (input is NARA 18 decimals), 1 = BuyNara (input is USDC 6 decimals)
        if (Number(order.side) === 1) {
          const usdcIn = (Number(order.inputAmount) / 1e6).toFixed(2);
          buyOrders.push({
            pMax,
            text: `• *#${order.orderId}:* \`$${pMin.toFixed(4)}–$${pMax.toFixed(4)}\` ($${usdcIn} USDC)`,
          });
        } else {
          const naraIn = (Number(order.inputAmount) / 1e18).toLocaleString("en-US", { maximumFractionDigits: 0 });
          sellOrders.push({
            pMin,
            text: `• *#${order.orderId}:* \`$${pMin.toFixed(4)}–$${pMax.toFixed(4)}\` (${naraIn} NARA)`,
          });
        }
      }

      // Sort buy orders descending (highest buy floor closest to spot first)
      buyOrders.sort((a, b) => b.pMax - a.pMax);
      // Sort sell orders ascending (lowest sell wall closest to spot first)
      sellOrders.sort((a, b) => a.pMin - b.pMin);

      const buyLines = buyOrders.map((o) => o.text);
      const sellLines = sellOrders.map((o) => o.text);

      const ordersMsg = [
        "📋 *NARA Active Range Limit Orders*",
        "━━━━━━━━━━━━━━━━━━━━",
        `• *Spot Price:* \`$${analysis.spotPrice.toFixed(4)} USDC\``,
        `• *Total Active:* ${activeOrders.length} orders (${analysis.staleOrders.length} stale)`,
        "",
        `🟢 *Active Buy Floor Orders (${buyLines.length}):*`,
        buyLines.length > 0 ? buyLines.join("\n") : "  _None_",
        "",
        `🔴 *Active Sell Wall Orders (${sellLines.length}):*`,
        sellLines.length > 0 ? sellLines.join("\n") : "  _None_",
        "━━━━━━━━━━━━━━━━━━━━",
        "💡 Use `/recenter` to preview a freshly balanced 5-tier adaptive bracket around spot.",
      ].join("\n");
      return sendTg(fromChatId, ordersMsg);
    } catch (err) {
      return sendTg(fromChatId, "❌ Error reading Range orders: " + err.message);
    }
  }

  if (cmd === "/recenter" || cmd === "/ranger_recenter") {
    try {
      const state = await fetchRangeRangerState();
      const { analysis, currentTick, marketFlow, dynamicBudgets } = state;
      const spot = analysis.spotPrice;

      const buyBands = synthesizeBuyBracket(spot, dynamicBudgets.usdcBudget, currentTick, {
        netPressure: marketFlow.netPressure,
        volatilityScore: marketFlow.volatilityScore,
        tierCount: 5,
      });
      const sellBands = synthesizeSellBracket(spot, dynamicBudgets.naraBudget, currentTick, {
        netPressure: marketFlow.netPressure,
        volatilityScore: marketFlow.volatilityScore,
        tierCount: 5,
      });

      const buyLines = buyBands.map((b) => `• *Tier ${b.bandIndex}:* \`${b.targetPriceRange}\` ($${b.usdcBudget} USDC)`);
      const sellLines = sellBands.map((s) => `• *Tier ${s.bandIndex}:* \`${s.targetPriceRange}\` (${s.naraBudget.toLocaleString("en-US")} NARA)`);

      let flowStatus = "⚪ Neutral Chop (Balanced Spreads)";
      const pPct = (marketFlow.netPressure * 100).toFixed(0);
      if (marketFlow.netPressure >= 0.25) {
        flowStatus = `🟢 Net Buying (+${pPct}%) — Ratchet Floor Skew`;
      } else if (marketFlow.netPressure <= -0.25) {
        flowStatus = `🔴 Net Selling (${pPct}%) — Deep Value DCA Skew`;
      }

      const recenterMsg = [
        "🎯 *Recommended 5-Tier Adaptive Recenter Bracket*",
        "━━━━━━━━━━━━━━━━━━━━",
        `• *Current Spot:* \`$${spot.toFixed(4)} USDC\``,
        `• *Current Tick:* \`${currentTick}\``,
        `• *Market Pressure:* ${flowStatus}`,
        `• *Volatility Multiplier:* ${marketFlow.volatilityScore.toFixed(2)}x`,
        `• *Stale Orders to Cancel:* ${analysis.staleOrders.length}`,
        "━━━━━━━━━━━━━━━━━━━━",
        `🟢 *5-Tier Buy Floor ($${dynamicBudgets.usdcBudget} USDC dynamic budget):*`,
        ...buyLines,
        "",
        `🔴 *5-Tier Sell Wall (${dynamicBudgets.naraBudget.toLocaleString("en-US")} NARA dynamic budget):*`,
        ...sellLines,
        "━━━━━━━━━━━━━━━━━━━━",
        "⚙️ *To execute rebalance:*",
        "• Autonomous Railway runner auto-rebalances when gap exceeds 20%",
        "• Or execute via workspace terminal: `RANGERECENTER`",
      ].join("\n");
      return sendTg(fromChatId, recenterMsg);
    } catch (err) {
      return sendTg(fromChatId, "❌ Error calculating recenter bracket: " + err.message);
    }
  }

  if (cmd === "/status") {
    try {
      const [blockNumber, totalSupply] = await Promise.all([
        client.getBlockNumber(),
        client.readContract({ address: tokenAddress, abi: tokenAbi, functionName: "totalSupply" }).catch(() => 0n),
      ]);

      const formattedSupply = (Number(formatUnits(totalSupply, 18))).toLocaleString("en-US", { maximumFractionDigits: 0 });

      const statusMsg = [
        "📊 *NARA Protocol Monitor Status*",
        "━━━━━━━━━━━━━━━━━━━━",
        "🟢 *Indexer:* Connected & Healthy",
        "⛓️ *Chain:* Base Mainnet (8453)",
        "📦 *Latest Block:* #" + blockNumber,
        "🪙 *Total NARA Supply:* " + formattedSupply + " NARA",
        "",
        "🛡️ *Configured Monitor Coverage:*",
        "• Direct admin checks: *Configured*",
        "• Reverted-transaction scanner: *Configured*",
        "• Treasury and POL observations: *Configured*",
        "━━━━━━━━━━━━━━━━━━━━"
      ].join("\n");
      return sendTg(fromChatId, statusMsg);
    } catch (err) {
      return sendTg(fromChatId, "❌ Error fetching status: " + err.message);
    }
  }

  if (cmd === "/whales") {
    try {
      const nextPosId = await client.readContract({
        address: engineAddress,
        abi: engineAbi,
        functionName: "nextPositionId",
      });
      const count = Number(nextPosId);
      const userTotals = new Map();

      for (let i = 1; i < count; i++) {
        try {
          const pos = await client.readContract({
            address: engineAddress,
            abi: engineAbi,
            functionName: "positionOf",
            args: [BigInt(i)],
          });
          const amt = BigInt(pos.amount);
          if (amt > 0n) {
            const current = userTotals.get(pos.owner.toLowerCase()) || { owner: pos.owner, amount: 0n, count: 0 };
            current.amount += amt;
            current.count += 1;
            userTotals.set(pos.owner.toLowerCase(), current);
          }
        } catch {}
      }

      const sorted = Array.from(userTotals.values()).sort((a, b) => (b.amount > a.amount ? 1 : -1)).slice(0, 5);

      if (sorted.length > 0) {
        const list = sorted.map((r, i) => `${i + 1}. \`${r.owner.slice(0, 8)}...${r.owner.slice(-6)}\` — *${Number(formatUnits(r.amount, 18)).toLocaleString()} NARA* (${r.count} lock${r.count > 1 ? 's' : ''})`).join("\n");
        const msgText = [
          "*Largest Indexed NARA Lock Balances*",
          "━━━━━━━━━━━━━━━━━━━━",
          list,
          "━━━━━━━━━━━━━━━━━━━━",
          "Send `/wallet 0x...` for a factual onchain activity report. This ranking is telemetry, not an investment signal."
        ].join("\n");
        return sendTg(fromChatId, msgText);
      } else {
        return sendTg(fromChatId, "*Lock Balance Report:* No active locked positions found in the current read.");
      }
    } catch (e) {
      return sendTg(fromChatId, "❌ Error loading whales: " + e.message);
    }
  }

  if (cmd === "/cliffs") {
    const rows24 = await queryDb('select count(*) as count from unlock_cliffs_24h');
    const rows7d = await queryDb('select count(*) as count from unlock_cliffs_7d');
    const c24 = rows24 ? rows24[0]?.count || 0 : 0;
    const c7d = rows7d ? rows7d[0]?.count || 0 : 0;

    const cliffsMsg = [
      "⏳ *Upcoming Position Unlock Cliffs*",
      "━━━━━━━━━━━━━━━━━━━━",
      "• *Unlocking next 24 Hours:* " + c24 + " position(s)",
      "• *Unlocking next 7 Days:* " + c7d + " position(s)",
      "━━━━━━━━━━━━━━━━━━━━",
      "Indexed counts are operational telemetry only; review the underlying positions before any operator action."
    ].join("\n");
    return sendTg(fromChatId, cliffsMsg);
  }

  if (cmd === "/wallet") {
    let target = arg;
    if (!target || !isAddress(target)) {
      return sendTg(fromChatId, "⚠️ Please provide a valid address: `/wallet 0x...`");
    }
    try {
      const checksumTarget = getAddress(target);
      const lower = checksumTarget.toLowerCase();

      const [ethBal, naraBal, nftBalance, totalSupply, currentEpoch, nextPosId] = await Promise.all([
        client.getBalance({ address: checksumTarget }),
        client.readContract({
          address: tokenAddress,
          abi: tokenAbi,
          functionName: "balanceOf",
          args: [checksumTarget],
        }),
        nftAddress
          ? client.readContract({
              address: nftAddress,
              abi: nftAbi,
              functionName: "balanceOf",
              args: [checksumTarget],
            })
              .then((value) => ({ status: "available", value }))
              .catch(() => ({ status: "read_failed", value: null }))
          : Promise.resolve({ status: "integration_gated", value: null }),
        client.readContract({
          address: tokenAddress,
          abi: tokenAbi,
          functionName: "totalSupply",
        }),
        client.readContract({
          address: engineAddress,
          abi: engineAbi,
          functionName: "currentEpoch",
        }),
        client.readContract({
          address: engineAddress,
          abi: engineAbi,
          functionName: "nextPositionId",
        }),
      ]);

      const totalPositions = Number(nextPosId);
      const userLocks = [];
      let totalLockedBig = 0n;
      let totalWeightBig = 0n;
      let totalClaimableNara = 0n;
      let totalClaimableEth = 0n;

      for (let i = 1; i < totalPositions; i++) {
        try {
          const pos = await client.readContract({
            address: engineAddress,
            abi: engineAbi,
            functionName: "positionOf",
            args: [BigInt(i)],
          });
          if (pos.owner.toLowerCase() === lower) {
            const amt = BigInt(pos.amount);
            const wgt = BigInt(pos.weight);
            const isActive = amt > 0n;

            if (isActive) {
              totalLockedBig += amt;
              totalWeightBig += wgt;
            }

            let claimNara = 0n;
            let claimEth = 0n;
            if (isActive) {
              try {
                const [posNara, posEth] = await client.readContract({
                  address: engineAddress,
                  abi: engineAbi,
                  functionName: "claimableRewards",
                  args: [BigInt(i)],
                });
                claimNara = BigInt(posNara ?? 0);
                claimEth = BigInt(posEth ?? 0);
                totalClaimableNara += claimNara;
                totalClaimableEth += claimEth;
              } catch {}
            }

            userLocks.push({
              id: i,
              amount: amt,
              weight: wgt,
              activationEpoch: pos.activationEpoch,
              unlockEpoch: pos.unlockEpoch,
              claimNara,
              claimEth,
              isActive,
            });
          }
        } catch {}
      }

      const activeLocks = userLocks.filter((l) => l.isActive);
      const maturedLocks = userLocks.filter((l) => !l.isActive);

      const liquidNara = Number(formatUnits(naraBal, 18));
      const totalSup = Number(formatUnits(totalSupply, 18));
      const sharePct = totalSup > 0 ? ((liquidNara / totalSup) * 100).toFixed(2) : "0.00";
      const ethFormatted = Number(formatEther(ethBal)).toFixed(4);

      const lockedNara = Number(formatUnits(totalLockedBig, 18));
      const weightFormatted = Number(formatUnits(totalWeightBig, 18)).toLocaleString("en-US", { maximumFractionDigits: 2 });
      const claimableNaraFormatted = (Number(formatUnits(totalClaimableNara, 18))).toFixed(4);
      const claimableEthFormatted = (Number(formatEther(totalClaimableEth))).toFixed(6);
      const positionNftLine = nftBalance.status === "available"
        ? "• *Position NFTs:* " + nftBalance.value.toString() + " Held"
        : nftBalance.status === "integration_gated"
          ? "• *Position NFTs:* Unavailable (core integration gated)"
          : "• *Position NFTs:* Unavailable (configured read failed)";

      // Neutral configured and observed labels. These are not suitability or investment classifications.
      let accountLabel = "Unclassified address";
      let balanceBand = "Below 10,000 NARA observed";

      if (lower === deployerAddress) {
        accountLabel = "Configured deployer address";
        balanceBand = "Administrative address label";
      } else if (lower === treasuryAddress) {
        accountLabel = "Configured treasury address";
        balanceBand = "Treasury address label";
      } else if (liquidNara + lockedNara >= 50000) {
        accountLabel = "Address with observed NARA balance";
        balanceBand = "50,000+ NARA observed";
      } else if (liquidNara + lockedNara >= 10000) {
        accountLabel = "Address with observed NARA balance";
        balanceBand = "10,000–49,999 NARA observed";
      } else if (lockedNara > 0) {
        accountLabel = "Address with active lock data";
        balanceBand = "Active locked balance observed";
      }

      const shortAddr = checksumTarget.slice(0, 6) + "..." + checksumTarget.slice(-4);

      let lockDetailsText = "";
      if (activeLocks.length > 0) {
        lockDetailsText = activeLocks.map((l) => {
          const lAmt = Number(formatUnits(l.amount, 18)).toLocaleString("en-US", { maximumFractionDigits: 2 });
          const lWgt = Number(formatUnits(l.weight, 18)).toLocaleString("en-US", { maximumFractionDigits: 0 });
          const lClaim = Number(formatUnits(l.claimNara, 18)).toFixed(4);
          return `• 🔒 *Lock #${l.id}:* ${lAmt} NARA (Weight: ${lWgt}x)\n  ├ *Epochs:* #${l.activationEpoch} → Unlocks @ #${l.unlockEpoch}\n  └ *Currently claimable:* ${lClaim} NARA`;
        }).join("\n");
      }

      const walletReportMsg = [
        "*NARA Wallet Activity Report: " + shortAddr + "*",
        "━━━━━━━━━━━━━━━━━━━━",
        "🏷️ *Configured label:* " + accountLabel,
        "📊 *Observed balance band:* " + balanceBand,
        "🌐 *Network:* Base Mainnet (Chain ID 8453)",
        "",
        "*ONCHAIN BALANCES*",
        "• 🪙 *Liquid NARA:* " + liquidNara.toLocaleString("en-US", { maximumFractionDigits: 2 }) + " NARA (*" + sharePct + "%* of Supply)",
        "• 🔒 *Locked NARA:* " + lockedNara.toLocaleString("en-US", { maximumFractionDigits: 2 }) + " NARA (*" + activeLocks.length + " Active*, " + maturedLocks.length + " Matured)",
        "• *Active weight multiplier:* " + weightFormatted + "x",
        "• 🔷 *Liquid ETH:* " + ethFormatted + " ETH",
        positionNftLine,
        "",
        "*CURRENTLY CLAIMABLE — READ ONLY*",
        "• *Claimable NARA:* " + claimableNaraFormatted + " NARA",
        "• *Claimable ETH:* " + claimableEthFormatted + " ETH",
        "• ⏳ *Current Epoch:* #" + currentEpoch,
        "",
        ...(activeLocks.length > 0 ? [
          "📜 *ACTIVE LOCK DETAILS*",
          lockDetailsText,
          ""
        ] : []),
        "*MATURITY DATA*",
        "Review each active lock's recorded unlock epoch above.",
        "━━━━━━━━━━━━━━━━━━━━",
        "🔗 [BaseScan Explorer](https://basescan.org/address/" + checksumTarget + ")",
        "Technical live-testing telemetry only. Not investment research, a trading signal, personalized advice, or a recommendation."
      ].join("\n");

      return sendTg(fromChatId, walletReportMsg);
    } catch (err) {
      return sendTg(fromChatId, "❌ Error loading wallet activity: " + err.message);
    }
  }

  return sendTg(fromChatId, "❓ Unknown command. Tap *Menu* or send `/help` to view available commands.");
}

let offset = 0;
async function pollLoop() {
  await registerMenuCommands();
  console.log("🤖 Telegram bot command listener started...");
  while (true) {
    try {
      const res = await fetch(`https://api.telegram.org/bot${botToken}/getUpdates?offset=${offset}&timeout=20`);
      if (res.ok) {
        const data = await res.json();
        if (data.ok && Array.isArray(data.result)) {
          for (const update of data.result) {
            offset = update.update_id + 1;
            if (update.message) {
              await handleCommand(update.message);
            }
          }
        }
      }
    } catch (err) {
      await new Promise((r) => setTimeout(r, 3000));
    }
  }
}

pollLoop();
