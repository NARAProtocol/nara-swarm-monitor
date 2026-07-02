import type { NotificationPayload, NotificationResult, Notifier } from "./types";

export function createWebhookNotifier(webhookUrl?: string): Notifier {
  return {
    channel: "webhook",
    destination: webhookUrl ? "configured webhook" : "missing WEBHOOK_URL",
    enabled: Boolean(webhookUrl),
    async send(payload: NotificationPayload): Promise<NotificationResult> {
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

