import { createHash } from "node:crypto";
import pg from "pg";
import superjson from "superjson";

const EVIDENCE_UNAVAILABLE = [{
  source: "commander_reports",
  sourceRowId: "evidence unavailable",
  note: "Evidence unavailable.",
}];

const ALL_CHANNELS = new Set(["console", "webhook", "telegram", "discord", "email"]);

function parseJson(raw, fallback) {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

function parseActionsText(raw) {
  if (!raw) return [];
  return String(raw)
    .split(/\r?\n/)
    .map((line) => line.trim().replace(/^-+\s*/, ""))
    .filter(Boolean);
}

export function stableJson(value) {
  return JSON.stringify(value, (_key, entry) => {
    if (typeof entry === "bigint") return entry.toString();
    if (entry && typeof entry === "object" && !Array.isArray(entry)) {
      return Object.fromEntries(Object.entries(entry).sort(([a], [b]) => a.localeCompare(b)));
    }
    return entry;
  });
}

export function sha256Hex(value) {
  return createHash("sha256").update(stableJson(value)).digest("hex");
}

export function boolFromEnv(value, fallback) {
  if (value === undefined || value === "") return fallback;
  return String(value).toLowerCase() === "true" || value === "1";
}

export function formatNotificationPayload(payload) {
  const actions = payload.recommendedActions.length > 0
    ? payload.recommendedActions.map((action) => `- ${action}`).join("\n")
    : "- evidence unavailable";
  const evidence = payload.evidence.length > 0
    ? payload.evidence.slice(0, 10).map((entry) => `- ${stableJson(entry)}`).join("\n")
    : "- evidence unavailable";

  return [
    `Status: ${payload.status}`,
    `Severity: ${payload.severity}`,
    `Title: ${payload.title}`,
    `Main event: ${payload.mainEvent}`,
    `Summary: ${payload.summary}`,
    `Source report: ${payload.sourceReportId}`,
    `Created at: ${payload.createdAt}`,
    "",
    "Recommended actions:",
    actions,
    "",
    "Evidence:",
    evidence,
  ].join("\n");
}

export function createConsoleNotifier(logger = console.log) {
  return {
    channel: "console",
    destination: "stdout",
    enabled: true,
    async send(payload) {
      logger(formatNotificationPayload(payload));
      return { channel: "console", destination: "stdout", status: "success" };
    },
  };
}

export function createWebhookNotifier(webhookUrl) {
  return {
    channel: "webhook",
    destination: webhookUrl ? "configured webhook" : "missing WEBHOOK_URL",
    enabled: Boolean(webhookUrl),
    async send(payload) {
      if (!webhookUrl) {
        return { channel: "webhook", destination: "missing WEBHOOK_URL", status: "skipped", errorMessage: "WEBHOOK_URL missing" };
      }
      try {
        const response = await fetch(webhookUrl, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!response.ok) {
          return { channel: "webhook", destination: "configured webhook", status: "failed", errorMessage: `HTTP ${response.status}` };
        }
        return { channel: "webhook", destination: "configured webhook", status: "success" };
      } catch (error) {
        return { channel: "webhook", destination: "configured webhook", status: "failed", errorMessage: error instanceof Error ? error.message : "Webhook send failed" };
      }
    },
  };
}

function telegramText(payload) {
  return [
    `NARA Monitor: ${payload.status}`,
    `Severity: ${payload.severity}`,
    payload.title,
    payload.summary,
    `Main event: ${payload.mainEvent}`,
    `Report: ${payload.sourceReportId}`,
  ].join("\n");
}

export function createTelegramNotifier(botToken, chatId) {
  return {
    channel: "telegram",
    destination: chatId ? `telegram chat ${chatId}` : "missing TELEGRAM_CHAT_ID",
    enabled: Boolean(botToken && chatId),
    async send(payload) {
      if (!botToken || !chatId) {
        return { channel: "telegram", destination: "missing telegram config", status: "skipped", errorMessage: "TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID missing" };
      }
      try {
        const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ chat_id: chatId, text: telegramText(payload) }),
        });
        if (!response.ok) {
          return { channel: "telegram", destination: `telegram chat ${chatId}`, status: "failed", errorMessage: `HTTP ${response.status}` };
        }
        return { channel: "telegram", destination: `telegram chat ${chatId}`, status: "success" };
      } catch (error) {
        return { channel: "telegram", destination: `telegram chat ${chatId}`, status: "failed", errorMessage: error instanceof Error ? error.message : "Telegram send failed" };
      }
    },
  };
}

function discordContent(payload) {
  return [
    `**NARA Monitor: ${payload.status}**`,
    `Severity: ${payload.severity}`,
    `Title: ${payload.title}`,
    `Main event: ${payload.mainEvent}`,
    `Summary: ${payload.summary}`,
    `Report: ${payload.sourceReportId}`,
  ].join("\n");
}

export function createDiscordNotifier(webhookUrl) {
  return {
    channel: "discord",
    destination: webhookUrl ? "configured Discord webhook" : "missing DISCORD_WEBHOOK_URL",
    enabled: Boolean(webhookUrl),
    async send(payload) {
      if (!webhookUrl) {
        return { channel: "discord", destination: "missing DISCORD_WEBHOOK_URL", status: "skipped", errorMessage: "DISCORD_WEBHOOK_URL missing" };
      }
      try {
        const response = await fetch(webhookUrl, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ content: discordContent(payload) }),
        });
        if (!response.ok) {
          return { channel: "discord", destination: "configured Discord webhook", status: "failed", errorMessage: `HTTP ${response.status}` };
        }
        return { channel: "discord", destination: "configured Discord webhook", status: "success" };
      } catch (error) {
        return { channel: "discord", destination: "configured Discord webhook", status: "failed", errorMessage: error instanceof Error ? error.message : "Discord send failed" };
      }
    },
  };
}

export function createEmailPlaceholderNotifier() {
  return {
    channel: "email",
    destination: "email placeholder",
    enabled: false,
    async send() {
      return {
        channel: "email",
        destination: "email placeholder",
        status: "skipped",
        errorMessage: "Email output is placeholder-only until SMTP config exists.",
      };
    },
  };
}

export function enabledChannels(env = process.env) {
  const configured = String(env.NOTIFY_CHANNELS || "console")
    .split(",")
    .map((channel) => channel.trim().toLowerCase())
    .filter(Boolean);
  const channels = new Set(["console"]);
  for (const channel of configured) {
    if (ALL_CHANNELS.has(channel)) channels.add(channel);
  }
  return [...channels];
}

export function notifiersForEnv(env = process.env) {
  const notifiers = {
    console: createConsoleNotifier(),
    webhook: createWebhookNotifier(env.WEBHOOK_URL),
    telegram: createTelegramNotifier(env.TELEGRAM_BOT_TOKEN, env.TELEGRAM_CHAT_ID),
    discord: createDiscordNotifier(env.DISCORD_WEBHOOK_URL),
    email: createEmailPlaceholderNotifier(),
  };
  return enabledChannels(env).map((channel) => notifiers[channel]).filter(Boolean);
}

export function commanderReportToNotification(row) {
  const evidence = parseJson(row.evidenceJson, []);
  return {
    reportType: "commander",
    reportId: row.id,
    chainId: Number(row.chainId),
    status: String(row.status),
    severity: Number(row.severity),
    title: String(row.title),
    payload: {
      status: String(row.status),
      severity: Number(row.severity),
      title: String(row.title),
      summary: String(row.summary),
      mainEvent: row.mainEvent ? String(row.mainEvent) : "evidence unavailable",
      recommendedActions: parseJson(row.recommendedActionsJson, []),
      evidence: evidence.length > 0 ? evidence : EVIDENCE_UNAVAILABLE,
      createdAt: Number(row.createdAt),
      sourceReportId: String(row.id),
    },
  };
}

export function aiSummaryToNotification(summary, commander) {
  const evidence = parseJson(summary.evidenceJson, []);
  const title = commander?.title ?? `NARA AI summary ${summary.status}`;
  return {
    reportType: "ai_summary",
    reportId: String(summary.id),
    chainId: Number(summary.chainId),
    status: String(summary.status),
    severity: Number(summary.severity),
    title,
    payload: {
      status: String(summary.status),
      severity: Number(summary.severity),
      title,
      summary: String(summary.operatorSummary || summary.summaryText || "evidence unavailable"),
      mainEvent: commander?.mainEvent || summary.riskSummary || "evidence unavailable",
      recommendedActions: parseActionsText(summary.recommendedActionsText),
      evidence: evidence.length > 0 ? evidence : EVIDENCE_UNAVAILABLE,
      createdAt: Number(summary.createdAt),
      sourceReportId: String(summary.commanderReportId),
    },
  };
}

export function buildNotificationReport(commander, latestAiSummary = null) {
  if (latestAiSummary && latestAiSummary.commanderReportId === commander.id) {
    return aiSummaryToNotification(latestAiSummary, commander);
  }
  return commanderReportToNotification(commander);
}

export function shouldNotify(report, channel, env = process.env) {
  if (channel === "console") return true;
  if (report.severity >= 5) return true;
  if (report.status === "RED") return true;
  if (report.status === "YELLOW") return boolFromEnv(env.NOTIFY_YELLOW, true);
  if (report.status === "GREEN") return boolFromEnv(env.NOTIFY_GREEN, false);
  return false;
}

function hasSuccessfulDuplicate(channel, payloadHash, previousDeliveries) {
  return previousDeliveries.some((delivery) =>
    delivery.channel === channel
    && delivery.payloadHash === payloadHash
    && delivery.status === "success"
  );
}

function skippedResult(channel, destination, errorMessage) {
  return { channel, destination, status: "skipped", errorMessage };
}

function deliveryFromResult(report, payloadHash, result, createdAt, ordinal) {
  const idSeed = `${report.chainId}:${report.reportType}:${report.reportId}:${result.channel}:${payloadHash}:${createdAt}:${ordinal}:${result.status}`;
  return {
    id: sha256Hex(idSeed),
    chainId: report.chainId,
    reportType: report.reportType,
    reportId: report.reportId,
    channel: result.channel,
    status: result.status,
    destination: result.destination,
    payloadHash,
    errorMessage: result.errorMessage ?? null,
    sentAt: result.status === "success" ? createdAt : null,
    createdAt,
  };
}

export async function routeNotification(report, options = {}) {
  const env = options.env ?? process.env;
  const notifiers = options.notifiers ?? notifiersForEnv(env);
  const previousDeliveries = options.previousDeliveries ?? [];
  const createdAt = options.createdAt ?? Math.floor(Date.now() / 1000);
  const forceNotify = boolFromEnv(env.FORCE_NOTIFY, false);
  const payloadHash = sha256Hex(report.payload);
  const deliveries = [];

  for (const [index, notifier] of notifiers.entries()) {
    let result;
    if (!notifier.enabled) {
      result = skippedResult(notifier.channel, notifier.destination, `${notifier.channel} disabled or missing configuration`);
    } else if (!shouldNotify(report, notifier.channel, env)) {
      result = skippedResult(notifier.channel, notifier.destination, "Notification rule skipped this report");
    } else if (!forceNotify && hasSuccessfulDuplicate(notifier.channel, payloadHash, previousDeliveries)) {
      result = skippedResult(notifier.channel, notifier.destination, "Duplicate payload already delivered to this channel");
    } else {
      result = await notifier.send(report.payload);
    }
    deliveries.push(deliveryFromResult(report, payloadHash, result, createdAt, index));
  }

  return deliveries;
}

export async function queryPonderSql(baseUrl, sql) {
  const query = encodeURIComponent(superjson.stringify({ sql }));
  const response = await fetch(`${baseUrl.replace(/\/$/, "")}/db?sql=${query}`);
  if (!response.ok) throw new Error(`Ponder SQL query failed (${response.status}): ${await response.text()}`);
  const body = await response.json();
  if (Array.isArray(body)) return body;
  if (Array.isArray(body?.rows)) return body.rows;
  if (Array.isArray(body?.result?.rows)) return body.result.rows;
  return [];
}

export async function readLatestCommanderReport(baseUrl = process.env.COMMANDER_SQL_URL || "http://localhost:42069/sql") {
  const rows = await queryPonderSql(baseUrl, 'select * from commander_reports order by "createdAt" desc limit 1');
  if (rows.length === 0) throw new Error("No commander_reports rows available. Run/store Commander v1 before notifying.");
  return rows[0];
}

export async function readLatestAiSummaryForCommander(commanderReportId, baseUrl = process.env.COMMANDER_SQL_URL || "http://localhost:42069/sql") {
  const safeId = String(commanderReportId).replace(/'/g, "''");
  const rows = await queryPonderSql(baseUrl, `select * from ai_summaries where "commanderReportId" = '${safeId}' order by "createdAt" desc limit 1`);
  return rows[0] ?? null;
}

export async function readRecentNotificationDeliveries(baseUrl = process.env.COMMANDER_SQL_URL || "http://localhost:42069/sql") {
  return queryPonderSql(baseUrl, 'select * from notification_deliveries order by "createdAt" desc limit 500');
}

export async function storeNotificationDeliveries(deliveries, databaseUrl = process.env.DATABASE_URL) {
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required to store notification_deliveries.");
  }
  const client = new pg.Client({ connectionString: databaseUrl });
  await client.connect();
  try {
    for (const delivery of deliveries) {
      await client.query(
        `insert into notification_deliveries (
          id, "chainId", "reportType", "reportId", channel, status, destination,
          "payloadHash", "errorMessage", "sentAt", "createdAt"
        ) values (
          $1, $2, $3, $4, $5, $6, $7,
          $8, $9, $10, $11
        )
        on conflict (id) do update set
          status = excluded.status,
          destination = excluded.destination,
          "errorMessage" = excluded."errorMessage",
          "sentAt" = excluded."sentAt",
          "createdAt" = excluded."createdAt"`,
        [
          delivery.id,
          delivery.chainId,
          delivery.reportType,
          delivery.reportId,
          delivery.channel,
          delivery.status,
          delivery.destination,
          delivery.payloadHash,
          delivery.errorMessage,
          delivery.sentAt,
          delivery.createdAt,
        ],
      );
    }
  } finally {
    await client.end();
  }
}

