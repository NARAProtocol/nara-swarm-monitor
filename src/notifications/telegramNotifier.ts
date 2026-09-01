import type { NotificationPayload, NotificationResult, Notifier } from "./types";

function telegramText(payload: NotificationPayload): string {
  const isGreen = payload.status === "GREEN";
  const isYellow = payload.status === "YELLOW";
  const statusEmoji = isGreen ? "🟢" : isYellow ? "🟡" : "🔴";
  const typeBadge = isGreen
    ? "✅ [ALL SYSTEMS HEALTHY]"
    : isYellow
      ? "⚠️ [WARNING DETECTED]"
      : "🚨 [CRITICAL ALERT]";

  const lines = [
    `${statusEmoji} ${typeBadge}`,
    "━━━━━━━━━━━━━━━━━━━━",
    `📊 Title: ${payload.title}`,
    `🚨 Severity: ${payload.severity} / 5 (${payload.status})`,
  ];

  if (payload.mainEvent && payload.mainEvent !== "evidence unavailable") {
    lines.push(`⚡ Event: ${payload.mainEvent}`);
  }

  lines.push(`📝 Summary: ${payload.summary}`);

  if (payload.recommendedActions && payload.recommendedActions.length > 0) {
    lines.push("━━━━━━━━━━━━━━━━━━━━");
    lines.push("👉 Recommended Action:");
    for (const action of payload.recommendedActions.slice(0, 3)) {
      lines.push(`• ${action}`);
    }
  }

  lines.push("━━━━━━━━━━━━━━━━━━━━");
  lines.push(`🌐 Network: Base Mainnet (8453) · ⏱️ ${new Date().toISOString().replace("T", " ").slice(0, 19)} UTC`);

  return lines.join("\n");
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
          body: JSON.stringify({ chat_id: chatId, text: telegramText(payload), disable_web_page_preview: true }),
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

