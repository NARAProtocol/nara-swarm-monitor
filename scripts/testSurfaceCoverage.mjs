import assert from "node:assert/strict";
import {
  REQUIRED_MONITOR_SURFACES,
  coverageGaps,
  eventCoverageGaps,
  evaluateSurfaceObservation,
  replayAndReconcile,
  reconcileDirectState,
} from "../src/surfaceCoverage.mjs";

assert.deepEqual(coverageGaps({}).length, Object.keys(REQUIRED_MONITOR_SURFACES).length);

const configured = Object.fromEntries(
  Object.values(REQUIRED_MONITOR_SURFACES).map(({ env }, index) => [
    env,
    `0x${String(index + 1).padStart(40, "0")}`,
  ]),
);
assert.equal(coverageGaps(configured).length, 0, "all required surface addresses are covered");

const registered = Object.fromEntries(
  Object.entries(REQUIRED_MONITOR_SURFACES).map(([surface, definition]) => [surface, definition.events]),
);
assert.equal(eventCoverageGaps(registered).length, 0, "all required events are registered");
registered.liquidityCompounder = registered.liquidityCompounder.filter((name) => name !== "RecoveryProposed");
assert.deepEqual(eventCoverageGaps(registered), [{ surface: "liquidityCompounder", eventName: "RecoveryProposed" }]);

const criticalCases = [
  {
    kind: "reward_checkpoint_exposure", surface: "stakingPool", eventName: "Transfer",
    asset: "USDC", uncheckpointedValue: 1n,
  },
  {
    kind: "noncanonical_nara_pool", surface: "basketManager", eventName: "BasketBought",
    manager: "0xmanager", poolId: "0xalternate",
  },
  {
    kind: "compounder_configuration", surface: "liquidityVault", eventName: "CompounderSet",
    vault: "0xvault", compounder: "0xcompounder", frozen: false, codeHashMatches: true,
  },
  {
    kind: "pol_recovery_proposed", surface: "liquidityCompounder", eventName: "RecoveryProposed",
    compounder: "0xcompounder", recipient: "0xrecipient", eta: 100,
  },
  {
    kind: "basket_solvency", surface: "basketManager", eventName: "solvencyPoll",
    manager: "0xmanager", asset: "NARA", accounted: 101n, balance: 100n,
  },
];
for (const observation of criticalCases) {
  const [alert] = evaluateSurfaceObservation({ ...observation, txHash: "0xtx", blockNumber: 1n });
  assert.equal(alert.severity, 5, `${observation.kind} is critical`);
}

{
  const alerts = reconcileDirectState({
    chainId: 8453,
    blockNumber: 99n,
    baskets: [{ manager: "0xbasket", assets: [{ asset: "NARA", accounted: 101n, balance: 100n }] }],
    stakingPool: { address: "0xpool", reserved: 20n, liquid: 10n },
    engine: { currentEpoch: 20n, settledEpoch: 11n },
    compounder: {
      vault: "0xvault", address: "0xcompounder", frozen: true,
      codeHash: "0xbad", expectedCodeHash: "0xgood",
    },
  });
  assert.deepEqual(
    new Set(alerts.map(({ ruleId }) => ruleId)),
    new Set(["basket_asset_insolvent", "redemption_liquidity_deficit", "epoch_backlog_above_jit_limit", "compounder_not_verified_and_frozen"]),
    "mocked direct-state reconciliation emits every deterministic mismatch",
  );
}

assert.equal(evaluateSurfaceObservation({
  kind: "basket_solvency", surface: "basketManager", eventName: "solvencyPoll",
  manager: "0xmanager", asset: "NARA", accounted: 100n, balance: 100n,
}).length, 0, "solvent basket does not alert");

assert.equal(evaluateSurfaceObservation({
  kind: "redemption_coverage", surface: "stakingPool", eventName: "coveragePoll",
  pool: "0xpool", reserved: 2n, liquid: 1n,
})[0].ruleId, "redemption_liquidity_deficit");

assert.equal(evaluateSurfaceObservation({
  kind: "epoch_backlog", surface: "engine", eventName: "freshnessPoll",
  chainId: 8453, backlog: 9n,
})[0].ruleId, "epoch_backlog_above_jit_limit");

console.log("Active v4 surface coverage and deterministic alert tests passed.");

{
  const base = {
    chainId: 8453, txHash: "0xABC", logIndex: 7, blockHash: "0xold",
    surface: "basket_manager", eventType: "buy", amount: 10n,
  };
  const duplicate = { ...base };
  const replacement = { ...base, blockHash: "0xnew", amount: 12n };
  const result = replayAndReconcile([base, duplicate, replacement]);
  assert.equal(result.rows.length, 1, "duplicate delivery is idempotent");
  assert.equal(result.rows[0].blockHash, "0xnew", "reorg replacement becomes canonical");
  assert.equal(result.totals["basket_manager:buy"], 12n, "reconciliation totals use canonical replacement only");
}
