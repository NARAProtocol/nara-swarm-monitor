import type { NotificationPayload, NotificationResult, Notifier } from "./types";

function discordContent(payload: NotificationPayload): string {
  return [
    `**NARA Monitor: ${payload.status}**`,
    `Severity: ${payload.severity}`,
    `Title: ${payload.title}`,
    `Main event: ${payload.mainEvent}`,
    `Summary: ${payload.summary}`,
    `Report: ${payload.sourceReportId}`,
  ].join("\n");
}

export function createDiscordNotifier(webhookUrl?: string): Notifier {
  return {
    channel: "discord",
    destination: webhookUrl ? "configured Discord webhook" : "missing DISCORD_WEBHOOK_URL",
    enabled: Boolean(webhookUrl),
    async send(payload: NotificationPayload): Promise<NotificationResult> {
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

