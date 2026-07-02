export type NotificationChannel = "console" | "webhook" | "telegram" | "discord" | "email";
export type NotificationReportType = "commander" | "ai_summary";
export type NotificationStatus = "success" | "failed" | "skipped";

export type NotificationPayload = {
  status: string;
  severity: number;
  title: string;
  summary: string;
  mainEvent: string;
  recommendedActions: string[];
  evidence: unknown[];
  createdAt: number;
  sourceReportId: string;
};

export type NotificationReport = {
  reportType: NotificationReportType;
  reportId: string;
  chainId: number;
  status: string;
  severity: number;
  title: string;
  payload: NotificationPayload;
};

export type NotificationDelivery = {
  id: string;
  chainId: number;
  reportType: NotificationReportType;
  reportId: string;
  channel: NotificationChannel;
  status: NotificationStatus;
  destination: string;
  payloadHash: string;
  errorMessage: string | null;
  sentAt: number | null;
  createdAt: number;
};

export type NotificationResult = {
  channel: NotificationChannel;
  destination: string;
  status: NotificationStatus;
  errorMessage?: string;
};

export type Notifier = {
  channel: NotificationChannel;
  destination: string;
  enabled: boolean;
  send(payload: NotificationPayload): Promise<NotificationResult>;
};

export type NotificationEnv = {
  NOTIFY_CHANNELS?: string;
  NOTIFY_YELLOW?: string;
  NOTIFY_GREEN?: string;
  FORCE_NOTIFY?: string;
  WEBHOOK_URL?: string;
  TELEGRAM_BOT_TOKEN?: string;
  TELEGRAM_CHAT_ID?: string;
  DISCORD_WEBHOOK_URL?: string;
};

