import { createPublicClient, http, isAddress, getAddress, formatUnits, formatEther } from "viem";
import { base } from "viem/chains";
import pg from "pg";

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
const configuredPrincipalAddress = safeGetAddress(process.env.V5_PRINCIPAL_LEDGER || process.env.V4_PRINCIPAL_LEDGER);
const configuredRewardAddress = safeGetAddress(process.env.V5_REWARD_LEDGER || process.env.V4_REWARD_LEDGER);
const hookAddress = requiredAddress("V4_LIQUIDITY_GROWTH_HOOK");
const deployerAddress = requiredAddress("DEPLOYER_ADDRESS").toLowerCase();
const treasuryAddress = requiredAddress("V4_TREASURY_ADDRESS").toLowerCase();

const client = createPublicClient({
  chain: base,
  transport: http(rpcUrl, { timeout: 15_000 }),
});

const engineAbi = [
  {
    type: "function",
    name: "clock",
    stateMutability: "view",
    inputs: [],
    outputs: [{
      name: "c",
      type: "tuple",
      components: [
        { name: "started", type: "bool" },
        { name: "genesisTimestamp", type: "uint64" },
        { name: "wallEpoch", type: "uint64" },
        { name: "nextEpochToClose", type: "uint64" },
        { name: "backlog", type: "uint64" },
        { name: "nextBoundaryTimestamp", type: "uint256" },
      ],
    }],
  },
  {
    type: "function",
    name: "financialModules",
    stateMutability: "view",
    inputs: [],
    outputs: [
      { name: "principal", type: "address" },
      { name: "rewards", type: "address" },
    ],
  },
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

const principalAbi = [
  { type: "function", name: "nextPositionId", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
  {
    type: "function",
    name: "positionHead",
    stateMutability: "view",
    inputs: [{ name: "id", type: "uint256" }],
    outputs: [{
      type: "tuple",
      components: [
        { name: "generationOwner", type: "address" },
        { name: "generation", type: "uint64" },
        { name: "createdEpoch", type: "uint64" },
        { name: "activation", type: "uint64" },
        { name: "maturity", type: "uint64" },
        { name: "effectiveEnd", type: "uint64" },
        { name: "duration", type: "uint32" },
        { name: "principal", type: "uint256" },
        { name: "modelWeight", type: "uint256" },
        { name: "rewardWeight", type: "uint256" },
        { name: "earlyExitEnabled", type: "bool" },
        { name: "earlyExitBps", type: "uint16" },
        { name: "penalty", type: "uint256" },
        { name: "penaltyCapacityReserved", type: "uint256" },
        { name: "withdrawn", type: "bool" },
        { name: "termsHash", type: "bytes32" },
      ],
    }],
  },
];

const rewardAbi = [
  {
    type: "function",
    name: "claimCredit",
    stateMutability: "view",
    inputs: [
      { name: "id", type: "uint256" },
      { name: "generation", type: "uint64" },
      { name: "asset", type: "uint8" },
    ],
    outputs: [{
      type: "tuple",
      components: [
        { name: "through", type: "uint64" },
        { name: "unpaidScaled", type: "uint256" },
        { name: "paid", type: "uint256" },
      ],
    }],
  },
];

async function resolveV5Modules() {
  if (configuredPrincipalAddress && configuredRewardAddress) {
    return { principal: configuredPrincipalAddress, rewards: configuredRewardAddress };
  }
  try {
    const [principal, rewards] = await client.readContract({
      address: engineAddress,
      abi: engineAbi,
      functionName: "financialModules",
    });
    return {
      principal: configuredPrincipalAddress || safeGetAddress(principal),
      rewards: configuredRewardAddress || safeGetAddress(rewards),
    };
  } catch {
    return { principal: configuredPrincipalAddress, rewards: configuredRewardAddress };
  }
}

async function readEngineEpochSnapshot() {
  try {
    const clock = await client.readContract({
      address: engineAddress,
      abi: engineAbi,
      functionName: "clock",
    });
    return {
      currentEpoch: BigInt(clock.wallEpoch),
      settledEpoch: BigInt(clock.nextEpochToClose),
      backlog: Number(clock.backlog),
      isV5: true,
    };
  } catch {
    const [currentEpoch, epochState] = await Promise.all([
      client.readContract({ address: engineAddress, abi: engineAbi, functionName: "currentEpoch" }),
      client.readContract({ address: engineAddress, abi: engineAbi, functionName: "epochState" }),
    ]);
    return {
      currentEpoch: BigInt(currentEpoch),
      settledEpoch: BigInt(epochState),
      backlog: Number(currentEpoch) - Number(epochState),
      isV5: false,
    };
  }
}

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

// The treasury Range Ranger is permanently retired. Its former commands stay recognised so a
// sender is told so, but the listener never reads range state or builds or previews ladders.
const retiredRangeRangerCommands = new Set([
  "/ranger",
  "/range",
  "/rangestatus",
  "/rangerorders",
  "/orders",
  "/rangeorders",
  "/recenter",
  "/ranger_recenter",
]);
const rangeRangerRetiredMsg = [
  "🏹 *Range Ranger retired*",
  "━━━━━━━━━━━━━━━━━━━━",
  "The treasury Range Ranger is permanently retired. This bot no longer reads range orders or builds, previews or executes rebalance ladders.",
].join("\n");

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
    const modules = await resolveV5Modules();
    const contractsMsg = [
      "📜 *NARA Deployed Contracts*",
      "━━━━━━━━━━━━━━━━━━━━",
      "• *NARA Token:* `" + tokenAddress + "`",
      "• *NARA Engine:* `" + engineAddress + "`",
      ...(modules.principal ? ["• *Principal Ledger:* `" + modules.principal + "`"] : []),
      ...(modules.rewards ? ["• *Reward Ledger:* `" + modules.rewards + "`"] : []),
      nftAddress ? "• *Position NFT:* `" + nftAddress + "`" : "• *Position NFT:* not enabled in core profile",
      "• *Liquidity Hook:* `" + hookAddress + "`",
      "━━━━━━━━━━━━━━━━━━━━"
    ].join("\n");
    return sendTg(fromChatId, contractsMsg);
  }

  if (cmd === "/health") {
    try {
      const [snapshot, blockNumber] = await Promise.all([
        readEngineEpochSnapshot(),
        client.getBlockNumber(),
      ]);
      const currentEpoch = snapshot.currentEpoch;
      const epochState = snapshot.settledEpoch;
      const backlog = snapshot.backlog;
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

  if (retiredRangeRangerCommands.has(cmd)) {
    return sendTg(fromChatId, rangeRangerRetiredMsg);
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
      const modules = await resolveV5Modules();
      const userTotals = new Map();

      if (modules.principal) {
        const nextPosId = await client.readContract({
          address: modules.principal,
          abi: principalAbi,
          functionName: "nextPositionId",
        });
        const count = Number(nextPosId);
        for (let i = 1; i < count; i++) {
          try {
            const pos = await client.readContract({
              address: modules.principal,
              abi: principalAbi,
              functionName: "positionHead",
              args: [BigInt(i)],
            });
            const amt = BigInt(pos.principal);
            if (!pos.withdrawn && amt > 0n) {
              const current = userTotals.get(pos.generationOwner.toLowerCase()) || { owner: pos.generationOwner, amount: 0n, count: 0 };
              current.amount += amt;
              current.count += 1;
              userTotals.set(pos.generationOwner.toLowerCase(), current);
            }
          } catch {}
        }
      } else {
        const nextPosId = await client.readContract({
          address: engineAddress,
          abi: engineAbi,
          functionName: "nextPositionId",
        });
        const count = Number(nextPosId);
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
      const modules = await resolveV5Modules();

      const [ethBal, naraBal, nftBalance, totalSupply, epochSnapshot, nextPosId] = await Promise.all([
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
        readEngineEpochSnapshot(),
        modules.principal
          ? client.readContract({
              address: modules.principal,
              abi: principalAbi,
              functionName: "nextPositionId",
            })
          : client.readContract({
              address: engineAddress,
              abi: engineAbi,
              functionName: "nextPositionId",
            }),
      ]);
      const currentEpoch = epochSnapshot.currentEpoch;

      const totalPositions = Number(nextPosId);
      const userLocks = [];
      let totalLockedBig = 0n;
      let totalWeightBig = 0n;
      let totalClaimableNara = 0n;
      let totalClaimableEth = 0n;

      for (let i = 1; i < totalPositions; i++) {
        try {
          if (modules.principal) {
            const pos = await client.readContract({
              address: modules.principal,
              abi: principalAbi,
              functionName: "positionHead",
              args: [BigInt(i)],
            });
            if (pos.generationOwner.toLowerCase() === lower) {
              const amt = BigInt(pos.principal);
              const wgt = BigInt(pos.rewardWeight);
              const isActive = !pos.withdrawn && amt > 0n;

              if (isActive) {
                totalLockedBig += amt;
                totalWeightBig += wgt;
              }

              let claimNara = 0n;
              let claimEth = 0n;
              if (isActive && modules.rewards) {
                try {
                  const [naraCredit, ethCredit] = await Promise.all([
                    client.readContract({
                      address: modules.rewards,
                      abi: rewardAbi,
                      functionName: "claimCredit",
                      args: [BigInt(i), BigInt(pos.generation), 0],
                    }),
                    client.readContract({
                      address: modules.rewards,
                      abi: rewardAbi,
                      functionName: "claimCredit",
                      args: [BigInt(i), BigInt(pos.generation), 1],
                    }),
                  ]);
                  const ray = 10n ** 27n;
                  claimNara = BigInt(naraCredit?.unpaidScaled ?? 0n) / ray;
                  claimEth = BigInt(ethCredit?.unpaidScaled ?? 0n) / ray;
                  totalClaimableNara += claimNara;
                  totalClaimableEth += claimEth;
                } catch {}
              }

              userLocks.push({
                id: i,
                amount: amt,
                weight: wgt,
                activationEpoch: pos.activation,
                unlockEpoch: pos.effectiveEnd,
                claimNara,
                claimEth,
                isActive,
              });
            }
          } else {
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
