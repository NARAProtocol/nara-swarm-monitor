import {
  activeContractsFromEnv,
  createBaseClient,
  scanFailedTransactions,
  serializeForJson,
} from "./failedTxScannerRuntime.mjs";

function requiredEnv(name) {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is required`);
  return value;
}

function parsePositiveBigIntEnv(name) {
  const raw = requiredEnv(name);
  const value = BigInt(raw);
  if (value <= 0n) throw new Error(`${name} must be positive`);
  return value;
}

const rpcUrl = requiredEnv("BASE_RPC_URL");
const chainId = Number(process.env.CHAIN_ID || "8453");
const fromBlock = parsePositiveBigIntEnv("V4_START_BLOCK");
const client = createBaseClient(rpcUrl);
const latestBlock = await client.getBlockNumber();
const toBlock = process.env.FAILED_TX_TO_BLOCK ? BigInt(process.env.FAILED_TX_TO_BLOCK) : latestBlock;

if (toBlock < fromBlock) {
  throw new Error("FAILED_TX_TO_BLOCK/latest block must be greater than or equal to V4_START_BLOCK");
}

const activeContracts = activeContractsFromEnv();
const result = await scanFailedTransactions({
  client,
  chainId,
  fromBlock,
  toBlock,
  activeContracts,
  options: {
    approvedOpsRouter: process.env.V4_ENGINE_OPS_ROUTER,
    approvedBreakGlassSafe: process.env.V4_BREAK_GLASS_SAFE,
    repeatedFailureThreshold: Number(process.env.FAILED_TX_REPEATED_THRESHOLD || "3"),
    criticalFailureThreshold: Number(process.env.FAILED_TX_CRITICAL_THRESHOLD || "3"),
    groupWindowSeconds: Number(process.env.FAILED_TX_GROUP_WINDOW_SECONDS || "3600"),
  },
});

console.log(serializeForJson({
  chainId,
  fromBlock,
  toBlock,
  scannedBlocks: result.scannedBlocks,
  inspectedTransactions: result.inspectedTransactions,
  ignoredNonNaraTransactions: result.ignoredNonNaraTransactions,
  failedTransactionCount: result.failedTransactions.length,
  failedGroupCount: result.failedTxGroups.length,
  walletActivityCount: result.walletActivityEvents.length,
  walletRiskDeltaCount: result.walletRiskDeltas.length,
  alertCount: result.alerts.length,
  failedTransactions: result.failedTransactions,
  failedTxGroups: result.failedTxGroups,
  alerts: result.alerts,
}));

