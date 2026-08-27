import superjson from "superjson";
import pg from "pg";
import {
  buildAiSummary,
  formatAiSummary,
  providerFromEnv,
  type AiSummaryRow,
  type CommanderReportStoredRow,
} from "../agents/aiSummarizer";
import {
  postgresClientConfig,
  ponderSqlQuery,
  rowsFromPonderSqlResponse,
} from "./sqlRows";

function sqlEndpoint(): string {
  return (process.env.COMMANDER_SQL_URL || "http://localhost:42069/sql").replace(/\/$/, "");
}

async function queryPonderSql(baseUrl: string, sql: string): Promise<Record<string, unknown>[]> {
  const query = encodeURIComponent(superjson.stringify(ponderSqlQuery(sql)));
  const response = await fetch(`${baseUrl}/db?sql=${query}`, { method: "GET" });
  if (!response.ok) {
    throw new Error(`Ponder SQL query failed (${response.status}): ${await response.text()}`);
  }
  const body = await response.json() as unknown;
  return rowsFromPonderSqlResponse(body);
}

async function latestCommanderReportRow(): Promise<CommanderReportStoredRow> {
  const rows = await queryPonderSql(sqlEndpoint(), "select * from commander_reports order by created_at desc limit 1");
  if (rows.length === 0) {
    throw new Error("No commander_reports rows available. Run/store Commander v1 before summarizing.");
  }
  return rows[0] as CommanderReportStoredRow;
}

async function storeAiSummary(summary: AiSummaryRow): Promise<void> {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is required to store ai_summaries.");
  }
  const client = new pg.Client(postgresClientConfig(process.env.DATABASE_URL));
  await client.connect();
  try {
    await client.query(
      `insert into ai_summaries (
        id, chain_id, commander_report_id, model_provider, model_name,
        status, severity, summary_text, operator_summary, risk_summary,
        recommended_actions_text, evidence_json, input_hash, output_hash, created_at
      ) values (
        $1, $2, $3, $4, $5,
        $6, $7, $8, $9, $10,
        $11, $12, $13, $14, $15
      )
      on conflict (id) do update set
        summary_text = excluded.summary_text,
        operator_summary = excluded.operator_summary,
        risk_summary = excluded.risk_summary,
        recommended_actions_text = excluded.recommended_actions_text,
        evidence_json = excluded.evidence_json,
        output_hash = excluded.output_hash,
        created_at = excluded.created_at`,
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
