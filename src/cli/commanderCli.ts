import superjson from "superjson";
import {
  COMMANDER_VIEW_NAMES,
  generateCommanderReport,
  type CommanderReader,
  type CommanderViewName,
} from "../agents/commander";
import { formatCommanderReport } from "../agents/reportBuilder";

function sqlEndpoint(): string {
  return (process.env.COMMANDER_SQL_URL || "http://localhost:42069/sql").replace(/\/$/, "");
}

function assertCommanderViewName(viewName: string): asserts viewName is CommanderViewName {
  if (!(COMMANDER_VIEW_NAMES as readonly string[]).includes(viewName)) {
    throw new Error(`Unsupported Commander view: ${viewName}`);
  }
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

export function createPonderSqlCommanderReader(baseUrl = sqlEndpoint()): CommanderReader {
  return {
    async readView(viewName, limit) {
      assertCommanderViewName(viewName);
      return queryPonderSql(baseUrl, `select * from ${viewName} limit ${Math.max(1, Math.min(limit, 250))}`);
    },
  };
}

export async function runCommanderCli(): Promise<void> {
  const report = await generateCommanderReport(createPonderSqlCommanderReader(), {
    chainId: Number(process.env.CHAIN_ID || "8453"),
  });
  console.log(formatCommanderReport(report));
}

if (process.argv[1]?.endsWith("commanderCli.ts")) {
  await runCommanderCli();
}

