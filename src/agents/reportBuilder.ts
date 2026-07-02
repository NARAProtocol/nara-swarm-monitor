import {
  buildCommanderEvidence,
  type CommanderEvidence,
  type CommanderInputs,
  type CommanderRow,
} from "./evidence";

export type CommanderStatus = "GREEN" | "YELLOW" | "RED";

export type CommanderReport = {
  id: string;
  chainId: number;
  status: CommanderStatus;
  severity: number;
  title: string;
  summary: string;
  mainEvent: string;
  protocolActivity: Record<string, unknown>;
  walletActivity: Record<string, unknown>;
  positionActivity: Record<string, unknown>;
  adminActivity: Record<string, unknown>;
  treasuryActivity: Record<string, unknown>;
  routerActivity: Record<string, unknown>;
  failedTxActivity: Record<string, unknown>;
  riskSummary: Record<string, unknown>;
  recommendedActions: string[];
  evidence: CommanderEvidence[];
  requiresHumanDecision: boolean;
  createdAt: number;
};

export type CommanderReportRow = {
  id: string;
  chainId: number;
  status: string;
  severity: number;
  title: string;
  summary: string;
  mainEvent: string;
  protocolActivityJson: string;
  walletActivityJson: string;
  positionActivityJson: string;
  adminActivityJson: string;
  treasuryActivityJson: string;
  routerActivityJson: string;
  failedTxActivityJson: string;
  riskSummaryJson: string;
  recommendedActionsJson: string;
  evidenceJson: string;
  requiresHumanDecision: number;
  createdAt: number;
};

function toNumber(value: unknown, fallback = 0): number {
  const parsed = Number(value ?? fallback);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function severity(row: CommanderRow): number {
  return toNumber(row.severity);
}

function maxSeverity(rows: CommanderRow[]): number {
  return rows.reduce((max, row) => Math.max(max, severity(row)), 0);
}

function rowId(row: CommanderRow, fallback: string): string {
  const id = row.id ?? row.sourceRowId ?? row.txHash ?? row.wallet ?? row.positionId ?? row.tokenId ?? fallback;
  return String(id);
}

function sortRows(rows: CommanderRow[], orderField = "lastSeenAt"): CommanderRow[] {
  return [...rows].sort((a, b) => {
    const severityDelta = severity(b) - severity(a);
    if (severityDelta !== 0) return severityDelta;
    const timeDelta = toNumber(b[orderField] ?? b.timestamp ?? b.updatedAt) - toNumber(a[orderField] ?? a.timestamp ?? a.updatedAt);
    if (timeDelta !== 0) return timeDelta;
    return rowId(a, "").localeCompare(rowId(b, ""));
  });
}

function determineStatus(openAlerts: CommanderRow[], criticalAlerts: CommanderRow[]): CommanderStatus {
  if (criticalAlerts.length > 0 || openAlerts.some((row) => severity(row) === 5)) return "RED";
  if (openAlerts.some((row) => severity(row) === 3 || severity(row) === 4)) return "YELLOW";
  return "GREEN";
}

function mainEventFor(status: CommanderStatus, severeAlerts: CommanderRow[]): string {
  if (status === "GREEN") return "No severity 3+ alerts are currently open.";
  const main = sortRows(severeAlerts)[0];
  if (!main) return "Evidence unavailable.";
  return `${String(main.ruleId ?? "alert")}: ${String(main.title ?? "Open alert")}`;
}

function protocolRiskRow(inputs: CommanderInputs): CommanderRow {
  return inputs.protocol_risk_summary[0] ?? {};
}

function recommendedActionsFor(status: CommanderStatus, inputs: CommanderInputs): string[] {
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
    if (inputs.unlock_cliffs_24h.length > 0 || inputs.unlock_cliffs_7d.length > 0) {
      actions.push("Review upcoming unlock cliffs and affected wallets.");
    }
    if (inputs.failed_tx_spikes.length > 0) {
      actions.push("Review repeated failed transactions for UX friction or suspicious attempts.");
    }
    return actions;
  }

  return [
    "Continue monitoring open alerts, wallet concentration, unlock cliffs, router activity, and failed transactions.",
    "No human decision is required by Commander v1 at this severity level.",
  ];
}

export function buildCommanderReport(
  inputs: CommanderInputs,
  options: { chainId?: number; createdAt?: number } = {},
): CommanderReport {
  const chainId = options.chainId ?? Number(process.env.CHAIN_ID || "8453");
  const createdAt = options.createdAt ?? Math.floor(Date.now() / 1000);
  const criticalAlerts = sortRows(inputs.critical_alerts);
  const severeAlerts = sortRows(inputs.open_alerts.filter((row) => severity(row) >= 3));
  const status = determineStatus(inputs.open_alerts, criticalAlerts);
  const severityValue = status === "GREEN" ? 0 : maxSeverity(severeAlerts);
  const protocolRisk = protocolRiskRow(inputs);
  const mainEvent = mainEventFor(status, severeAlerts);
  const evidence = buildCommanderEvidence(inputs);

  const protocolActivity = {
    sourceViews: ["protocol_risk_summary", "open_alerts", "critical_alerts"],
    openAlertCount: toNumber(protocolRisk.openAlertCount, inputs.open_alerts.length),
    criticalAlertCount: toNumber(protocolRisk.criticalAlertCount, criticalAlerts.length),
    severity4AlertCount: toNumber(protocolRisk.severity4AlertCount),
    severity3AlertCount: toNumber(protocolRisk.severity3AlertCount),
    maxSeverity: toNumber(protocolRisk.maxSeverity, severityValue),
    totalOccurrences: toNumber(protocolRisk.totalOccurrences),
    latestSevereAlerts: severeAlerts.slice(0, 5),
  };

  const walletActivity = {
    sourceViews: ["wallet_risk_ranking", "wallet_conviction_ranking", "wallet_position_summary", "wallet_unlock_risk"],
    topRiskWallets: inputs.wallet_risk_ranking.slice(0, 5),
    topConvictionWallets: inputs.wallet_conviction_ranking.slice(0, 5),
    walletPositionSummaryRows: inputs.wallet_position_summary.length,
    walletUnlockRiskRows: inputs.wallet_unlock_risk.length,
  };

  const positionActivity = {
    sourceViews: ["position_current_state", "unlock_cliffs_24h", "unlock_cliffs_7d"],
    sampledPositions: inputs.position_current_state.length,
    unlockCliffs24hCount: inputs.unlock_cliffs_24h.length,
    unlockCliffs7dCount: inputs.unlock_cliffs_7d.length,
    unlockCliffs24h: inputs.unlock_cliffs_24h.slice(0, 5),
    unlockCliffs7d: inputs.unlock_cliffs_7d.slice(0, 5),
  };

  const adminActivity = {
    sourceViews: ["admin_alert_summary"],
    alertSummary: inputs.admin_alert_summary,
  };

  const treasuryActivity = {
    sourceViews: ["treasury_alert_summary"],
    alertSummary: inputs.treasury_alert_summary,
  };

  const routerActivity = {
    sourceViews: ["router_alert_summary"],
    alertSummary: inputs.router_alert_summary,
  };

  const failedTxActivity = {
    sourceViews: ["failed_tx_recent", "failed_tx_admin_risk", "failed_tx_spikes", "failed_tx_alert_summary"],
    recentFailures: inputs.failed_tx_recent.slice(0, 10),
    adminRiskFailures: inputs.failed_tx_admin_risk.slice(0, 10),
    failedTxSpikes: inputs.failed_tx_spikes.slice(0, 10),
    alertSummary: inputs.failed_tx_alert_summary,
  };

  const riskSummary = {
    status,
    severity: severityValue,
    statusLogic: "RED if any open severity 5 alert exists; YELLOW if any open severity 3 or 4 alert exists; GREEN otherwise.",
    severeAlertCount: severeAlerts.length,
    criticalAlertCount: criticalAlerts.length,
    requiresHumanDecision: status === "RED",
  };

  const summary = `${status}: ${toNumber(protocolActivity.openAlertCount)} open alerts, ${toNumber(protocolActivity.criticalAlertCount)} critical alerts, ${inputs.failed_tx_spikes.length} failed transaction spike rows, ${inputs.unlock_cliffs_24h.length} 24h unlock cliff rows.`;

  return {
    id: `${chainId}-${createdAt}-commander-v1`,
    chainId,
    status,
    severity: severityValue,
    title: `NARA Commander v1 ${status}`,
    summary,
    mainEvent,
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

export function commanderReportToRow(report: CommanderReport): CommanderReportRow {
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

export function formatCommanderReport(report: CommanderReport): string {
  const actions = report.recommendedActions.map((action) => `- ${action}`).join("\n");
  const evidence = report.evidence.slice(0, 12).map((item) =>
    `- ${item.source} ${item.sourceRowId}: ${item.note}`,
  ).join("\n");

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

