import assert from "node:assert/strict";
import {
  ENGINE_JIT_EPOCH_LIMIT,
  buildEpochHealthReport,
  classifyEpochHealth,
  parseBacklogLimit,
  parseCriticalBacklog,
} from "./epochHealthRuntime.mjs";

assert.equal(parseBacklogLimit("1"), 1n);
assert.equal(parseBacklogLimit("0"), 0n);
assert.throws(() => parseBacklogLimit("-1"), /non-negative integer/);
assert.throws(() => parseBacklogLimit("1.5"), /non-negative integer/);
assert.equal(parseCriticalBacklog("5"), 5n);
assert.throws(() => parseCriticalBacklog("1"), /between 2 and 8/);
assert.throws(() => parseCriticalBacklog("9"), /between 2 and 8/);

assert.equal(classifyEpochHealth(10n, 10n).status, "GREEN");
assert.equal(classifyEpochHealth(10n, 9n).status, "GREEN");
assert.equal(classifyEpochHealth(10n, 8n).status, "YELLOW");
assert.equal(classifyEpochHealth(15n, 10n).status, "RED");
assert.equal(classifyEpochHealth(18n, 10n).status, "RED");
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

const earlyCritical = buildEpochHealthReport(classifyEpochHealth(15n, 10n), {
  chainId: 8453,
  blockNumber: 124n,
  engineAddress: "0x1000000000000000000000000000000000000001",
  createdAt: 457,
});
assert.equal(earlyCritical.payload.mainEvent, "epoch_backlog_critical");
assert.match(earlyCritical.payload.summary, /critical early-warning threshold/);

console.log("epoch health classification tests passed");
