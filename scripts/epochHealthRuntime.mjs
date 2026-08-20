export const ENGINE_JIT_EPOCH_LIMIT = 8n;

export function parseBacklogLimit(raw = "1") {
  if (!/^\d+$/.test(String(raw))) {
    throw new Error("V4_MAX_EPOCH_BACKLOG must be a non-negative integer");
  }
  return BigInt(raw);
}

export function classifyEpochHealth(currentEpoch, settledEpoch, maxBacklog = 1n) {
  const current = BigInt(currentEpoch);
  const settled = BigInt(settledEpoch);
  const maximum = BigInt(maxBacklog);
  if (current < settled) throw new Error("settled epoch cannot exceed current epoch");
  if (maximum < 0n) throw new Error("maximum backlog cannot be negative");

  const backlog = current - settled;
  if (backlog > ENGINE_JIT_EPOCH_LIMIT) {
    return { status: "RED", severity: 5, backlog, currentEpoch: current, settledEpoch: settled, maxBacklog: maximum };
  }
  if (backlog > maximum) {
    return { status: "YELLOW", severity: 4, backlog, currentEpoch: current, settledEpoch: settled, maxBacklog: maximum };
  }
  return { status: "GREEN", severity: 1, backlog, currentEpoch: current, settledEpoch: settled, maxBacklog: maximum };
}

export function buildEpochHealthReport(health, { chainId, blockNumber, engineAddress, createdAt }) {
  const sourceReportId = `epoch-health:${chainId}:${blockNumber}`;
  const summary = health.status === "RED"
    ? `Engine backlog is ${health.backlog} epochs, beyond the ${ENGINE_JIT_EPOCH_LIMIT}-epoch JIT limit; user mutations can revert EpochStale.`
    : health.status === "YELLOW"
      ? `Engine backlog is ${health.backlog} epochs, above the operator tolerance of ${health.maxBacklog}.`
      : `Engine backlog is within the operator tolerance at ${health.backlog} epoch(s).`;

  return {
    reportType: "epoch_health",
    reportId: sourceReportId,
    chainId,
    status: health.status,
    severity: health.severity,
    title: "NARA v4 engine epoch health",
    payload: {
      status: health.status,
      severity: health.severity,
      title: "NARA v4 engine epoch health",
      summary,
      mainEvent: "epoch_backlog_above_jit_limit",
      recommendedActions: health.status === "GREEN"
        ? []
        : ["Run the reviewed permissionless epoch maintainer and verify the backlog returns within tolerance."],
      evidence: [{
        source: "direct_base_state",
        chainId,
        blockNumber: String(blockNumber),
        engineAddress,
        currentEpoch: health.currentEpoch.toString(),
        settledEpoch: health.settledEpoch.toString(),
        backlog: health.backlog.toString(),
        operatorTolerance: health.maxBacklog.toString(),
        jitLimit: ENGINE_JIT_EPOCH_LIMIT.toString(),
      }],
      createdAt,
      sourceReportId,
    },
  };
}
