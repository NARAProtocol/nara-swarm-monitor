import type { NotificationPayload, NotificationResult, Notifier } from "./types";

function safeJson(value: unknown): string {
  return JSON.stringify(value, (_key, entry) => typeof entry === "bigint" ? entry.toString() : entry);
}

export function formatNotificationPayload(payload: NotificationPayload): string {
  const actions = payload.recommendedActions.length > 0
    ? payload.recommendedActions.map((action) => `- ${action}`).join("\n")
    : "- evidence unavailable";
  const evidence = payload.evidence.length > 0
    ? payload.evidence.slice(0, 10).map((entry) => `- ${safeJson(entry)}`).join("\n")
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

export function createConsoleNotifier(logger: (message: string) => void = console.log): Notifier {
  return {
    channel: "console",
    destination: "stdout",
    enabled: true,
    async send(payload: NotificationPayload): Promise<NotificationResult> {
      logger(formatNotificationPayload(payload));
      return { channel: "console", destination: "stdout", status: "success" };
    },
  };
}
