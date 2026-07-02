import assert from "node:assert/strict";
import {
  buildAiSummary,
  commanderReportFromStoredRow,
  localStubProvider,
} from "./aiSummarizerRuntime.mjs";

const createdAt = 1_700_002_000;
const commanderReportId = "8453-1700001000-commander-v1";
const actions = [
  "Review open severity 5 alerts and confirm whether incident response or break-glass review is required.",
  "Keep Commander v1 read-only; no protocol transactions are authorized by this report.",
];

function commanderRow(overrides = {}) {
  return {
    id: commanderReportId,
    chainId: 8453,
    status: "RED",
    severity: 5,
    title: "NARA Commander v1 RED",
    summary: "RED: 1 open alerts, 1 critical alerts, 0 failed transaction spike rows, 0 24h unlock cliff rows.",
    mainEvent: "direct_engine_admin_call_unapproved: Unknown direct NARAEngine admin call",
    protocolActivityJson: JSON.stringify({ openAlertCount: 1, criticalAlertCount: 1 }),
    walletActivityJson: JSON.stringify({ topRiskWallets: [] }),
    positionActivityJson: JSON.stringify({ unlockCliffs24hCount: 0 }),
    adminActivityJson: JSON.stringify({ alertSummary: [] }),
    treasuryActivityJson: JSON.stringify({ alertSummary: [] }),
    routerActivityJson: JSON.stringify({ alertSummary: [] }),
    failedTxActivityJson: JSON.stringify({ failedTxSpikes: [] }),
    riskSummaryJson: JSON.stringify({ status: "RED", severity: 5, requiresHumanDecision: true }),
    recommendedActionsJson: JSON.stringify(actions),
    evidenceJson: JSON.stringify([{
      source: "critical_alerts",
      sourceRowId: "alert-1",
      txHash: "0xcritical",
      wallet: "0x000000000000000000000000000000000000a001",
      observedValue: "unknown direct call",
      thresholdValue: "approved caller",
      note: "Open severity 5 alert included in Commander status.",
    }]),
    requiresHumanDecision: 1,
    createdAt: 1_700_001_000,
    ...overrides,
  };
}

{
  const summary = await buildAiSummary(commanderRow(), { provider: localStubProvider, createdAt });
  assert.equal(summary.status, "RED", "summary uses Commander status unchanged");
  assert.equal(summary.severity, 5, "summary uses Commander severity unchanged");
}

{
  const summary = await buildAiSummary(commanderRow({ severity: 5 }), { provider: localStubProvider, createdAt });
  assert.equal(summary.severity, 5, "severity 5 remains severity 5");
  assert.match(summary.summaryText, /Severity: 5/, "summary text preserves severity 5");
}

{
  const parsed = commanderReportFromStoredRow(commanderRow({ evidenceJson: "[]" }));
  const summary = await buildAiSummary(commanderRow({ evidenceJson: "[]" }), { provider: localStubProvider, createdAt });
  assert.equal(parsed.evidence[0].sourceRowId, "evidence unavailable", "missing evidence parsed as evidence unavailable");
  assert.match(summary.summaryText, /evidence unavailable/i, "missing evidence remains evidence unavailable");
}

{
  const summary = await buildAiSummary(commanderRow(), { provider: localStubProvider, createdAt });
  for (const action of actions) {
    assert.equal(summary.recommendedActionsText.includes(action), true, "recommended actions are copied");
  }
  assert.equal(summary.recommendedActionsText.includes("send transaction"), false, "recommended actions are not invented");
}

{
  const first = await buildAiSummary(commanderRow(), { provider: localStubProvider, createdAt });
  const second = await buildAiSummary(commanderRow(), { provider: localStubProvider, createdAt });
  assert.deepEqual(first, second, "same Commander input gives same summary output");
}

{
  const originalFetch = globalThis.fetch;
  let fetchCount = 0;
  globalThis.fetch = async () => {
    fetchCount += 1;
    throw new Error("fetch should not be called by local_stub");
  };
  await buildAiSummary(commanderRow(), { provider: localStubProvider, createdAt });
  globalThis.fetch = originalFetch;
  assert.equal(fetchCount, 0, "local_stub makes no external API calls");
}

{
  const summary = await buildAiSummary(commanderRow(), { provider: localStubProvider, createdAt });
  assert.equal(summary.commanderReportId, commanderReportId, "summary stores commanderReportId");
  assert.equal(typeof summary.inputHash, "string", "summary stores inputHash");
  assert.equal(typeof summary.outputHash, "string", "summary stores outputHash");
  assert.equal(summary.inputHash.length, 64, "inputHash is sha256 hex");
  assert.equal(summary.outputHash.length, 64, "outputHash is sha256 hex");
}

console.log("Seeded AI summarizer tests passed.");

