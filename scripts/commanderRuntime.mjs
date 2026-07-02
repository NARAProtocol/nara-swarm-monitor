import superjson from "superjson";

export const COMMANDER_VIEW_NAMES = [
  "open_alerts",
  "critical_alerts",
  "protocol_risk_summary",
  "wallet_risk_ranking",
  "wallet_conviction_ranking",
  "wallet_position_summary",
  "wallet_unlock_risk",
  "position_current_state",
  "unlock_cliffs_24h",
  "unlock_cliffs_7d",
  "admin_alert_summary",
  "treasury_alert_summary",
  "router_alert_summary",
  "failed_tx_recent",
  "failed_tx_admin_risk",
  "failed_tx_spikes",
  "failed_tx_alert_summary",
];

export const DEFAULT_COMMANDER_INPUTS = Object.fromEntries(
  COMMANDER_VIEW_NAMES.map((viewName) => [viewName, []]),
);

const DEFAULT_LIMITS = {
  open_alerts: 100,
  critical_alerts: 50,
  protocol_risk_summary: 1,
  wallet_risk_ranking: 25,
  wallet_conviction_ranking: 25,
  wallet_position_summary: 50,
  wallet_unlock_risk: 50,
  position_current_state: 50,
  unlock_cliffs_24h: 50,
  unlock_cliffs_7d: 50,
  admin_alert_summary: 50,
  treasury_alert_summary: 50,
  router_alert_summary: 50,
  failed_tx_recent: 50,
  failed_tx_admin_risk: 50,
  failed_tx_spikes: 50,
  failed_tx_alert_summary: 50,
};

function toNumber(value, fallback = 0) {
  const parsed = Number(value ?? fallback);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function severity(row) {
  return toNumber(row.severity);
}

function rowValue(row, key) {
  const entry = row[key];
  if (entry === undefined || entry === null || entry === "") return null;
  return String(entry);
}

function rowId(row, fallback) {
  return rowValue(row, "id")
    ?? rowValue(row, "sourceRowId")
    ?? rowValue(row, "txHash")
    ?? rowValue(row, "wallet")
    ?? rowValue(row, "positionId")
    ?? rowValue(row, "tokenId")
    ?? fallback;
}

function sortRows(rows, orderField = "lastSeenAt") {
  return [...rows].sort((a, b) => {
    const severityDelta = severity(b) - severity(a);
    if (severityDelta !== 0) return severityDelta;
    const timeDelta = toNumber(b[orderField] ?? b.timestamp ?? b.updatedAt) - toNumber(a[orderField] ?? a.timestamp ?? a.updatedAt);
    if (timeDelta !== 0) return timeDelta;
    return rowId(a, "").localeCompare(rowId(b, ""));
  });
}

function determineStatus(openAlerts, criticalAlerts) {
  if (criticalAlerts.length > 0 || openAlerts.some((row) => severity(row) === 5)) return "RED";
  if (openAlerts.some((row) => severity(row) === 3 || severity(row) === 4)) return "YELLOW";
  return "GREEN";
}

function evidenceFromRow(source, row, note, fallback) {
  const sourceRowId = rowId(row, fallback);
  return {
    id: `${source}:${sourceRowId}`,
    source,
    sourceRowId,
    txHash: rowValue(row, "txHash"),
    wallet: rowValue(row, "wallet"),
    positionId: rowValue(row, "positionId"),
    tokenId: rowValue(row, "tokenId"),
    amount: rowValue(row, "amount"),
    observedValue: rowValue(row, "observedValue"),
    thresholdValue: rowValue(row, "thresholdValue"),
    note,
  };
}

export function buildCommanderEvidence(inputs) {
  const evidence = [];
  const severeAlerts = sortRows((inputs.open_alerts ?? []).filter((row) => severity(row) >= 3));
  const criticalAlerts = sortRows(inputs.critical_alerts ?? []);

  for (const row of criticalAlerts) {
    evidence.push(evidenceFromRow("critical_alerts", row, "Open severity 5 alert included in Commander status.", "critical-alert"));
  }

  for (const row of severeAlerts) {
    if (severity(row) === 5 && criticalAlerts.some((critical) => rowId(critical, "") === rowId(row, ""))) continue;
    evidence.push(evidenceFromRow("open_alerts", row, "Open severity 3+ alert included in Commander status.", "open-alert"));
  }

  for (const row of (inputs.wallet_risk_ranking ?? []).slice(0, 3)) {
    evidence.push(evidenceFromRow("wallet_risk_ranking", row, "Top wallet risk row included in wallet activity.", "wallet-risk"));
  }

  for (const row of (inputs.unlock_cliffs_24h ?? []).slice(0, 3)) {
    evidence.push(evidenceFromRow("unlock_cliffs_24h", row, "Upcoming 24h unlock cliff included in position health.", "unlock-24h"));
  }

  for (const row of (inputs.unlock_cliffs_7d ?? []).slice(0, 3)) {
    evidence.push(evidenceFromRow("unlock_cliffs_7d", row, "Upcoming 7d unlock cliff included in position health.", "unlock-7d"));
  }

  for (const row of (inputs.failed_tx_spikes ?? []).slice(0, 3)) {
    evidence.push(evidenceFromRow("failed_tx_spikes", row, "Failed transaction spike included in failed transaction activity.", "failed-spike"));
  }

  if (evidence.length === 0) {
    evidence.push({
      id: "commander:evidence-unavailable",
      source: "commander",
      sourceRowId: "evidence unavailable",
      txHash: null,
      wallet: null,
      positionId: null,
      tokenId: null,
      amount: null,
      observedValue: null,
      thresholdValue: null,
      note: "No severity 3+ alerts, wallet risk rows, unlock cliffs, or failed transaction spikes were available.",
    });
  }

  return evidence;
}

function recommendedActionsFor(status, inputs) {
  if (status === "RED") {
    return [
      "Review open severity 5 alerts and confirm whether incident response or break-glass review is required.",
      "Review admin, treasury, router, and failed transaction evidence before any new operational changes.",
      "Keep Commander v1 read-only; no protocol transactions are authorized by this report.",
    ];
  }

  if (status === "YELLOW") {
    const actions = [
      "Review severity 3 and 4 alerts and confirm whether they are expected launch activity or user friction.",
      "Check wallet risk, unlock cliffs, and failed transaction spikes before escalating.",
    ];
    if ((inputs.unlock_cliffs_24h ?? []).length > 0 || (inputs.unlock_cliffs_7d ?? []).length > 0) {
      actions.push("Review upcoming unlock cliffs and affected wallets.");
    }
    if ((inputs.failed_tx_spikes ?? []).length > 0) {
      actions.push("Review repeated failed transactions for UX friction or suspicious attempts.");
    }
    return actions;
  }

  return [
    "Continue monitoring open alerts, wallet concentration, unlock cliffs, router activity, and failed transactions.",
    "No human decision is required by Commander v1 at this severity level.",
  ];
}

function mainEventFor(status, severeAlerts) {
  if (status === "GREEN") return "No severity 3+ alerts are currently open.";
  const main = sortRows(severeAlerts)[0];
  if (!main) return "Evidence unavailable.";
  return `${String(main.ruleId ?? "alert")}: ${String(main.title ?? "Open alert")}`;
}

export function buildCommanderReport(rawInputs, options = {}) {
  const inputs = { ...DEFAULT_COMMANDER_INPUTS, ...rawInputs };
  const chainId = options.chainId ?? Number(process.env.CHAIN_ID || "8453");
  const createdAt = options.createdAt ?? Math.floor(Date.now() / 1000);
  const criticalAlerts = sortRows(inputs.critical_alerts ?? []);
  const severeAlerts = sortRows((inputs.open_alerts ?? []).filter((row) => severity(row) >= 3));
  const status = determineStatus(inputs.open_alerts ?? [], criticalAlerts);
  const severityValue = status === "GREEN" ? 0 : severeAlerts.reduce((max, row) => Math.max(max, severity(row)), 0);
  const protocolRisk = (inputs.protocol_risk_summary ?? [])[0] ?? {};
  const evidence = buildCommanderEvidence(inputs);

  const protocolActivity = {
    sourceViews: ["protocol_risk_summary", "open_alerts", "critical_alerts"],
    openAlertCount: toNumber(protocolRisk.openAlertCount, (inputs.open_alerts ?? []).length),
    criticalAlertCount: toNumber(protocolRisk.criticalAlertCount, criticalAlerts.length),
    severity4AlertCount: toNumber(protocolRisk.severity4AlertCount),
    severity3AlertCount: toNumber(protocolRisk.severity3AlertCount),
    maxSeverity: toNumber(protocolRisk.maxSeverity, severityValue),
    totalOccurrences: toNumber(protocolRisk.totalOccurrences),
    latestSevereAlerts: severeAlerts.slice(0, 5),
  };

  const walletActivity = {
    sourceViews: ["wallet_risk_ranking", "wallet_conviction_ranking", "wallet_position_summary", "wallet_unlock_risk"],
    topRiskWallets: (inputs.wallet_risk_ranking ?? []).slice(0, 5),
    topConvictionWallets: (inputs.wallet_conviction_ranking ?? []).slice(0, 5),
    walletPositionSummaryRows: (inputs.wallet_position_summary ?? []).length,
    walletUnlockRiskRows: (inputs.wallet_unlock_risk ?? []).length,
  };

  const positionActivity = {
    sourceViews: ["position_current_state", "unlock_cliffs_24h", "unlock_cliffs_7d"],
    sampledPositions: (inputs.position_current_state ?? []).length,
    unlockCliffs24hCount: (inputs.unlock_cliffs_24h ?? []).length,
    unlockCliffs7dCount: (inputs.unlock_cliffs_7d ?? []).length,
    unlockCliffs24h: (inputs.unlock_cliffs_24h ?? []).slice(0, 5),
    unlockCliffs7d: (inputs.unlock_cliffs_7d ?? []).slice(0, 5),
  };

  const adminActivity = {
    sourceViews: ["admin_alert_summary"],
    alertSummary: inputs.admin_alert_summary ?? [],
  };
  const treasuryActivity = {
    sourceViews: ["treasury_alert_summary"],
    alertSummary: inputs.treasury_alert_summary ?? [],
  };
  const routerActivity = {
    sourceViews: ["router_alert_summary"],
    alertSummary: inputs.router_alert_summary ?? [],
  };
  const failedTxActivity = {
    sourceViews: ["failed_tx_recent", "failed_tx_admin_risk", "failed_tx_spikes", "failed_tx_alert_summary"],
    recentFailures: (inputs.failed_tx_recent ?? []).slice(0, 10),
    adminRiskFailures: (inputs.failed_tx_admin_risk ?? []).slice(0, 10),
    failedTxSpikes: (inputs.failed_tx_spikes ?? []).slice(0, 10),
    alertSummary: inputs.failed_tx_alert_summary ?? [],
  };

  const riskSummary = {
    status,
    severity: severityValue,
    statusLogic: "RED if any open severity 5 alert exists; YELLOW if any open severity 3 or 4 alert exists; GREEN otherwise.",
    severeAlertCount: severeAlerts.length,
    criticalAlertCount: criticalAlerts.length,
    requiresHumanDecision: status === "RED",
  };

  const summary = `${status}: ${protocolActivity.openAlertCount} open alerts, ${protocolActivity.criticalAlertCount} critical alerts, ${(inputs.failed_tx_spikes ?? []).length} failed transaction spike rows, ${(inputs.unlock_cliffs_24h ?? []).length} 24h unlock cliff rows.`;

  return {
    id: `${chainId}-${createdAt}-commander-v1`,
    chainId,
    status,
    severity: severityValue,
    title: `NARA Commander v1 ${status}`,
    summary,
    mainEvent: mainEventFor(status, severeAlerts),
    protocolActivity,
    walletActivity,
    positionActivity,
    adminActivity,
    treasuryActivity,
    routerActivity,
    failedTxActivity,
    riskSummary,
    recommendedActions: recommendedActionsFor(status, inputs),
    evidence,
    requiresHumanDecision: status === "RED",
    createdAt,
  };
}

export function commanderReportToRow(report) {
  return {
    id: report.id,
    chainId: report.chainId,
    status: report.status,
    severity: report.severity,
    title: report.title,
    summary: report.summary,
    mainEvent: report.mainEvent,
    protocolActivityJson: JSON.stringify(report.protocolActivity),
    walletActivityJson: JSON.stringify(report.walletActivity),
    positionActivityJson: JSON.stringify(report.positionActivity),
    adminActivityJson: JSON.stringify(report.adminActivity),
    treasuryActivityJson: JSON.stringify(report.treasuryActivity),
    routerActivityJson: JSON.stringify(report.routerActivity),
    failedTxActivityJson: JSON.stringify(report.failedTxActivity),
    riskSummaryJson: JSON.stringify(report.riskSummary),
    recommendedActionsJson: JSON.stringify(report.recommendedActions),
    evidenceJson: JSON.stringify(report.evidence),
    requiresHumanDecision: report.requiresHumanDecision ? 1 : 0,
    createdAt: report.createdAt,
  };
}

export function formatCommanderReport(report) {
  const actions = report.recommendedActions.map((action) => `- ${action}`).join("\n");
  const evidence = report.evidence.slice(0, 12).map((item) => `- ${item.source} ${item.sourceRowId}: ${item.note}`).join("\n");

  return [
    `Status: ${report.status}`,
    `Main event: ${report.mainEvent}`,
    "",
    `Protocol activity: ${report.summary}`,
    `Wallet activity: ${JSON.stringify(report.walletActivity)}`,
    `Position health: ${JSON.stringify(report.positionActivity)}`,
    `Admin and router activity: ${JSON.stringify({ admin: report.adminActivity, router: report.routerActivity })}`,
    `Treasury activity: ${JSON.stringify(report.treasuryActivity)}`,
    `Failed transaction activity: ${JSON.stringify(report.failedTxActivity)}`,
    `Risk summary: ${JSON.stringify(report.riskSummary)}`,
    "",
    "Recommended next actions:",
    actions,
    "",
    `Decision required: ${report.requiresHumanDecision ? "yes" : "no"}`,
    "",
    "Evidence list:",
    evidence,
  ].join("\n");
}

export async function readCommanderInputs(reader) {
  const entries = await Promise.all(
    COMMANDER_VIEW_NAMES.map(async (viewName) => [
      viewName,
      await reader.readView(viewName, DEFAULT_LIMITS[viewName]),
    ]),
  );
  return Object.fromEntries(entries);
}

export async function generateCommanderReport(reader, options = {}) {
  const inputs = await readCommanderInputs(reader);
  return buildCommanderReport(inputs, options);
}

export function createPonderSqlCommanderReader(baseUrl = (process.env.COMMANDER_SQL_URL || "http://localhost:42069/sql").replace(/\/$/, "")) {
  return {
    async readView(viewName, limit) {
      if (!COMMANDER_VIEW_NAMES.includes(viewName)) throw new Error(`Unsupported Commander view: ${viewName}`);
      const query = encodeURIComponent(superjson.stringify({ sql: `select * from ${viewName} limit ${Math.max(1, Math.min(limit, 250))}` }));
      const response = await fetch(`${baseUrl}/db?sql=${query}`);
      if (!response.ok) throw new Error(`Ponder SQL query failed (${response.status}): ${await response.text()}`);
      const body = await response.json();
      if (Array.isArray(body)) return body;
      if (Array.isArray(body?.rows)) return body.rows;
      if (Array.isArray(body?.result?.rows)) return body.result.rows;
      return [];
    },
  };
}

