import superjson from "superjson";
import pg from "pg";
import {
  buildAiSummary,
  formatAiSummary,
  providerFromEnv,
  type AiSummaryRow,
  type CommanderReportStoredRow,
} from "../agents/aiSummarizer";

function sqlEndpoint(): string {
  return (process.env.COMMANDER_SQL_URL || "http://localhost:42069/sql").replace(/\/$/, "");
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

async function latestCommanderReportRow(): Promise<CommanderReportStoredRow> {
  const rows = await queryPonderSql(sqlEndpoint(), 'select * from commander_reports order by "createdAt" desc limit 1');
  if (rows.length === 0) {
    throw new Error("No commander_reports rows available. Run/store Commander v1 before summarizing.");
  }
  return rows[0] as CommanderReportStoredRow;
}

async function storeAiSummary(summary: AiSummaryRow): Promise<void> {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is required to store ai_summaries.");
  }
  const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  try {
    await client.query(
      `insert into ai_summaries (
        id, "chainId", "commanderReportId", "modelProvider", "modelName",
        status, severity, "summaryText", "operatorSummary", "riskSummary",
        "recommendedActionsText", "evidenceJson", "inputHash", "outputHash", "createdAt"
      ) values (
        $1, $2, $3, $4, $5,
        $6, $7, $8, $9, $10,
        $11, $12, $13, $14, $15
      )
      on conflict (id) do update set
        "summaryText" = excluded."summaryText",
        "operatorSummary" = excluded."operatorSummary",
        "riskSummary" = excluded."riskSummary",
        "recommendedActionsText" = excluded."recommendedActionsText",
        "evidenceJson" = excluded."evidenceJson",
        "outputHash" = excluded."outputHash",
        "createdAt" = excluded."createdAt"`,
      [
        summary.id,
        summary.chainId,
        summary.commanderReportId,
        summary.modelProvider,
        summary.modelName,
        summary.status,
        summary.severity,
        summary.summaryText,
        summary.operatorSummary,
        summary.riskSummary,
        summary.recommendedActionsText,
        summary.evidenceJson,
        summary.inputHash,
        summary.outputHash,
        summary.createdAt,
      ],
    );
  } finally {
    await client.end();
  }
}

export async function runAiSummaryCli(): Promise<void> {
  const commanderRow = await latestCommanderReportRow();
  const summary = await buildAiSummary(commanderRow, { provider: providerFromEnv() });
  console.log(formatAiSummary(summary));
  await storeAiSummary(summary);
}

if (process.argv[1]?.endsWith("aiSummaryCli.ts")) {
  await runAiSummaryCli();
}
