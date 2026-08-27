import pg from "pg";
import { createPublicClient, http } from "viem";
import { base } from "viem/chains";
import { configuredRpcUrls, withRpcFailover } from "./rpcFailoverRuntime.mjs";
import { postgresClientConfig } from "./sqlRuntime.mjs";
import {
  POOL_FEE_TAKEN_EVENT,
  buildLargeBuyTelegramMessage,
  buildLargeBuyTestMessage,
  formatUsdc,
  isLargeCanonicalBuy,
  largeBuyDeliveryId,
  parseUsdcThreshold,
} from "./largeBuyWatcherRuntime.mjs";

const sleep = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));
const enabled = ["true", "1"].includes(String(process.env.LARGE_BUY_ALERT_ENABLED || "false").toLowerCase());
const testNotification = process.argv.includes("--test-notification");
const runOnce = process.argv.includes("--once");

if (!enabled && !testNotification) {
  console.log("Large-buy watcher is disabled.");
  process.exit(0);
}

const chainId = Number(process.env.CHAIN_ID || "8453");
const hookAddress = process.env.V4_LIQUIDITY_GROWTH_HOOK;
const poolId = process.env.V4_UNISWAP_V4_POOL_ID;
const usdcAddress = process.env.V4_USDC_TOKEN;
const botToken = process.env.TELEGRAM_BOT_TOKEN;
const chatId = process.env.TELEGRAM_CHAT_ID;
const databaseUrl = process.env.DATABASE_URL;
const minimumUsdcRaw = parseUsdcThreshold(process.env.LARGE_BUY_ALERT_MIN_USDC || "100");
const startBlock = BigInt(process.env.LARGE_BUY_ALERT_START_BLOCK || "0");
const pollSeconds = Number(process.env.LARGE_BUY_ALERT_POLL_SECONDS || "10");
const confirmations = BigInt(process.env.LARGE_BUY_ALERT_CONFIRMATIONS || "2");
const maxBlocksPerScan = BigInt(process.env.LARGE_BUY_ALERT_MAX_BLOCKS_PER_SCAN || "500");
const rpcUrls = configuredRpcUrls();
const watcherKey = `${chainId}:${String(hookAddress).toLowerCase()}:${String(poolId).toLowerCase()}`;
const redactions = [botToken, databaseUrl, ...rpcUrls].filter(Boolean);

function safeMessage(error) {
  let message = error instanceof Error ? error.message : "unknown error";
  for (const secret of redactions) message = message.replaceAll(secret, "[redacted]");
  return message;
}

async function sendTelegram(text) {
  const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text, disable_web_page_preview: true }),
  });
  if (!response.ok) throw new Error(`Telegram send failed with HTTP ${response.status}`);
}

if (testNotification) {
  await sendTelegram(buildLargeBuyTestMessage({ minimumUsdcRaw, startBlock }));
  console.log("Large-buy Telegram test notification sent.");
  process.exit(0);
}

const db = new pg.Client(postgresClientConfig(databaseUrl));
await db.connect();

await db.query(`
  create table if not exists large_buy_alert_state (
    watcher_key text primary key,
    last_processed_block numeric(78, 0) not null,
    updated_at timestamptz not null default now()
  )
`);
await db.query(`
  create table if not exists large_buy_alert_deliveries (
    delivery_id text primary key,
    chain_id integer not null,
    pool_id text not null,
    transaction_hash text not null,
    log_index integer not null,
    block_number numeric(78, 0) not null,
    buyer text not null,
    hook_sender text not null,
    amount_in_usdc_raw numeric(78, 0) not null,
    fee_usdc_raw numeric(78, 0) not null,
    fee_bps integer not null,
    status text not null,
    attempt_count integer not null default 0,
    error_message text,
    created_at timestamptz not null default now(),
    sent_at timestamptz
  )
`);
await db.query(
  `insert into large_buy_alert_state (watcher_key, last_processed_block)
   values ($1, $2)
   on conflict (watcher_key) do nothing`,
  [watcherKey, (startBlock - 1n).toString()],
);

async function readCursor() {
  const result = await db.query(
    "select last_processed_block from large_buy_alert_state where watcher_key = $1",
    [watcherKey],
  );
  if (result.rowCount !== 1) throw new Error("large-buy watcher cursor is unavailable");
  return BigInt(result.rows[0].last_processed_block);
}

async function writeCursor(blockNumber) {
  await db.query(
    `update large_buy_alert_state
     set last_processed_block = $2, updated_at = now()
     where watcher_key = $1`,
    [watcherKey, blockNumber.toString()],
  );
}

async function reserveDelivery(details) {
  const deliveryId = largeBuyDeliveryId(chainId, details.transactionHash, details.logIndex);
  await db.query(
    `insert into large_buy_alert_deliveries (
       delivery_id, chain_id, pool_id, transaction_hash, log_index, block_number,
       buyer, hook_sender, amount_in_usdc_raw, fee_usdc_raw, fee_bps, status
     ) values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'pending')
     on conflict (delivery_id) do nothing`,
    [
      deliveryId,
      chainId,
      poolId.toLowerCase(),
      details.transactionHash.toLowerCase(),
      details.logIndex,
      details.blockNumber.toString(),
      details.buyer.toLowerCase(),
      details.hookSender.toLowerCase(),
      details.amountIn.toString(),
      details.feeAmount.toString(),
      Number(details.feeBps),
    ],
  );
  const result = await db.query(
    "select status from large_buy_alert_deliveries where delivery_id = $1",
    [deliveryId],
  );
  return { deliveryId, alreadySent: result.rows[0]?.status === "success" };
}

async function markDelivery(deliveryId, status, errorMessage = null) {
  await db.query(
    `update large_buy_alert_deliveries
     set status = $2,
         attempt_count = attempt_count + 1,
         error_message = $3,
         sent_at = case when $2 = 'success' then now() else sent_at end
     where delivery_id = $1`,
    [deliveryId, status, errorMessage],
  );
}

async function readChainRange(rpcUrl, cursor) {
  const client = createPublicClient({ chain: base, transport: http(rpcUrl, { timeout: 15_000 }) });
  const latestBlock = await client.getBlockNumber();
  const confirmedHead = latestBlock > confirmations ? latestBlock - confirmations : 0n;
  if (confirmedHead <= cursor) return { cursor, confirmedHead, scanned: false, purchases: [] };

  const fromBlock = cursor + 1n;
  const toBlock = fromBlock + maxBlocksPerScan - 1n < confirmedHead
    ? fromBlock + maxBlocksPerScan - 1n
    : confirmedHead;
  const logs = await client.getLogs({
    address: hookAddress,
    event: POOL_FEE_TAKEN_EVENT,
    args: { poolId },
    fromBlock,
    toBlock,
  });

  const purchases = [];
  for (const log of logs) {
    if (!isLargeCanonicalBuy(log.args, { poolId, usdcAddress, minimumUsdcRaw })) continue;
    const transaction = await client.getTransaction({ hash: log.transactionHash });
    purchases.push({
      transactionHash: log.transactionHash,
      logIndex: Number(log.logIndex),
      blockNumber: log.blockNumber,
      buyer: transaction.from,
      hookSender: log.args.sender,
      amountIn: log.args.amountIn,
      feeAmount: log.args.feeAmount,
      feeBps: log.args.feeBps,
    });
  }

  return { cursor: toBlock, confirmedHead, scanned: true, purchases };
}

async function deliverPurchases(purchases) {
  let alertCount = 0;
  for (const details of purchases) {
    const reservation = await reserveDelivery(details);
    if (reservation.alreadySent) continue;

    try {
      await sendTelegram(buildLargeBuyTelegramMessage(details));
      await markDelivery(reservation.deliveryId, "success");
      alertCount += 1;
      console.log(`Large-buy alert sent: block=${details.blockNumber} tx=${details.transactionHash}`);
    } catch (error) {
      await markDelivery(reservation.deliveryId, "failed", safeMessage(error));
      throw error;
    }
  }
  return alertCount;
}

let lastHeartbeatAt = 0;
async function cycle() {
  const cursor = await readCursor();
  const result = await withRpcFailover(rpcUrls, (rpcUrl) => readChainRange(rpcUrl, cursor));
  const alertCount = await deliverPurchases(result.value.purchases);
  if (result.value.scanned) await writeCursor(result.value.cursor);
  const now = Date.now();
  if (alertCount > 0 || now - lastHeartbeatAt >= 60_000) {
    console.log(
      `Large-buy watcher healthy: cursor=${result.value.cursor} confirmedHead=${result.value.confirmedHead} alerts=${alertCount} provider=${result.providerIndex}`,
    );
    lastHeartbeatAt = now;
  }
}

console.log(`Large-buy watcher active: threshold=${formatUsdc(minimumUsdcRaw)} USDC poll=${pollSeconds}s confirmations=${confirmations}`);

try {
  do {
    try {
      await cycle();
    } catch (error) {
      console.error(`Large-buy watcher cycle failed: ${safeMessage(error)}`);
    }
    if (!runOnce) await sleep(pollSeconds * 1000);
  } while (!runOnce);
} finally {
  await db.end().catch(() => {});
}
