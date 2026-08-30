import superjson from "superjson";
import pg from "pg";
import {
  COMMANDER_VIEW_NAMES,
  generateCommanderReport,
  type CommanderReader,
  type CommanderViewName,
} from "../agents/commander";
import {
  commanderReportToRow,
  formatCommanderReport,
  type CommanderReport,
} from "../agents/reportBuilder";
import {
  postgresClientConfig,
  ponderSqlQuery,
  rowsFromPonderSqlResponse,
} from "./sqlRows";

function sqlEndpoint(): string {
  return (process.env.COMMANDER_SQL_URL || "http://localhost:42069/sql").replace(/\/$/, "");
}

function assertCommanderViewName(viewName: string): asserts viewName is CommanderViewName {
  if (!(COMMANDER_VIEW_NAMES as readonly string[]).includes(viewName)) {
    throw new Error(`Unsupported Commander view: ${viewName}`);
  }
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

async function storeCommanderReport(report: CommanderReport): Promise<void> {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required to store commander_reports.");
  const row = commanderReportToRow(report);
  const client = new pg.Client(postgresClientConfig(process.env.DATABASE_URL));
  await client.connect();
  try {
    await client.query(
      `insert into commander_reports (
        id, chain_id, status, severity, title, summary, main_event,
        protocol_activity_json, wallet_activity_json, position_activity_json,
        admin_activity_json, treasury_activity_json, router_activity_json,
        failed_tx_activity_json, risk_summary_json, recommended_actions_json,
        evidence_json, requires_human_decision, created_at
      ) values (
        $1, $2, $3, $4, $5, $6, $7,
        $8, $9, $10, $11, $12, $13,
        $14, $15, $16, $17, $18, $19
      ) on conflict (id) do update set
        status = excluded.status,
        severity = excluded.severity,
        title = excluded.title,
        summary = excluded.summary,
        main_event = excluded.main_event,
        protocol_activity_json = excluded.protocol_activity_json,
        wallet_activity_json = excluded.wallet_activity_json,
        position_activity_json = excluded.position_activity_json,
        admin_activity_json = excluded.admin_activity_json,
        treasury_activity_json = excluded.treasury_activity_json,
        router_activity_json = excluded.router_activity_json,
        failed_tx_activity_json = excluded.failed_tx_activity_json,
        risk_summary_json = excluded.risk_summary_json,
        recommended_actions_json = excluded.recommended_actions_json,
        evidence_json = excluded.evidence_json,
        requires_human_decision = excluded.requires_human_decision,
        created_at = excluded.created_at`,
      [
        row.id, row.chainId, row.status, row.severity, row.title, row.summary, row.mainEvent,
        row.protocolActivityJson, row.walletActivityJson, row.positionActivityJson,
        row.adminActivityJson, row.treasuryActivityJson, row.routerActivityJson,
        row.failedTxActivityJson, row.riskSummaryJson, row.recommendedActionsJson,
        row.evidenceJson, row.requiresHumanDecision, row.createdAt,
      ],
    );
  } finally {
    await client.end();
  }
}

export function createPonderSqlCommanderReader(baseUrl = sqlEndpoint()): CommanderReader {
  return {
    async readView(viewName, limit) {
      return queryPonderSql(baseUrl, commanderViewSql(viewName, limit));
    },
  };
}

export function commanderViewSql(viewName: string, limit: number): string {
  assertCommanderViewName(viewName);
  const boundedLimit = Math.max(1, Math.min(limit, 250));
  const orderBy = viewName === "wallet_position_summary"
    ? ' order by "lockedNara" desc'
    : viewName === "wallet_risk_ranking"
      ? ' order by "riskScore" desc'
      : "";
  return `select * from ${viewName}${orderBy} limit ${boundedLimit}`;
}

export async function runCommanderCli(): Promise<void> {
  const report = await generateCommanderReport(createPonderSqlCommanderReader(), {
    chainId: Number(process.env.CHAIN_ID || "8453"),
  });
  await storeCommanderReport(report);
  console.log(formatCommanderReport(report));
}

if (process.argv[1]?.endsWith("commanderCli.ts")) {
  await runCommanderCli();
}
