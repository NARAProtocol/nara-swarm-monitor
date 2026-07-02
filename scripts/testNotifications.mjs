import assert from "node:assert/strict";
import {
  buildNotificationReport,
  createConsoleNotifier,
  notifiersForEnv,
  routeNotification,
  sha256Hex,
} from "./notificationRuntime.mjs";

function commanderRow(overrides = {}) {
  return {
    id: "8453-1000-commander-v1",
    chainId: 8453,
    status: "RED",
    severity: 5,
    title: "NARA Commander v1 RED",
    summary: "RED: 1 open critical alert.",
    mainEvent: "unknown direct admin call",
    recommendedActionsJson: JSON.stringify(["Review severity 5 alert"]),
    evidenceJson: JSON.stringify([{ source: "critical_alerts", sourceRowId: "alert-1", txHash: "0xabc" }]),
    createdAt: 1000,
    ...overrides,
  };
}

function fakeNotifier(channel, options = {}) {
  return {
    channel,
    destination: options.destination ?? `${channel} test destination`,
    enabled: options.enabled ?? true,
    async send() {
      if (options.status === "failed") {
        return {
          channel,
          destination: options.destination ?? `${channel} test destination`,
          status: "failed",
          errorMessage: "seeded failure",
        };
      }
      return {
        channel,
        destination: options.destination ?? `${channel} test destination`,
        status: "success",
      };
    },
  };
}

async function testConsoleNotifySucceeds() {
  const lines = [];
  const report = buildNotificationReport(commanderRow());
  const deliveries = await routeNotification(report, {
    env: { NOTIFY_CHANNELS: "console" },
    notifiers: [createConsoleNotifier((line) => lines.push(line))],
    createdAt: 2000,
  });
  assert.equal(deliveries[0].status, "success");
  assert.equal(deliveries[0].channel, "console");
  assert.equal(lines.length, 1);
  assert.match(lines[0], /Status: RED/);
}

async function testRedReportNotifiesByDefault() {
  const report = buildNotificationReport(commanderRow());
  const deliveries = await routeNotification(report, {
    env: {},
    notifiers: [fakeNotifier("webhook")],
    createdAt: 2001,
  });
  assert.equal(deliveries[0].status, "success");
}

async function testYellowRespectsEnv() {
  const report = buildNotificationReport(commanderRow({ status: "YELLOW", severity: 4 }));
  const skipped = await routeNotification(report, {
    env: { NOTIFY_YELLOW: "false" },
    notifiers: [fakeNotifier("webhook")],
    createdAt: 2002,
  });
  assert.equal(skipped[0].status, "skipped");
  assert.match(skipped[0].errorMessage, /rule/i);

  const sent = await routeNotification(report, {
    env: { NOTIFY_YELLOW: "true" },
    notifiers: [fakeNotifier("webhook")],
    createdAt: 2003,
  });
  assert.equal(sent[0].status, "success");
}

async function testGreenRules() {
  const report = buildNotificationReport(commanderRow({
    status: "GREEN",
    severity: 0,
    title: "NARA Commander v1 GREEN",
    summary: "GREEN: no severity 3+ alerts.",
    mainEvent: "No severity 3+ alerts are currently open.",
  }));
  const skipped = await routeNotification(report, {
    env: { NOTIFY_GREEN: "false" },
    notifiers: [fakeNotifier("webhook")],
    createdAt: 2004,
  });
  assert.equal(skipped[0].status, "skipped");

  const sent = await routeNotification(report, {
    env: { NOTIFY_GREEN: "true" },
    notifiers: [fakeNotifier("webhook")],
    createdAt: 2005,
  });
  assert.equal(sent[0].status, "success");
}

async function testDuplicateDedupAndForce() {
  const report = buildNotificationReport(commanderRow());
  const payloadHash = sha256Hex(report.payload);
  const previousDeliveries = [{
    id: "previous",
    chainId: 8453,
    reportType: "commander",
    reportId: report.reportId,
    channel: "webhook",
    status: "success",
    destination: "webhook test destination",
    payloadHash,
    errorMessage: null,
    sentAt: 1999,
    createdAt: 1999,
  }];
  const skipped = await routeNotification(report, {
    env: {},
    previousDeliveries,
    notifiers: [fakeNotifier("webhook")],
    createdAt: 2006,
  });
  assert.equal(skipped[0].status, "skipped");
  assert.match(skipped[0].errorMessage, /duplicate/i);

  const sent = await routeNotification(report, {
    env: { FORCE_NOTIFY: "true" },
    previousDeliveries,
    notifiers: [fakeNotifier("webhook")],
    createdAt: 2007,
  });
  assert.equal(sent[0].status, "success");
}

async function testDisabledOptionalChannels() {
  const report = buildNotificationReport(commanderRow());
  const webhook = await routeNotification(report, {
    env: { NOTIFY_CHANNELS: "webhook" },
    notifiers: notifiersForEnv({ NOTIFY_CHANNELS: "webhook" }).filter((notifier) => notifier.channel === "webhook"),
    createdAt: 2008,
  });
  assert.equal(webhook[0].channel, "webhook");
  assert.equal(webhook[0].status, "skipped");
  assert.match(webhook[0].errorMessage, /disabled|missing/i);

  const telegram = await routeNotification(report, {
    env: { NOTIFY_CHANNELS: "telegram" },
    notifiers: notifiersForEnv({ NOTIFY_CHANNELS: "telegram" }).filter((notifier) => notifier.channel === "telegram"),
    createdAt: 2009,
  });
  assert.equal(telegram[0].channel, "telegram");
  assert.equal(telegram[0].status, "skipped");

  const discord = await routeNotification(report, {
    env: { NOTIFY_CHANNELS: "discord" },
    notifiers: notifiersForEnv({ NOTIFY_CHANNELS: "discord" }).filter((notifier) => notifier.channel === "discord"),
    createdAt: 2010,
  });
  assert.equal(discord[0].channel, "discord");
  assert.equal(discord[0].status, "skipped");
}

async function testDeliveryRowsStoreSuccessAndFailure() {
  const report = buildNotificationReport(commanderRow());
  const [success] = await routeNotification(report, {
    env: {},
    notifiers: [fakeNotifier("webhook")],
    createdAt: 2011,
  });
  assert.equal(success.status, "success");
  assert.equal(success.sentAt, 2011);
  assert.equal(success.errorMessage, null);
  assert.equal(typeof success.payloadHash, "string");

  const [failure] = await routeNotification(report, {
    env: {},
    notifiers: [fakeNotifier("webhook", { status: "failed" })],
    createdAt: 2012,
  });
  assert.equal(failure.status, "failed");
  assert.equal(failure.sentAt, null);
  assert.equal(failure.errorMessage, "seeded failure");
}

await testConsoleNotifySucceeds();
await testRedReportNotifiesByDefault();
await testYellowRespectsEnv();
await testGreenRules();
await testDuplicateDedupAndForce();
await testDisabledOptionalChannels();
await testDeliveryRowsStoreSuccessAndFailure();

console.log("notification output tests passed");

