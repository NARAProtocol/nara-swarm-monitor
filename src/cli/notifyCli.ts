import pg from "pg";
import superjson from "superjson";
import {
  buildNotificationReport,
  routeNotification,
  type AiSummaryRow,
  type CommanderReportRow,
} from "../notifications/notificationRouter";
import type { NotificationDelivery } from "../notifications/types";

function sqlEndpoint(): string {
  return (process.env.COMMANDER_SQL_URL || "http://localhost:42069/sql").replace(/\/$/, "");
}

function escapeSqlLiteral(value: string): string {
  return value.replace(/'/g, "''");
}

async function queryPonderSql(baseUrl: string, sql: string): Promise<Record<string, unknown>[]> {
  const query = encodeURIComponent(superjson.stringify({ sql }));
  const response = await fetch(`${baseUrl}/db?sql=${query}`, { method: "GET" });
  if (!response.ok) {
    throw new Error(`Ponder SQL query failed (${response.status}): ${await response.text()}`);
  }
  const body = await response.json() as unknown;
  if (Array.isArray(body)) return body as Record<string, unknown>[];
  if (body && typeof body === "object" && Array.isArray((body as { rows?: unknown }).rows)) {
    return (body as { rows: Record<string, unknown>[] }).rows;
  }
  if (body && typeof body === "object" && Array.isArray((body as { result?: { rows?: unknown } }).result?.rows)) {
    return (body as { result: { rows: Record<string, unknown>[] } }).result.rows;
  }
  return [];
}

async function latestCommanderReportRow(): Promise<CommanderReportRow> {
  const rows = await queryPonderSql(sqlEndpoint(), 'select * from commander_reports order by "createdAt" desc limit 1');
  if (rows.length === 0) {
    throw new Error("No commander_reports rows available. Run/store Commander v1 before notifying.");
  }
  return rows[0] as CommanderReportRow;
}

async function latestAiSummaryForCommander(commanderReportId: string): Promise<AiSummaryRow | null> {
  const safeId = escapeSqlLiteral(commanderReportId);
  const rows = await queryPonderSql(
    sqlEndpoint(),
    `select * from ai_summaries where "commanderReportId" = '${safeId}' order by "createdAt" desc limit 1`,
  );
  return rows.length > 0 ? rows[0] as AiSummaryRow : null;
}

async function recentNotificationDeliveries(): Promise<NotificationDelivery[]> {
  const rows = await queryPonderSql(sqlEndpoint(), 'select * from notification_deliveries order by "createdAt" desc limit 500');
  return rows as NotificationDelivery[];
}

async function storeNotificationDeliveries(deliveries: NotificationDelivery[]): Promise<void> {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is required to store notification_deliveries.");
  }
  const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
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

export async function runNotifyCli(): Promise<void> {
  const commander = await latestCommanderReportRow();
  const aiSummary = await latestAiSummaryForCommander(commander.id);
  const previousDeliveries = await recentNotificationDeliveries();
  const report = buildNotificationReport(commander, aiSummary);
  const deliveries = await routeNotification(report, { previousDeliveries });
  await storeNotificationDeliveries(deliveries);
}

if (process.argv[1]?.endsWith("notifyCli.ts")) {
  await runNotifyCli();
}

