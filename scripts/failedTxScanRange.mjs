export const DEFAULT_FAILED_TX_SCAN_MAX_BLOCKS = 512n;

function asPositiveBigInt(value, name) {
  let parsed;
  try {
    parsed = BigInt(value);
  } catch {
    throw new Error(`${name} must be a positive integer`);
  }
  if (parsed <= 0n) throw new Error(`${name} must be a positive integer`);
  return parsed;
}

function optionalBlock(value, name) {
  if (value === undefined || value === null || String(value).trim() === "") return undefined;
  return asPositiveBigInt(value, name);
}

export function planFailedTxScanRange({
  deploymentStartBlock,
  latestBlock,
  configuredFromBlock,
  configuredToBlock,
  maxBlocks = DEFAULT_FAILED_TX_SCAN_MAX_BLOCKS,
}) {
  const deploymentStart = asPositiveBigInt(deploymentStartBlock, "V4_START_BLOCK");
  const latest = asPositiveBigInt(latestBlock, "latest block");
  const limit = asPositiveBigInt(maxBlocks, "FAILED_TX_SCAN_MAX_BLOCKS");
  const configuredFrom = optionalBlock(configuredFromBlock, "FAILED_TX_FROM_BLOCK");
  const configuredTo = optionalBlock(configuredToBlock, "FAILED_TX_TO_BLOCK");
  const toBlock = configuredTo ?? latest;

  if (toBlock > latest) {
    throw new Error("FAILED_TX_TO_BLOCK cannot be greater than the latest block");
  }
  if (toBlock < deploymentStart) {
    throw new Error("FAILED_TX_TO_BLOCK/latest block must be greater than or equal to V4_START_BLOCK");
  }

  const rollingFrom = toBlock >= limit ? toBlock - limit + 1n : 1n;
  const requestedFrom = configuredFrom ?? rollingFrom;
  const fromBlock = requestedFrom > deploymentStart ? requestedFrom : deploymentStart;
  const scannedBlocks = toBlock - fromBlock + 1n;

  if (scannedBlocks > limit) {
    throw new Error(`Failed transaction scan range exceeds FAILED_TX_SCAN_MAX_BLOCKS (${limit})`);
  }

  return { fromBlock, toBlock, scannedBlocks, maxBlocks: limit };
}
