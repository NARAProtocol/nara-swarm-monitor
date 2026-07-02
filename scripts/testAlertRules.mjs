import assert from "node:assert/strict";

const approvedOpsRouter = "0x1000000000000000000000000000000000000001";
const approvedBreakGlassSafe = "0x2000000000000000000000000000000000000002";
const unknownAdmin = "0x3000000000000000000000000000000000000003";
const whale = "0x4000000000000000000000000000000000000004";

const largeUnlock24hThreshold = 10_000n;
const largeUnlock7dThreshold = 25_000n;
const whaleThreshold = 100_000n;

const severityByRule = {
  direct_engine_admin_call_unapproved: 5,
  large_unlock_24h: 4,
  large_unlock_7d: 4,
  wallet_concentration_above_threshold: 4,
  nft_metadata_missing: 3,
};

function normalize(address) {
  return address.toLowerCase();
}

function callPathFor(caller) {
  const normalized = normalize(caller);
  if (normalized === approvedOpsRouter.toLowerCase()) return "ops_router";
  if (normalized === approvedBreakGlassSafe.toLowerCase()) return "break_glass";
  return "unknown_direct";
}

function alertIdFor(fingerprint, status = "open") {
  return `8453-${fingerprint.toLowerCase()}-${status}`;
}

function createAlert(ruleId, fingerprintParts, evidence = {}) {
  const fingerprint = [ruleId, ...fingerprintParts].join(":").toLowerCase();
  return {
    id: alertIdFor(fingerprint),
    fingerprint,
    ruleId,
    severity: severityByRule[ruleId],
    status: "open",
    occurrenceCount: 1,
    firstSeenAt: evidence.timestamp ?? 100,
    lastSeenAt: evidence.timestamp ?? 100,
    ...evidence,
  };
}

function upsertAlert(alerts, alert) {
  const existing = alerts.get(alert.fingerprint);
  if (!existing || existing.status !== "open") {
    alerts.set(alert.fingerprint, alert);
    return alert;
  }
  const updated = {
    ...existing,
    ...alert,
    id: existing.id,
    status: "open",
    firstSeenAt: existing.firstSeenAt,
    occurrenceCount: existing.occurrenceCount + 1,
    lastSeenAt: alert.lastSeenAt,
  };
  alerts.set(alert.fingerprint, updated);
  return updated;
}

function resolveAlert(alerts, fingerprint, timestamp, note) {
  const existing = alerts.get(fingerprint);
  if (!existing) return null;
  const resolved = {
    ...existing,
    id: alertIdFor(fingerprint, "resolved"),
    status: "resolved",
    lastSeenAt: timestamp,
    resolvedAt: timestamp,
    resolutionNote: note,
  };
  alerts.set(fingerprint, resolved);
  return resolved;
}

function directAdminAlert(caller) {
  if (callPathFor(caller) !== "unknown_direct") return null;
  return createAlert("direct_engine_admin_call_unapproved", ["TREASURY_ROLE", "withdrawTreasuryEthFees", normalize(caller)], {
    wallet: normalize(caller),
    txHash: "0xdirect",
    sourceTable: "direct_engine_admin_call_events",
  });
}

function unlockAlerts(wallet, amount, unlockWindowSeconds) {
  const alerts = [];
  if (unlockWindowSeconds <= 86_400 && amount >= largeUnlock24hThreshold) {
    alerts.push(createAlert("large_unlock_24h", [normalize(wallet)], {
      wallet: normalize(wallet),
      amount,
      viewName: "unlock_cliffs_24h",
      thresholdValue: largeUnlock24hThreshold.toString(),
    }));
  }
  if (unlockWindowSeconds <= 604_800 && amount >= largeUnlock7dThreshold) {
    alerts.push(createAlert("large_unlock_7d", [normalize(wallet)], {
      wallet: normalize(wallet),
      amount,
      viewName: "unlock_cliffs_7d",
      thresholdValue: largeUnlock7dThreshold.toString(),
    }));
  }
  return alerts;
}

function concentrationAlert(wallet, amount) {
  if (amount < whaleThreshold) return null;
  return createAlert("wallet_concentration_above_threshold", [normalize(wallet)], {
    wallet: normalize(wallet),
    amount,
    viewName: "wallet_exposure_summary",
    thresholdValue: whaleThreshold.toString(),
  });
}

function missingMetadataAlert(tokenId) {
  return createAlert("nft_metadata_missing", [tokenId], {
    tokenId,
    viewName: "nft_without_position_metadata",
    observedValue: "positionId:null",
  });
}

function criticalAlerts(alerts) {
  return [...alerts.values()].filter((alert) => alert.status === "open" && alert.severity === 5);
}

function walletAlertSummary(alerts) {
  const summary = new Map();
  for (const alert of alerts.values()) {
    if (!alert.wallet || alert.status !== "open") continue;
    const row = summary.get(alert.wallet) ?? {
      wallet: alert.wallet,
      openAlertCount: 0,
      criticalAlertCount: 0,
      maxSeverity: 0,
    };
    row.openAlertCount += 1;
    if (alert.severity === 5) row.criticalAlertCount += 1;
    row.maxSeverity = Math.max(row.maxSeverity, alert.severity);
    summary.set(alert.wallet, row);
  }
  return [...summary.values()];
}

{
  const alert = directAdminAlert(unknownAdmin);
  assert.equal(alert.severity, 5, "unknown direct admin call creates severity 5");
}

{
  const alert = directAdminAlert(approvedBreakGlassSafe);
  assert.equal(alert, null, "break glass direct call records but does not create severity 5");
}

{
  const [alert] = unlockAlerts(whale, largeUnlock24hThreshold, 86_400);
  assert.equal(alert.ruleId, "large_unlock_24h", "large 24h unlock creates severity 4");
  assert.equal(alert.severity, 4, "large 24h unlock severity is 4");
}

{
  const alerts = unlockAlerts(whale, largeUnlock7dThreshold, 604_800);
  assert.equal(alerts.some((alert) => alert.ruleId === "large_unlock_7d" && alert.severity === 4), true, "large 7d unlock creates severity 4");
}

{
  const alert = concentrationAlert(whale, whaleThreshold);
  assert.equal(alert.ruleId, "wallet_concentration_above_threshold", "wallet concentration creates severity 4");
  assert.equal(alert.severity, 4, "wallet concentration severity is 4");
}

{
  const alert = missingMetadataAlert("8453-7");
  assert.equal(alert.ruleId, "nft_metadata_missing", "missing NFT metadata creates severity 3");
  assert.equal(alert.severity, 3, "missing NFT metadata severity is 3");
}

{
  const alerts = new Map();
  const first = createAlert("large_unlock_24h", [whale], { wallet: normalize(whale), timestamp: 100 });
  const second = createAlert("large_unlock_24h", [whale], { wallet: normalize(whale), timestamp: 200 });
  upsertAlert(alerts, first);
  const updated = upsertAlert(alerts, second);
  assert.equal(updated.occurrenceCount, 2, "duplicate alert updates occurrence count");
  assert.equal(updated.lastSeenAt, 200, "duplicate alert updates lastSeenAt");
}

{
  const alerts = new Map();
  const alert = upsertAlert(alerts, createAlert("nft_metadata_missing", ["8453-9"], { timestamp: 100 }));
  const resolved = resolveAlert(alerts, alert.fingerprint, 300, "Metadata arrived");
  assert.equal(resolved.status, "resolved", "resolved condition marks alert resolved if implemented");
  assert.equal(resolved.resolutionNote, "Metadata arrived", "resolution note is preserved");
}

{
  const alerts = new Map();
  upsertAlert(alerts, directAdminAlert(unknownAdmin));
  upsertAlert(alerts, missingMetadataAlert("8453-10"));
  assert.equal(criticalAlerts(alerts).every((alert) => alert.severity === 5), true, "critical_alerts view returns only severity 5");
  assert.equal(criticalAlerts(alerts).length, 1, "critical_alerts filters lower severity");
}

{
  const alerts = new Map();
  upsertAlert(alerts, directAdminAlert(unknownAdmin));
  upsertAlert(alerts, createAlert("large_unlock_24h", [unknownAdmin], { wallet: normalize(unknownAdmin) }));
  const [summary] = walletAlertSummary(alerts);
  assert.equal(summary.wallet, normalize(unknownAdmin), "wallet_alert_summary groups by wallet");
  assert.equal(summary.openAlertCount, 2, "wallet_alert_summary counts grouped alerts");
  assert.equal(summary.criticalAlertCount, 1, "wallet_alert_summary counts critical grouped alerts");
}

console.log("Seeded deterministic alert rule tests passed.");
