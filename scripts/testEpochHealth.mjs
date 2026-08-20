import assert from "node:assert/strict";
import {
  ENGINE_JIT_EPOCH_LIMIT,
  buildEpochHealthReport,
  classifyEpochHealth,
  parseBacklogLimit,
} from "./epochHealthRuntime.mjs";

assert.equal(parseBacklogLimit("1"), 1n);
assert.equal(parseBacklogLimit("0"), 0n);
assert.throws(() => parseBacklogLimit("-1"), /non-negative integer/);
assert.throws(() => parseBacklogLimit("1.5"), /non-negative integer/);

assert.equal(classifyEpochHealth(10n, 10n).status, "GREEN");
assert.equal(classifyEpochHealth(10n, 9n).status, "GREEN");
assert.equal(classifyEpochHealth(10n, 8n).status, "YELLOW");
assert.equal(classifyEpochHealth(18n, 10n).status, "YELLOW");
const red = classifyEpochHealth(19n, 10n);
assert.equal(red.status, "RED");
assert.equal(red.severity, 5);
assert.equal(red.backlog, ENGINE_JIT_EPOCH_LIMIT + 1n);
assert.throws(() => classifyEpochHealth(9n, 10n), /settled epoch cannot exceed/);

const report = buildEpochHealthReport(red, {
  chainId: 8453,
  blockNumber: 123n,
  engineAddress: "0x1000000000000000000000000000000000000001",
  createdAt: 456,
});
assert.equal(report.status, "RED");
assert.equal(report.payload.evidence[0].backlog, "9");
assert.match(report.payload.summary, /EpochStale/);

console.log("epoch health classification tests passed");
