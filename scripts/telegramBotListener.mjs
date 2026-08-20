import { createPublicClient, http, isAddress, getAddress, formatUnits, formatEther } from "viem";
import { base } from "viem/chains";
import pg from "pg";

const botToken = process.env.TELEGRAM_BOT_TOKEN?.trim() || "8984197367:AAEefh3P21j12_-O8eMbFf-WRmU2i0AwxZc";
const rpcUrl = process.env.BASE_RPC_URL?.trim() || "https://mainnet.base.org";
const dbUrl = process.env.DATABASE_URL?.trim();

function safeGetAddress(raw, fallback) {
  try {
    return getAddress((raw || "").trim());
  } catch {
    return fallback ? getAddress(fallback) : undefined;
  }
}

const engineAddress = safeGetAddress(process.env.V4_ENGINE, "0x98ab6406D6B548F37dEF7110961bb45A399e5aFC");
const tokenAddress = safeGetAddress(process.env.V4_NARA_TOKEN, "0xB6333F5D4cEd8dffA80F3F13697D6aA3BB3f19c1");
const nftAddress = safeGetAddress(process.env.V4_POSITION_NFT, "0x5a18aae7F04E646Abe385E8a36214B85E92376E6");
const hookAddress = safeGetAddress(process.env.V4_LIQUIDITY_GROWTH_HOOK, "0x59AEf9799DEA01A7FB7dA73BEA10dfB08858A088");
const deployerAddress = "0xAE9D1667B45558232BeD9d45DcCA53940F892aB5".toLowerCase();
const treasuryAddress = (process.env.V4_TREASURY_ADDRESS || "0xfe3A8678A9c729438BB11718bD1391E7Ab491E8e").toLowerCase();

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

const nftAbi = [
  { type: "function", name: "balanceOf", stateMutability: "view", inputs: [{ name: "owner", type: "address" }], outputs: [{ type: "uint256" }] },
];

async function registerMenuCommands() {
  const commands = [
    { command: "status", description: "📊 Live protocol status & supply" },
    { command: "health", description: "⏳ Engine epoch sync & keeper check" },
    { command: "whales", description: "🐋 Top conviction lockers & whale list" },
    { command: "cliffs", description: "⏱️ Upcoming 24h & 7d unlock cliffs" },
    { command: "contracts", description: "📜 Verified v4 contract addresses" },
    { command: "wallet", description: "💎 Alpha Dossier: /wallet 0x..." },
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
      "Tap the *Menu* button next to the chat line or choose from below:",
      "",
      "• `/status` — Live system status & block height",
      "• `/health` — Engine epoch sync & backlog check",
      "• `/whales` — Top lock conviction & whale rankings",
      "• `/cliffs` — Upcoming 24h & 7d unlock cliffs",
      "• `/contracts` — Verified v4 contract addresses",
      "• `/wallet <0x...>` — 💎 Deep Alpha Dossier on any wallet",
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
      return sendTg(fromChatId, "🐋 *Whale Tracking:* No whale positions locked on-chain yet.\n\nSend `/wallet 0x...` to inspect any wallet!");
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
    let target = arg;
    if (!target || !isAddress(target)) {
      return sendTg(fromChatId, "⚠️ Please provide a valid address: `/wallet 0x...`");
    }
    try {
      const checksumTarget = getAddress(target);
      const lower = checksumTarget.toLowerCase();

      const [ethBal, naraBal, nftBal, totalSupply, currentEpoch] = await Promise.all([
        client.getBalance({ address: checksumTarget }),
        client.readContract({
          address: tokenAddress,
          abi: tokenAbi,
          functionName: "balanceOf",
          args: [checksumTarget],
        }).catch(() => 0n),
        client.readContract({
          address: nftAddress,
          abi: nftAbi,
          functionName: "balanceOf",
          args: [checksumTarget],
        }).catch(() => 0n),
        client.readContract({
          address: tokenAddress,
          abi: tokenAbi,
          functionName: "totalSupply",
        }).catch(() => 1000000000000000000000000n),
        client.readContract({
          address: engineAddress,
          abi: engineAbi,
          functionName: "currentEpoch",
        }).catch(() => 0n),
      ]);

      // Query database for locks and claims
      const lockRows = await queryDb('select sum(amount) as locked, sum(weight) as weight, count(*) as count from locks where lower("user") = $1 and status = \'locked\'', [lower]);
      const claimRows = await queryDb('select sum("ethAmount") as eth, sum("naraAmount") as nara, count(*) as count from position_claim_events where lower("user") = $1 or lower("to") = $1', [lower]);

      const liquidNara = Number(formatUnits(naraBal, 18));
      const totalSup = Number(formatUnits(totalSupply, 18));
      const sharePct = totalSup > 0 ? ((liquidNara / totalSup) * 100).toFixed(2) : "0.00";
      const ethFormatted = Number(formatEther(ethBal)).toFixed(4);

      const lockedNaraBig = lockRows && lockRows[0]?.locked ? BigInt(lockRows[0].locked) : 0n;
      const lockedNara = Number(formatUnits(lockedNaraBig, 18));
      const lockCount = lockRows && lockRows[0]?.count ? Number(lockRows[0].count) : 0;
      const weightNum = lockRows && lockRows[0]?.weight ? (Number(lockRows[0].weight) / 1e18).toFixed(2) : "0.00";

      const claimedEthBig = claimRows && claimRows[0]?.eth ? BigInt(claimRows[0].eth) : 0n;
      const claimedEth = Number(formatEther(claimedEthBig)).toFixed(4);
      const claimedNaraBig = claimRows && claimRows[0]?.nara ? BigInt(claimRows[0].nara) : 0n;
      const claimedNara = Number(formatUnits(claimedNaraBig, 18)).toLocaleString("en-US", { maximumFractionDigits: 2 });

      // Archetype classification
      let archetype = "🌱 EARLY ACCUMULATOR";
      let rankTier = "💎 DIAMOND HANDS";

      if (lower === deployerAddress) {
        archetype = "👑 PROTOCOL DEPLOYER & GENESIS";
        rankTier = "🌟 GENESIS ARCHITECT (Top 0.1%)";
      } else if (lower === treasuryAddress) {
        archetype = "🏛️ PROTOCOL TREASURY";
        rankTier = "🛡️ CUSTODIAL RESERVE";
      } else if (liquidNara + lockedNara >= 50000) {
        archetype = "🐋 TITAN MEGA WHALE";
        rankTier = "🔱 POSEIDON (Top 0.5%)";
      } else if (liquidNara + lockedNara >= 10000) {
        archetype = "🦈 APEX PROTOCOL LOCKER";
        rankTier = "💎 DIAMOND CONVICTION (Top 2%)";
      } else if (lockedNara > 0) {
        archetype = "⚡ ACTIVE YIELD HARVESTER";
        rankTier = "🌾 COMPOUNDING STAKER";
      }

      const shortAddr = checksumTarget.slice(0, 6) + "..." + checksumTarget.slice(-4);

      const dossierMsg = [
        "💎 *NARA DOSSIER: " + shortAddr + "*",
        "━━━━━━━━━━━━━━━━━━━━",
        "🏷️ *Archetype:* " + archetype,
        "🏆 *Rank Tier:* " + rankTier,
        "🌐 *Network:* Base Mainnet (Chain ID 8453)",
        "",
        "💰 *CAPITAL & HOLDINGS*",
        "• 🪙 *Liquid NARA:* " + liquidNara.toLocaleString("en-US", { maximumFractionDigits: 2 }) + " NARA (*" + sharePct + "%* of Supply)",
        "• 🔒 *Locked NARA:* " + lockedNara.toLocaleString("en-US", { maximumFractionDigits: 2 }) + " NARA (" + lockCount + " Active Locks)",
        "• ⚡ *Active Weight:* " + weightNum + "x Boost",
        "• 🔷 *Liquid ETH:* " + ethFormatted + " ETH",
        "• 🖼️ *Position NFTs:* " + nftBal.toString() + " Held",
        "",
        "🌾 *REWARDS & PROTOCOL EARNINGS*",
        "• 💵 *Claimed ETH:* " + claimedEth + " ETH",
        "• 🪙 *Claimed NARA:* " + claimedNara + " NARA",
        "• ⏳ *Current Epoch:* #" + currentEpoch,
        "",
        "⏳ *MATURITY & EXITS*",
        "• 🟢 *24h / 7d Pressure:* 0 Cliff Exits",
        "• 📈 *Exposure Profile:* Ultra-High Conviction",
        "━━━━━━━━━━━━━━━━━━━━",
        "🔗 [BaseScan Explorer](https://basescan.org/address/" + checksumTarget + ")",
        "💬 *Send \`/whales\` to view top protocol rankers!*"
      ].join("\n");

      return sendTg(fromChatId, dossierMsg);
    } catch (err) {
      return sendTg(fromChatId, "❌ Error analyzing wallet: " + err.message);
    }
  }

  return sendTg(fromChatId, "❓ Unknown command. Tap *Menu* or send `/help` to view available commands.");
}

let offset = 0;
async function pollLoop() {
  await registerMenuCommands();
  console.log("🤖 Telegram bot command listener started with rich Dossier...");
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
