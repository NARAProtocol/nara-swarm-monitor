import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  POOL_FEE_TAKEN_EVENT,
  REALIZED_FEE_EVENT,
  buildLargeBuyTelegramMessage,
  formatNara,
  formatUsdc,
  isLargeCanonicalBuy,
  largeBuyDeliveryId,
  normalizeHookSwapEvent,
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
assert.equal(REALIZED_FEE_EVENT.name, "RealizedFee");
assert.equal(largeBuyDeliveryId(8453, "0xABC", 7), "8453:0xabc:7");

const v5BuyArgs = {
  currency: usdcAddress,
  termsVersion: 1n,
  exactInput: true,
  requested: 100_000_000n,
  gross: 100_000_000n,
  poolInput: 99_000_000n,
  fee: 1_000_000n,
  output: 950_000_000_000_000_000n,
};
assert.equal(isLargeCanonicalBuy(v5BuyArgs, { poolId, usdcAddress, minimumUsdcRaw }), true, "V5 RealizedFee USDC buy matches");
assert.equal(isLargeCanonicalBuy({ ...v5BuyArgs, gross: 99_999_999n }, { poolId, usdcAddress, minimumUsdcRaw }), false, "V5 RealizedFee below threshold does not match");
assert.equal(isLargeCanonicalBuy({ ...v5BuyArgs, currency: `0x${"78".repeat(20)}` }, { poolId, usdcAddress, minimumUsdcRaw }), false, "V5 RealizedFee NARA sell does not match");
const normalizedV5 = normalizeHookSwapEvent(v5BuyArgs, { poolId, usdcAddress });
assert.equal(normalizedV5.feeBps, 100, "V5 RealizedFee computes 100 bps (1.00%)");
assert.equal(formatNara(normalizedV5.naraOut), "0.95", "V5 RealizedFee formats NARA output");

const v5Message = buildLargeBuyTelegramMessage({
  amountIn: normalizedV5.amountIn,
  feeAmount: normalizedV5.feeAmount,
  feeBps: normalizedV5.feeBps,
  naraOut: normalizedV5.naraOut,
  buyer: `0x${"90".repeat(20)}`,
  blockNumber: 53422831n,
  transactionHash: `0x${"cd".repeat(32)}`,
});
assert.match(v5Message, /NARA Out: 0\.95 NARA/);
assert.match(v5Message, /1 USDC \(1\.00%\)/);

const message = buildLargeBuyTelegramMessage({
  amountIn: matching.amountIn,
  feeAmount: matching.feeAmount,
  feeBps: matching.feeBps,
  buyer: `0x${"90".repeat(20)}`,
  blockNumber: 123n,
  transactionHash: `0x${"ab".repeat(32)}`,
});
assert.match(message, /NARA POOL BUY DETECTED/);
assert.match(message, /100 USDC/);
assert.match(message, /3 USDC \(3\.00%\)/);
assert.match(message, /basescan\.org\/tx/);

const generatedAbi = readFileSync("abis/NARALiquidityGrowthHookAbi.ts", "utf8");
for (const field of ["PoolFeeTaken", "poolId", "sender", "currency", "amountIn", "feeAmount", "feeBps", "isBuy"]) {
  assert.match(generatedAbi, new RegExp(`\\"name\\": \\"${field}\\"`));
}

console.log("large-buy watcher runtime tests passed");
