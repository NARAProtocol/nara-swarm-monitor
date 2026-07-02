import type { NotificationPayload, NotificationResult, Notifier } from "./types";

function telegramText(payload: NotificationPayload): string {
  return [
    `NARA Monitor: ${payload.status}`,
    `Severity: ${payload.severity}`,
    payload.title,
    payload.summary,
    `Main event: ${payload.mainEvent}`,
    `Report: ${payload.sourceReportId}`,
  ].join("\n");
}

export function createTelegramNotifier(botToken?: string, chatId?: string): Notifier {
  const enabled = Boolean(botToken && chatId);
  return {
    channel: "telegram",
    destination: chatId ? `telegram chat ${chatId}` : "missing TELEGRAM_CHAT_ID",
    enabled,
    async send(payload: NotificationPayload): Promise<NotificationResult> {
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

