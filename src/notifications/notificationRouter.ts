import { createHash } from "node:crypto";
import { createConsoleNotifier } from "./consoleNotifier";
import { createDiscordNotifier } from "./discordNotifier";
import { createTelegramNotifier } from "./telegramNotifier";
import type {
  NotificationChannel,
  NotificationDelivery,
  NotificationEnv,
  NotificationPayload,
  NotificationReport,
  NotificationReportType,
  NotificationResult,
  Notifier,
} from "./types";
import { createWebhookNotifier } from "./webhookNotifier";

export type CommanderReportRow = {
  id: string;
  chainId: number | string;
  status: string;
  severity: number | string;
  title: string;
  summary: string;
  mainEvent: string;
  recommendedActionsJson?: string | null;
  evidenceJson?: string | null;
  createdAt: number | string;
};

export type AiSummaryRow = {
  id: string;
  chainId: number | string;
  commanderReportId: string;
  status: string;
  severity: number | string;
  operatorSummary: string;
  summaryText: string;
  riskSummary: string;
  recommendedActionsText: string;
  evidenceJson?: string | null;
  createdAt: number | string;
};

export type RouteNotificationOptions = {
  env?: NotificationEnv;
  previousDeliveries?: NotificationDelivery[];
  createdAt?: number;
  notifiers?: Notifier[];
};

const ALL_CHANNELS = new Set<NotificationChannel>(["console", "webhook", "telegram", "discord", "email"]);
const EVIDENCE_UNAVAILABLE = [{
  source: "commander_reports",
  sourceRowId: "evidence unavailable",
  note: "Evidence unavailable.",
}];

function parseJson<T>(raw: string | null | undefined, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function parseActionsText(raw: string | null | undefined): string[] {
  if (!raw) return [];
  return raw
    .split(/\r?\n/)
    .map((line) => line.trim().replace(/^-+\s*/, ""))
    .filter(Boolean);
}

export function stableJson(value: unknown): string {
  return JSON.stringify(value, (_key, entry) => {
    if (typeof entry === "bigint") return entry.toString();
    if (entry && typeof entry === "object" && !Array.isArray(entry)) {
      return Object.fromEntries(Object.entries(entry as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b)));
    }
    return entry;
  });
}

export function sha256Hex(value: unknown): string {
  return createHash("sha256").update(stableJson(value)).digest("hex");
}

export function boolFromEnv(value: string | undefined, fallback: boolean): boolean {
  if (value === undefined || value === "") return fallback;
  return value.toLowerCase() === "true" || value === "1";
}

export function enabledChannels(env: NotificationEnv = {}): NotificationChannel[] {
  const configured = (env.NOTIFY_CHANNELS || "console")
    .split(",")
    .map((channel) => channel.trim().toLowerCase())
    .filter(Boolean);
  const channels = new Set<NotificationChannel>(["console"]);
  for (const channel of configured) {
    if (ALL_CHANNELS.has(channel as NotificationChannel)) channels.add(channel as NotificationChannel);
  }
  return [...channels];
}

function createEmailPlaceholderNotifier(): Notifier {
  return {
    channel: "email",
    destination: "email placeholder",
    enabled: false,
    async send(): Promise<NotificationResult> {
      return {
        channel: "email",
        destination: "email placeholder",
        status: "skipped",
        errorMessage: "Email output is placeholder-only until SMTP config exists.",
      };
    },
  };
}

export function notifiersForEnv(env: NotificationEnv = {}): Notifier[] {
  const channels = enabledChannels(env);
  const notifiers = new Map<NotificationChannel, Notifier>([
    ["console", createConsoleNotifier()],
    ["webhook", createWebhookNotifier(env.WEBHOOK_URL)],
    ["telegram", createTelegramNotifier(env.TELEGRAM_BOT_TOKEN, env.TELEGRAM_CHAT_ID)],
    ["discord", createDiscordNotifier(env.DISCORD_WEBHOOK_URL)],
    ["email", createEmailPlaceholderNotifier()],
  ]);
  return channels.map((channel) => notifiers.get(channel)).filter((entry): entry is Notifier => Boolean(entry));
}

export function commanderReportToNotification(row: CommanderReportRow): NotificationReport {
  const evidence = parseJson<unknown[]>(row.evidenceJson, []);
  return {
    reportType: "commander",
    reportId: row.id,
    chainId: Number(row.chainId),
    status: row.status,
    severity: Number(row.severity),
    title: row.title,
    payload: {
      status: row.status,
      severity: Number(row.severity),
      title: row.title,
      summary: row.summary,
      mainEvent: row.mainEvent || "evidence unavailable",
      recommendedActions: parseJson<string[]>(row.recommendedActionsJson, []),
      evidence: evidence.length > 0 ? evidence : EVIDENCE_UNAVAILABLE,
      createdAt: Number(row.createdAt),
      sourceReportId: row.id,
    },
  };
}

export function aiSummaryToNotification(summary: AiSummaryRow, commander?: CommanderReportRow): NotificationReport {
  const evidence = parseJson<unknown[]>(summary.evidenceJson, []);
  const title = commander?.title ?? `NARA AI summary ${summary.status}`;
  return {
    reportType: "ai_summary",
    reportId: summary.id,
    chainId: Number(summary.chainId),
    status: summary.status,
    severity: Number(summary.severity),
    title,
    payload: {
      status: summary.status,
      severity: Number(summary.severity),
      title,
      summary: summary.operatorSummary || summary.summaryText || "evidence unavailable",
      mainEvent: commander?.mainEvent || summary.riskSummary || "evidence unavailable",
      recommendedActions: parseActionsText(summary.recommendedActionsText),
      evidence: evidence.length > 0 ? evidence : EVIDENCE_UNAVAILABLE,
      createdAt: Number(summary.createdAt),
      sourceReportId: summary.commanderReportId,
    },
  };
}

export function buildNotificationReport(commander: CommanderReportRow, latestAiSummary?: AiSummaryRow | null): NotificationReport {
  if (latestAiSummary && latestAiSummary.commanderReportId === commander.id) {
    return aiSummaryToNotification(latestAiSummary, commander);
  }
  return commanderReportToNotification(commander);
}

export function shouldNotify(report: NotificationReport, channel: NotificationChannel, env: NotificationEnv = {}): boolean {
  if (channel === "console") return true;
  if (report.severity >= 5) return true;
  if (report.status === "RED") return true;
  if (report.status === "YELLOW") return boolFromEnv(env.NOTIFY_YELLOW, true);
  if (report.status === "GREEN") return boolFromEnv(env.NOTIFY_GREEN, false);
  return false;
}

function hasSuccessfulDuplicate(channel: NotificationChannel, payloadHash: string, previousDeliveries: NotificationDelivery[]): boolean {
  return previousDeliveries.some((delivery) =>
    delivery.channel === channel
    && delivery.payloadHash === payloadHash
    && delivery.status === "success"
  );
}

function deliveryFromResult(
  report: NotificationReport,
  payloadHash: string,
  result: NotificationResult,
  createdAt: number,
): NotificationDelivery {
  const idSeed = `${report.chainId}:${report.reportType}:${report.reportId}:${result.channel}:${payloadHash}:${createdAt}:${result.status}`;
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

function skippedResult(channel: NotificationChannel, destination: string, errorMessage: string): NotificationResult {
  return { channel, destination, status: "skipped", errorMessage };
}

export async function routeNotification(report: NotificationReport, options: RouteNotificationOptions = {}): Promise<NotificationDelivery[]> {
  const env = options.env ?? process.env;
  const notifiers = options.notifiers ?? notifiersForEnv(env);
  const previousDeliveries = options.previousDeliveries ?? [];
  const createdAt = options.createdAt ?? Math.floor(Date.now() / 1000);
  const forceNotify = boolFromEnv(env.FORCE_NOTIFY, false);
  const payloadHash = sha256Hex(report.payload);
  const deliveries: NotificationDelivery[] = [];

  for (const notifier of notifiers) {
    let result: NotificationResult;
    if (!notifier.enabled) {
      result = skippedResult(notifier.channel, notifier.destination, `${notifier.channel} disabled or missing configuration`);
    } else if (!shouldNotify(report, notifier.channel, env)) {
      result = skippedResult(notifier.channel, notifier.destination, "Notification rule skipped this report");
    } else if (!forceNotify && hasSuccessfulDuplicate(notifier.channel, payloadHash, previousDeliveries)) {
      result = skippedResult(notifier.channel, notifier.destination, "Duplicate payload already delivered to this channel");
    } else {
      result = await notifier.send(report.payload);
    }
    deliveries.push(deliveryFromResult(report, payloadHash, result, createdAt));
  }

  return deliveries;
}

