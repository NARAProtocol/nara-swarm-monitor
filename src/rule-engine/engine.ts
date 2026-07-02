import { alerts } from "ponder:schema";
import {
  type AlertEvidence,
  alertIdFor,
  normalizeFingerprint,
} from "./alertDedup";
import { type AlertRuleId, getAlertRule } from "./rules";

export type EmitAlertInput = AlertEvidence & {
  ruleId: AlertRuleId;
  fingerprintParts: Array<string | number | bigint | null | undefined>;
  description?: string;
  timestamp: number;
};

function fingerprintFor(ruleId: string, parts: Array<string | number | bigint | null | undefined>): string {
  return normalizeFingerprint([ruleId, ...parts.map((part) => String(part ?? "unknown"))].join(":"));
}

export async function emitAlert(db: any, input: EmitAlertInput) {
  const rule = getAlertRule(input.ruleId);
  const fingerprint = fingerprintFor(rule.ruleId, input.fingerprintParts);
  const id = alertIdFor(Number(process.env.CHAIN_ID || "8453"), fingerprint, "open");

  await db.insert(alerts).values({
    id,
    fingerprint,
    severity: rule.severity,
    ruleId: rule.ruleId,
    title: rule.title,
    description: input.description ?? rule.description,
    status: "open",
    txHash: input.txHash ?? null,
    blockNumber: input.blockNumber ?? null,
    wallet: input.wallet ? input.wallet.toLowerCase() : null,
    positionId: input.positionId ?? null,
    tokenId: input.tokenId ?? null,
    amount: input.amount ?? null,
    viewName: input.viewName ?? null,
    sourceTable: input.sourceTable ?? null,
    sourceRowId: input.sourceRowId ?? null,
    observedValue: input.observedValue ?? null,
    thresholdValue: input.thresholdValue ?? null,
    firstSeenAt: input.timestamp,
    lastSeenAt: input.timestamp,
    occurrenceCount: 1,
    resolvedAt: null,
    resolutionNote: null,
  }).onConflictDoUpdate((row: any) => ({
    severity: rule.severity,
    title: rule.title,
    description: input.description ?? row.description,
    status: "open",
    txHash: input.txHash ?? row.txHash,
    blockNumber: input.blockNumber ?? row.blockNumber,
    wallet: input.wallet ? input.wallet.toLowerCase() : row.wallet,
    positionId: input.positionId ?? row.positionId,
    tokenId: input.tokenId ?? row.tokenId,
    amount: input.amount ?? row.amount,
    viewName: input.viewName ?? row.viewName,
    sourceTable: input.sourceTable ?? row.sourceTable,
    sourceRowId: input.sourceRowId ?? row.sourceRowId,
    observedValue: input.observedValue ?? row.observedValue,
    thresholdValue: input.thresholdValue ?? row.thresholdValue,
    lastSeenAt: input.timestamp,
    occurrenceCount: row.occurrenceCount + 1,
    resolvedAt: null,
    resolutionNote: null,
  }));
}

export async function resolveAlert(db: any, fingerprint: string, timestamp: number, resolutionNote: string) {
  const openId = alertIdFor(Number(process.env.CHAIN_ID || "8453"), fingerprint, "open");
  const existing = await db.find(alerts, { id: openId });
  if (!existing) return;

  await db.update(alerts, { id: openId }).set({
    status: "resolved",
    lastSeenAt: timestamp,
    resolvedAt: timestamp,
    resolutionNote,
  });
}
