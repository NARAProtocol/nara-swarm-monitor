export const ENGINE_JIT_EPOCH_LIMIT = 8n;
export const DEFAULT_CRITICAL_BACKLOG = 5n;

export function parseBacklogLimit(raw = "1") {
  if (!/^\d+$/.test(String(raw))) {
    throw new Error("V4_MAX_EPOCH_BACKLOG must be a non-negative integer");
  }
  return BigInt(raw);
}

export function parseCriticalBacklog(raw = "5") {
  if (!/^\d+$/.test(String(raw))) {
    throw new Error("V4_EPOCH_CRITICAL_BACKLOG must be an integer between 2 and 8");
  }
  const parsed = BigInt(raw);
  if (parsed < 2n || parsed > ENGINE_JIT_EPOCH_LIMIT) {
    throw new Error("V4_EPOCH_CRITICAL_BACKLOG must be an integer between 2 and 8");
  }
  return parsed;
}

export function classifyEpochHealth(
  currentEpoch,
  settledEpoch,
  maxBacklog = 1n,
  criticalBacklog = DEFAULT_CRITICAL_BACKLOG,
) {
  const current = BigInt(currentEpoch);
  const settled = BigInt(settledEpoch);
  const maximum = BigInt(maxBacklog);
  if (current < settled) throw new Error("settled epoch cannot exceed current epoch");
  if (maximum < 0n) throw new Error("maximum backlog cannot be negative");
  const critical = BigInt(criticalBacklog);
  if (critical < 2n || critical > ENGINE_JIT_EPOCH_LIMIT || maximum >= critical) {
    throw new Error("critical backlog must be between operator tolerance and the JIT limit");
  }

  const backlog = current - settled;
  if (backlog > ENGINE_JIT_EPOCH_LIMIT) {
    return { status: "RED", severity: 5, backlog, currentEpoch: current, settledEpoch: settled, maxBacklog: maximum, criticalBacklog: critical };
  }
  if (backlog >= critical) {
    return { status: "RED", severity: 5, backlog, currentEpoch: current, settledEpoch: settled, maxBacklog: maximum, criticalBacklog: critical };
  }
  if (backlog > maximum) {
    return { status: "YELLOW", severity: 4, backlog, currentEpoch: current, settledEpoch: settled, maxBacklog: maximum, criticalBacklog: critical };
  }
  return { status: "GREEN", severity: 1, backlog, currentEpoch: current, settledEpoch: settled, maxBacklog: maximum, criticalBacklog: critical };
}

export function buildEpochHealthReport(health, { chainId, blockNumber, engineAddress, createdAt }) {
  const sourceReportId = `epoch-health:${chainId}:${blockNumber}`;
  const writesBlocked = health.backlog > ENGINE_JIT_EPOCH_LIMIT;
  const mainEvent = health.status === "RED"
    ? writesBlocked ? "epoch_backlog_above_jit_limit" : "epoch_backlog_critical"
    : health.status === "YELLOW" ? "epoch_backlog_warning" : "epoch_backlog_healthy";
  const summary = health.status === "RED"
    ? writesBlocked
      ? `Engine backlog is ${health.backlog} epochs, beyond the ${ENGINE_JIT_EPOCH_LIMIT}-epoch JIT limit; user mutations can revert EpochStale.`
      : `Engine backlog is ${health.backlog} epochs, at the critical early-warning threshold of ${health.criticalBacklog}; writes become blocked above ${ENGINE_JIT_EPOCH_LIMIT}.`
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
      mainEvent,
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
        criticalThreshold: health.criticalBacklog.toString(),
        jitLimit: ENGINE_JIT_EPOCH_LIMIT.toString(),
      }],
      createdAt,
      sourceReportId,
    },
  };
}
