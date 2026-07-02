import assert from "node:assert/strict";

const approvedOpsRouter = "0x1000000000000000000000000000000000000001";
const approvedBreakGlassSafe = "0x2000000000000000000000000000000000000002";
const unknownAdmin = "0x3000000000000000000000000000000000000003";
const treasuryReceiver = "0x4000000000000000000000000000000000000004";

function normalizeAddress(address) {
  return address.toLowerCase();
}

function callPathFor(caller) {
  const normalized = normalizeAddress(caller);
  if (normalized === approvedOpsRouter.toLowerCase()) return "ops_router";
  if (normalized === approvedBreakGlassSafe.toLowerCase()) return "break_glass";
  return "unknown_direct";
}

function directEngineAdminCall(seed) {
  const callPath = callPathFor(seed.caller);
  const allowedCaller = callPath === "ops_router" || callPath === "break_glass";
  return {
    id: seed.id,
    functionName: seed.functionName,
    role: seed.role,
    caller: normalizeAddress(seed.caller),
    callPath,
    allowedCaller: allowedCaller ? 1 : 0,
    severity: allowedCaller ? 0 : 5,
    txHash: seed.txHash,
    traceIndex: seed.traceIndex,
  };
}

function alertFor(call) {
  if (call.allowedCaller) return null;
  return {
    ruleId: "direct_engine_admin_call_unapproved",
    severity: 5,
    txHash: call.txHash,
  };
}

function opsRouterEvent(seed) {
  return {
    id: seed.id,
    eventType: seed.eventType,
    routerAddress: normalizeAddress(approvedOpsRouter),
    caller: normalizeAddress(seed.caller),
    target: seed.target ? normalizeAddress(seed.target) : null,
    amount: seed.amount ?? null,
    trackedEmissionReserveAfter: seed.trackedEmissionReserveAfter ?? null,
    txHash: seed.txHash,
  };
}

function opsRouterTimeline(rows) {
  return rows;
}

function directEngineAdminCalls(rows) {
  return rows;
}

function treasuryMovements(rows) {
  return rows.filter((row) => row.eventType === "treasury_eth_fees_withdrawn");
}

function rewardReserveAccounting(rows) {
  return rows.filter((row) =>
    row.eventType === "emission_reserve_deposited" ||
    row.eventType === "emission_reserve_synced"
  );
}

const routerRows = [
  opsRouterEvent({
    id: "8453-0xrouter-1",
    eventType: "engine_config_proposed",
    caller: approvedBreakGlassSafe,
    txHash: "0xrouter",
  }),
  opsRouterEvent({
    id: "8453-0xtreasury-1",
    eventType: "treasury_eth_fees_withdrawn",
    caller: approvedBreakGlassSafe,
    target: treasuryReceiver,
    amount: 123n,
    txHash: "0xtreasury",
  }),
  opsRouterEvent({
    id: "8453-0xdeposit-1",
    eventType: "emission_reserve_deposited",
    caller: approvedBreakGlassSafe,
    amount: 456n,
    trackedEmissionReserveAfter: 789n,
    txHash: "0xdeposit",
  }),
];

const unknownDirectCall = directEngineAdminCall({
  id: "8453-0xdirect-0",
  functionName: "withdrawTreasuryEthFees",
  role: "TREASURY_ROLE",
  caller: unknownAdmin,
  txHash: "0xdirect",
  traceIndex: 0,
});

const breakGlassDirectCall = directEngineAdminCall({
  id: "8453-0xbreakglass-0",
  functionName: "executeConfig",
  role: "PARAM_ROLE",
  caller: approvedBreakGlassSafe,
  txHash: "0xbreakglass",
  traceIndex: 0,
});

const directRows = [unknownDirectCall, breakGlassDirectCall];
const alerts = directRows.map(alertFor).filter(Boolean);

assert.equal(opsRouterTimeline(routerRows).length, 3, "router rows are indexed");
assert.equal(opsRouterTimeline(routerRows)[0].eventType, "engine_config_proposed", "router config event is normal observed path");

assert.equal(alerts.length, 1, "unknown direct engine admin call creates one alert");
assert.equal(alerts[0].severity, 5, "unknown direct engine admin call is severity 5");

assert.equal(breakGlassDirectCall.severity, 0, "break glass direct call is not severity 5");
assert.equal(directEngineAdminCalls(directRows).some((row) => row.callPath === "break_glass"), true, "break glass direct call is still recorded");

assert.equal(treasuryMovements(routerRows).length, 1, "treasury withdrawal appears in treasury_movements");
assert.equal(treasuryMovements(routerRows)[0].target, treasuryReceiver.toLowerCase(), "treasury receiver is preserved");

assert.equal(rewardReserveAccounting(routerRows).length, 1, "emission deposit appears in reward_reserve_accounting");
assert.equal(rewardReserveAccounting(routerRows)[0].trackedEmissionReserveAfter, 789n, "reserve balance is preserved");

console.log("Seeded ops router monitoring tests passed.");
