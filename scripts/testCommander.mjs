import assert from "node:assert/strict";
import {
  DEFAULT_COMMANDER_INPUTS,
  buildCommanderReport,
  commanderViewSql,
  commanderReportToRow,
} from "./commanderRuntime.mjs";

const fixedTime = 1_700_001_000;
const chainId = 8453;
const wallet = "0x000000000000000000000000000000000000a001";

function inputs(overrides = {}) {
  return {
    ...DEFAULT_COMMANDER_INPUTS,
    protocol_risk_summary: [{
      openAlertCount: 0,
      criticalAlertCount: 0,
      severity4AlertCount: 0,
      severity3AlertCount: 0,
      maxSeverity: 0,
      totalOccurrences: 0,
    }],
    ...overrides,
  };
}

function alert(severity, ruleId, extra = {}) {
  return {
    id: `${ruleId}-1`,
    fingerprint: `${ruleId}:fingerprint`,
    severity,
    ruleId,
    title: `${ruleId} title`,
    status: "open",
    txHash: "0xalert",
    blockNumber: 100n,
    wallet,
    positionId: 7n,
    tokenId: "8453-7",
    amount: 1000n,
    observedValue: "observed",
    thresholdValue: "threshold",
    sourceTable: "alerts",
    sourceRowId: `${ruleId}-source`,
    lastSeenAt: fixedTime,
    ...extra,
  };
}

{
  const critical = alert(5, "direct_engine_admin_call_unapproved");
  const report = buildCommanderReport(inputs({
    open_alerts: [critical],
    critical_alerts: [critical],
    protocol_risk_summary: [{ openAlertCount: 1, criticalAlertCount: 1, maxSeverity: 5 }],
  }), { chainId, createdAt: fixedTime });

  assert.equal(report.status, "RED", "RED when severity 5 open alert exists");
  assert.equal(report.requiresHumanDecision, true, "requiresHumanDecision true for RED");
  assert.equal(report.evidence.some((item) => item.source === "critical_alerts" && item.txHash === "0xalert"), true, "critical alert included in evidence");
}

{
  const report = buildCommanderReport(inputs({
    open_alerts: [alert(4, "large_unlock_24h")],
    protocol_risk_summary: [{ openAlertCount: 1, criticalAlertCount: 0, severity4AlertCount: 1, maxSeverity: 4 }],
  }), { chainId, createdAt: fixedTime });

  assert.equal(report.status, "YELLOW", "YELLOW when only severity 4 exists");
  assert.equal(report.severity, 4, "YELLOW report keeps max severity");
}

{
  const report = buildCommanderReport(inputs(), { chainId, createdAt: fixedTime });
  assert.equal(report.status, "GREEN", "GREEN when no severity 3+ open alerts exist");
  assert.equal(report.requiresHumanDecision, false, "requiresHumanDecision false for GREEN");
}

{
  const report = buildCommanderReport(inputs({
    wallet_risk_ranking: [{ wallet, riskScore: 999, activeLockedAmount: 100n }],
  }), { chainId, createdAt: fixedTime });

  assert.equal(report.walletActivity.topRiskWallets[0].wallet, wallet, "wallet risk ranking included");
  assert.equal(report.evidence.some((item) => item.source === "wallet_risk_ranking" && item.wallet === wallet), true, "wallet risk evidence included");
}

{
  const rows = Array.from({ length: 60 }, (_, index) => ({
    wallet: `0x${String(index + 1).padStart(40, "0")}`,
    lockedNara: String(index === 59 ? 10_000 : index),
  }));
  const report = buildCommanderReport(inputs({
    wallet_risk_ranking: [{ wallet, riskScore: 9, activeLockedAmount: "100", convictionScore: 10 }],
    wallet_position_summary: rows,
  }), { chainId, createdAt: fixedTime });

  assert.equal(report.walletActivity.largestLockedBalanceRows[0].wallet, rows[59].wallet, "largest locked balance is selected even when it follows the first 50 rows");
  const serialized = JSON.stringify(report.walletActivity);
  assert.doesNotMatch(serialized, /conviction/i, "investment-style conviction fields are not exposed");
  assert.doesNotMatch(serialized, /walletType|whale/i, "promotional wallet type labels are not exposed");
  assert.match(
    commanderViewSql("wallet_position_summary", 50),
    /order by "lockedNara" desc limit 50$/,
    "largest locked balance query orders before applying its limit",
  );
}

{
  const cliff = { wallet, positionId: 7n, amount: 2000n, estimatedUnlockTimestamp: fixedTime + 3600 };
  const report = buildCommanderReport(inputs({
    unlock_cliffs_24h: [cliff],
  }), { chainId, createdAt: fixedTime });

  assert.equal(report.positionActivity.unlockCliffs24hCount, 1, "unlock cliff included");
  assert.equal(report.evidence.some((item) => item.source === "unlock_cliffs_24h" && item.wallet === wallet), true, "unlock cliff evidence included");
}

{
  const spike = { id: "failed-spike-1", wallet, contractName: "NARAEngine", functionName: "grantRole", failureCount: 3, severity: 5 };
  const report = buildCommanderReport(inputs({
    failed_tx_spikes: [spike],
  }), { chainId, createdAt: fixedTime });

  assert.equal(report.failedTxActivity.failedTxSpikes[0].id, "failed-spike-1", "failed tx spike included");
  assert.equal(report.evidence.some((item) => item.source === "failed_tx_spikes" && item.sourceRowId === "failed-spike-1"), true, "failed tx spike evidence included");
}

{
  const seededInputs = inputs({
    open_alerts: [alert(4, "wallet_concentration_above_threshold")],
    wallet_risk_ranking: [{ wallet, riskScore: 777 }],
    unlock_cliffs_7d: [{ wallet, positionId: 9n, amount: 333n }],
  });
  const first = buildCommanderReport(seededInputs, { chainId, createdAt: fixedTime });
  const second = buildCommanderReport(seededInputs, { chainId, createdAt: fixedTime });

  assert.deepEqual(first, second, "report is deterministic from same seeded inputs");
}

{
  const report = buildCommanderReport(inputs(), { chainId, createdAt: fixedTime });
  const row = commanderReportToRow(report);
  assert.equal(row.status, "GREEN", "report row includes status");
  assert.equal(typeof row.protocolActivityJson, "string", "report row serializes protocol activity");
  assert.equal(row.requiresHumanDecision, 0, "report row serializes human decision flag");
}

console.log("Seeded Commander v1 tests passed.");
