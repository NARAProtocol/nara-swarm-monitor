export type CommanderRow = Record<string, unknown>;

export type CommanderInputs = {
  open_alerts: CommanderRow[];
  critical_alerts: CommanderRow[];
  protocol_risk_summary: CommanderRow[];
  wallet_risk_ranking: CommanderRow[];
  wallet_conviction_ranking: CommanderRow[];
  wallet_position_summary: CommanderRow[];
  wallet_unlock_risk: CommanderRow[];
  position_current_state: CommanderRow[];
  unlock_cliffs_24h: CommanderRow[];
  unlock_cliffs_7d: CommanderRow[];
  admin_alert_summary: CommanderRow[];
  treasury_alert_summary: CommanderRow[];
  router_alert_summary: CommanderRow[];
  failed_tx_recent: CommanderRow[];
  failed_tx_admin_risk: CommanderRow[];
  failed_tx_spikes: CommanderRow[];
  failed_tx_alert_summary: CommanderRow[];
};

export type CommanderEvidence = {
  id: string;
  source: string;
  sourceRowId: string;
  txHash: string | null;
  wallet: string | null;
  positionId: string | null;
  tokenId: string | null;
  amount: string | null;
  observedValue: string | null;
  thresholdValue: string | null;
  note: string;
};

function value(row: CommanderRow, key: string): string | null {
  const entry = row[key];
  if (entry === undefined || entry === null || entry === "") return null;
  return String(entry);
}

function rowId(row: CommanderRow, fallback: string): string {
  return value(row, "id")
    ?? value(row, "sourceRowId")
    ?? value(row, "txHash")
    ?? value(row, "wallet")
    ?? value(row, "positionId")
    ?? value(row, "tokenId")
    ?? fallback;
}

function evidenceFromRow(source: string, row: CommanderRow, note: string, fallback: string): CommanderEvidence {
  const sourceRowId = rowId(row, fallback);
  return {
    id: `${source}:${sourceRowId}`,
    source,
    sourceRowId,
    txHash: value(row, "txHash"),
    wallet: value(row, "wallet"),
    positionId: value(row, "positionId"),
    tokenId: value(row, "tokenId"),
    amount: value(row, "amount"),
    observedValue: value(row, "observedValue"),
    thresholdValue: value(row, "thresholdValue"),
    note,
  };
}

function severity(row: CommanderRow): number {
  const entry = row.severity;
  return typeof entry === "number" ? entry : Number(entry ?? 0);
}

function sortBySeverity(rows: CommanderRow[]): CommanderRow[] {
  return [...rows].sort((a, b) => {
    const severityDelta = severity(b) - severity(a);
    if (severityDelta !== 0) return severityDelta;
    const bLastSeen = Number(b.lastSeenAt ?? b.timestamp ?? b.updatedAt ?? 0);
    const aLastSeen = Number(a.lastSeenAt ?? a.timestamp ?? a.updatedAt ?? 0);
    if (bLastSeen !== aLastSeen) return bLastSeen - aLastSeen;
    return rowId(a, "").localeCompare(rowId(b, ""));
  });
}

export function buildCommanderEvidence(inputs: CommanderInputs): CommanderEvidence[] {
  const evidence: CommanderEvidence[] = [];
  const severeAlerts = sortBySeverity(inputs.open_alerts.filter((row) => severity(row) >= 3));
  const criticalAlerts = sortBySeverity(inputs.critical_alerts);

  for (const row of criticalAlerts) {
    evidence.push(evidenceFromRow("critical_alerts", row, "Open severity 5 alert included in Commander status.", "critical-alert"));
  }

  for (const row of severeAlerts) {
    if (severity(row) === 5 && criticalAlerts.some((critical) => rowId(critical, "") === rowId(row, ""))) continue;
    evidence.push(evidenceFromRow("open_alerts", row, "Open severity 3+ alert included in Commander status.", "open-alert"));
  }

  for (const row of inputs.wallet_risk_ranking.slice(0, 3)) {
    evidence.push(evidenceFromRow("wallet_risk_ranking", row, "Top wallet risk row included in wallet activity.", "wallet-risk"));
  }

  for (const row of inputs.unlock_cliffs_24h.slice(0, 3)) {
    evidence.push(evidenceFromRow("unlock_cliffs_24h", row, "Upcoming 24h unlock cliff included in position health.", "unlock-24h"));
  }

  for (const row of inputs.unlock_cliffs_7d.slice(0, 3)) {
    evidence.push(evidenceFromRow("unlock_cliffs_7d", row, "Upcoming 7d unlock cliff included in position health.", "unlock-7d"));
  }

  for (const row of inputs.failed_tx_spikes.slice(0, 3)) {
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

