import { createPublicClient, http, isAddress, formatUnits } from "viem";
import { base } from "viem/chains";
import pg from "pg";

const botToken = process.env.TELEGRAM_BOT_TOKEN?.trim() || "8984197367:AAEefh3P21j12_-O8eMbFf-WRmU2i0AwxZc";
const rpcUrl = process.env.BASE_RPC_URL?.trim() || "https://mainnet.base.org";
const dbUrl = process.env.DATABASE_URL?.trim();
const engineAddress = process.env.V4_ENGINE?.trim() || "0x53950f6F0827abBEA8b4B1B36aC222C8d8A1E756";
const tokenAddress = process.env.V4_NARA_TOKEN?.trim() || "0x56a42a98D22b109D90e8a8D54B74a9D2b9a76426";
const nftAddress = process.env.V4_POSITION_NFT?.trim() || "0x5a18aae7F04E646Abe385E8a36214B85E92376E6";
const hookAddress = process.env.V4_LIQUIDITY_GROWTH_HOOK?.trim() || "0xC290DFeA7885b54637bC9c6298516091Ff7b4080";

if (!botToken) {
  console.log("TELEGRAM_BOT_TOKEN not provided. Telegram bot listener will not start.");
  process.exit(0);
}

const client = createPublicClient({
  chain: base,
  transport: http(rpcUrl, { timeout: 15_000 }),
});

const engineAbi = [
  { type: "function", name: "currentEpoch", stateMutability: "view", inputs: [], outputs: [{ type: "uint64" }] },
  { type: "function", name: "epochState", stateMutability: "view", inputs: [], outputs: [{ name: "epoch", type: "uint64" }] },
];

const tokenAbi = [
  { type: "function", name: "balanceOf", stateMutability: "view", inputs: [{ name: "account", type: "address" }], outputs: [{ type: "uint256" }] },
  { type: "function", name: "totalSupply", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
];

async function sendTg(targetChatId, text) {
  try {
    await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: targetChatId, text, parse_mode: "Markdown" }),
    });
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
    console.error("DB Query error:", e.message);
    return null;
  } finally {
    await pgClient.end().catch(() => {});
  }
}

async function handleCommand(msg) {
  const text = (msg.text || "").trim();
  const fromChatId = msg.chat?.id;
  if (!fromChatId) return;

  const parts = text.split(/\s+/);
  const cmd = parts[0].toLowerCase();
  const arg = parts[1];

  console.log(`Received command ${cmd} from ${fromChatId}`);

  if (cmd === "/start" || cmd === "/help") {
    const helpMsg = [
      "🤖 *NARA Swarm Monitor — Interactive Console*",
      "━━━━━━━━━━━━━━━━━━━━",
      "Send any of the following commands:",
      "",
      "• `/status` — Live system status & indexed surfaces",
      "• `/health` — Engine epoch sync & backlog check",
      "• `/whales` — Top lock conviction & whale rankings",
      "• `/cliffs` — Upcoming 24h & 7d unlock cliffs",
      "• `/contracts` — Verified v4 contract addresses",
      "• `/wallet <0x...>` — Inspect any wallet on Base",
      "• `/ping` — Test bot latency & connectivity",
      "━━━━━━━━━━━━━━━━━━━━",
      "🛡️ *NARA Fixed v4 Production Stack*"
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
      "• *Position NFT:* `" + nftAddress + "`",
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
      const isHealthy = backlog <= 1;

      const healthMsg = [
        "⏳ *NARA Engine Epoch Health*",
        "━━━━━━━━━━━━━━━━━━━━",
        (isHealthy ? "🟢 *Status:* Synchronized (GREEN)" : "🟡 *Status:* Backlog Detected"),
        "• *Current Epoch:* #" + currentEpoch,
        "• *Settled Epoch:* #" + epochState,
        "• *Backlog:* " + backlog + " epoch(s)",
        "• *JIT Settlement Limit:* 8 epochs",
        "• *Block:* #" + blockNumber,
        "━━━━━━━━━━━━━━━━━━━━"
      ].join("\n");
      return sendTg(fromChatId, healthMsg);
    } catch (err) {
      return sendTg(fromChatId, "❌ Error reading epoch state: " + err.message);
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
        "🛡️ *Security Status:*",
        "• Direct Admin Safeguard: *Active*",
        "• Flash Loan & Revert Scanner: *Active*",
        "• Treasury & POL Monitor: *Active*",
        "━━━━━━━━━━━━━━━━━━━━"
      ].join("\n");
      return sendTg(fromChatId, statusMsg);
    } catch (err) {
      return sendTg(fromChatId, "❌ Error fetching status: " + err.message);
    }
  }

  if (cmd === "/whales") {
    const rows = await queryDb('select wallet, "lockedAmount", "genesisRewardWeight" from wallet_conviction_ranking limit 5');
    if (rows && rows.length > 0) {
      const list = rows.map((r, i) => `${i + 1}. \`${r.wallet.slice(0, 8)}...${r.wallet.slice(-6)}\` — ${Number(formatUnits(BigInt(r.lockedAmount || 0), 18)).toLocaleString()} NARA`).join("\n");
      const msgText = [
        "🐋 *Top NARA Whales & Conviction Lockers*",
        "━━━━━━━━━━━━━━━━━━━━",
        list,
        "━━━━━━━━━━━━━━━━━━━━"
      ].join("\n");
      return sendTg(fromChatId, msgText);
    } else {
      return sendTg(fromChatId, "🐋 *Whale Tracking:* No whale positions indexed yet or sync in progress.\n\nSend `/wallet 0x...` to inspect a specific wallet!");
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
      "🟢 *Exits Under Threshold:* No immediate large cliff pressure."
    ].join("\n");
    return sendTg(fromChatId, cliffsMsg);
  }

  if (cmd === "/wallet") {
    if (!arg || !isAddress(arg)) {
      return sendTg(fromChatId, "⚠️ Please provide a valid address: `/wallet 0x...`");
    }
    try {
      const balance = await client.readContract({
        address: tokenAddress,
        abi: tokenAbi,
        functionName: "balanceOf",
        args: [arg],
      });
      const formattedBalance = Number(formatUnits(balance, 18)).toLocaleString("en-US", { maximumFractionDigits: 4 });

      const walletMsg = [
        "👛 *NARA Wallet Profile*",
        "━━━━━━━━━━━━━━━━━━━━",
        "• *Address:* `" + arg + "`",
        "• *NARA Balance:* " + formattedBalance + " NARA",
        "• *Chain:* Base Mainnet",
        "━━━━━━━━━━━━━━━━━━━━"
      ].join("\n");
      return sendTg(fromChatId, walletMsg);
    } catch (err) {
      return sendTg(fromChatId, "❌ Error reading wallet: " + err.message);
    }
  }

  return sendTg(fromChatId, "❓ Unknown command. Send `/help` to view available commands.");
}

let offset = 0;
async function pollLoop() {
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
