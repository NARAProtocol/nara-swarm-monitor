export type AlertStatus = "open" | "resolved";

export type AlertEvidence = {
  txHash?: string | null;
  blockNumber?: bigint | null;
  wallet?: string | null;
  positionId?: bigint | null;
  tokenId?: string | null;
  amount?: bigint | null;
  viewName?: string | null;
  sourceTable?: string | null;
  sourceRowId?: string | null;
  observedValue?: string | null;
  thresholdValue?: string | null;
};

export type AlertInput = AlertEvidence & {
  chainId: number;
  fingerprint: string;
  severity: number;
  ruleId: string;
  title: string;
  description: string;
  timestamp: number;
};

export type SeedAlert = AlertInput & {
  id: string;
  status: AlertStatus;
  firstSeenAt: number;
  lastSeenAt: number;
  occurrenceCount: number;
  resolvedAt?: number | null;
  resolutionNote?: string | null;
};

export function normalizeFingerprint(value: string): string {
  return value.trim().toLowerCase();
}

export function alertIdFor(chainId: number, fingerprint: string, status: AlertStatus = "open"): string {
  return `${chainId}-${normalizeFingerprint(fingerprint)}-${status}`;
}

export function makeOpenAlert(input: AlertInput): SeedAlert {
  return {
    ...input,
    id: alertIdFor(input.chainId, input.fingerprint, "open"),
    fingerprint: normalizeFingerprint(input.fingerprint),
    status: "open",
    firstSeenAt: input.timestamp,
    lastSeenAt: input.timestamp,
    occurrenceCount: 1,
    resolvedAt: null,
    resolutionNote: null,
  };
}

export function dedupSeedAlert(existing: SeedAlert | undefined, input: AlertInput): SeedAlert {
  if (!existing || existing.status !== "open") return makeOpenAlert(input);

  return {
    ...existing,
    ...input,
    id: existing.id,
    fingerprint: existing.fingerprint,
    status: "open",
    firstSeenAt: existing.firstSeenAt,
    lastSeenAt: input.timestamp,
    occurrenceCount: existing.occurrenceCount + 1,
    resolvedAt: null,
    resolutionNote: null,
  };
}

export function resolveSeedAlert(existing: SeedAlert, timestamp: number, note: string): SeedAlert {
  return {
    ...existing,
    id: alertIdFor(existing.chainId, existing.fingerprint, "resolved"),
    status: "resolved",
    lastSeenAt: timestamp,
    resolvedAt: timestamp,
    resolutionNote: note,
  };
}
