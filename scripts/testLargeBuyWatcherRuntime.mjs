import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  POOL_FEE_TAKEN_EVENT,
  buildLargeBuyTelegramMessage,
  formatUsdc,
  isLargeCanonicalBuy,
  largeBuyDeliveryId,
  parseUsdcThreshold,
} from "./largeBuyWatcherRuntime.mjs";

const poolId = `0x${"12".repeat(32)}`;
const usdcAddress = `0x${"34".repeat(20)}`;
const minimumUsdcRaw = parseUsdcThreshold("100");
const matching = {
  poolId,
  sender: `0x${"56".repeat(20)}`,
  currency: usdcAddress,
  amountIn: 100_000_000n,
  feeAmount: 3_000_000n,
  feeBps: 300,
  isBuy: true,
};

assert.equal(minimumUsdcRaw, 100_000_000n);
assert.equal(parseUsdcThreshold("100.123456"), 100_123_456n);
assert.throws(() => parseUsdcThreshold("100.1234567"), /at most 6 decimals/);
assert.throws(() => parseUsdcThreshold("0"), /greater than zero/);
assert.equal(formatUsdc(100_123_400n), "100.1234");
assert.equal(isLargeCanonicalBuy(matching, { poolId, usdcAddress, minimumUsdcRaw }), true);
assert.equal(isLargeCanonicalBuy({ ...matching, isBuy: false }, { poolId, usdcAddress, minimumUsdcRaw }), false);
assert.equal(isLargeCanonicalBuy({ ...matching, amountIn: 99_999_999n }, { poolId, usdcAddress, minimumUsdcRaw }), false);
assert.equal(isLargeCanonicalBuy({ ...matching, currency: `0x${"78".repeat(20)}` }, { poolId, usdcAddress, minimumUsdcRaw }), false);
assert.equal(POOL_FEE_TAKEN_EVENT.name, "PoolFeeTaken");
assert.equal(largeBuyDeliveryId(8453, "0xABC", 7), "8453:0xabc:7");

const message = buildLargeBuyTelegramMessage({
  amountIn: matching.amountIn,
  feeAmount: matching.feeAmount,
  feeBps: matching.feeBps,
  buyer: `0x${"90".repeat(20)}`,
  blockNumber: 123n,
  transactionHash: `0x${"ab".repeat(32)}`,
});
assert.match(message, /NARA LARGE BUY/);
assert.match(message, /100 USDC/);
assert.match(message, /3 USDC \(300 BPS\)/);
assert.match(message, /basescan\.org\/tx/);

const generatedAbi = readFileSync("abis/NARALiquidityGrowthHookAbi.ts", "utf8");
for (const field of ["PoolFeeTaken", "poolId", "sender", "currency", "amountIn", "feeAmount", "feeBps", "isBuy"]) {
  assert.match(generatedAbi, new RegExp(`\\"name\\": \\"${field}\\"`));
}

console.log("large-buy watcher runtime tests passed");
