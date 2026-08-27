import assert from "node:assert/strict";
import { planFailedTxScanRange } from "./failedTxScanRange.mjs";

const rolling = planFailedTxScanRange({
  deploymentStartBlock: 100n,
  latestBlock: 10_000n,
  maxBlocks: 512n,
});
assert.deepEqual(rolling, {
  fromBlock: 9_489n,
  toBlock: 10_000n,
  scannedBlocks: 512n,
  maxBlocks: 512n,
});

const deploymentBound = planFailedTxScanRange({
  deploymentStartBlock: 9_900n,
  latestBlock: 10_000n,
  maxBlocks: 512n,
});
assert.equal(deploymentBound.fromBlock, 9_900n);
assert.equal(deploymentBound.scannedBlocks, 101n);

const manual = planFailedTxScanRange({
  deploymentStartBlock: 100n,
  latestBlock: 10_000n,
  configuredFromBlock: "9750",
  configuredToBlock: "9999",
  maxBlocks: "512",
});
assert.equal(manual.fromBlock, 9_750n);
assert.equal(manual.toBlock, 9_999n);
assert.equal(manual.scannedBlocks, 250n);

assert.throws(
  () => planFailedTxScanRange({
    deploymentStartBlock: 100n,
    latestBlock: 10_000n,
    configuredFromBlock: 9_000n,
    maxBlocks: 512n,
  }),
  /exceeds FAILED_TX_SCAN_MAX_BLOCKS/,
);
assert.throws(
  () => planFailedTxScanRange({
    deploymentStartBlock: 100n,
    latestBlock: 10_000n,
    configuredToBlock: 10_001n,
  }),
  /cannot be greater than the latest block/,
);
assert.throws(
  () => planFailedTxScanRange({ deploymentStartBlock: 100n, latestBlock: 10_000n, maxBlocks: 0n }),
  /FAILED_TX_SCAN_MAX_BLOCKS/,
);

console.log("failed transaction scan range tests passed");
