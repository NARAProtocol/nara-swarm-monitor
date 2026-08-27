const SAFE_SCHEMA = /^[A-Za-z_][A-Za-z0-9_]{0,62}$/;

export function camelizeSqlKey(key) {
  return key.replace(/_([a-z0-9])/g, (_match, character) => character.toUpperCase());
}

export function camelizeSqlRow(row) {
  if (!row || typeof row !== "object" || Array.isArray(row)) return row;
  return Object.fromEntries(
    Object.entries(row).map(([key, value]) => [camelizeSqlKey(key), value]),
  );
}

export function rowsFromPonderSqlResponse(body) {
  let rows = [];
  if (Array.isArray(body)) rows = body;
  else if (Array.isArray(body?.rows)) rows = body.rows;
  else if (Array.isArray(body?.result?.rows)) rows = body.result.rows;
  return rows.map(camelizeSqlRow);
}

export function ponderSqlQuery(sql) {
  return { sql, params: [], typings: [] };
}

export function postgresClientConfig(databaseUrl, env = process.env) {
  const config = { connectionString: databaseUrl };
  const schema = String(env.DATABASE_SCHEMA || "").trim();
  if (!schema) return config;
  if (!SAFE_SCHEMA.test(schema) || schema === "information_schema" || schema.startsWith("pg_")) {
    throw new Error("DATABASE_SCHEMA is invalid.");
  }
  return { ...config, options: `-c search_path=${schema}` };
}
