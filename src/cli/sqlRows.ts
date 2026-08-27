import type { ClientConfig } from "pg";

const SAFE_SCHEMA = /^[A-Za-z_][A-Za-z0-9_]{0,62}$/;

export function camelizeSqlKey(key: string): string {
  return key.replace(/_([a-z0-9])/g, (_match, character: string) => character.toUpperCase());
}

export function camelizeSqlRow(row: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(row).map(([key, value]) => [camelizeSqlKey(key), value]),
  );
}

export function rowsFromPonderSqlResponse(body: unknown): Record<string, unknown>[] {
  let rows: Record<string, unknown>[] = [];
  if (Array.isArray(body)) rows = body as Record<string, unknown>[];
  else if (body && typeof body === "object" && Array.isArray((body as { rows?: unknown }).rows)) {
    rows = (body as { rows: Record<string, unknown>[] }).rows;
  } else if (body && typeof body === "object" && Array.isArray((body as { result?: { rows?: unknown } }).result?.rows)) {
    rows = (body as { result: { rows: Record<string, unknown>[] } }).result.rows;
  }
  return rows.map(camelizeSqlRow);
}

export function ponderSqlQuery(sql: string): { sql: string; params: unknown[]; typings: unknown[] } {
  return { sql, params: [], typings: [] };
}

export function postgresClientConfig(databaseUrl: string, env: NodeJS.ProcessEnv = process.env): ClientConfig {
  const config: ClientConfig = { connectionString: databaseUrl };
  const schema = String(env.DATABASE_SCHEMA || "").trim();
  if (!schema) return config;
  if (!SAFE_SCHEMA.test(schema) || schema === "information_schema" || schema.startsWith("pg_")) {
    throw new Error("DATABASE_SCHEMA is invalid.");
  }
  return { ...config, options: `-c search_path=${schema}` };
}
