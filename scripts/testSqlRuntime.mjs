import assert from "node:assert/strict";
import {
  camelizeSqlKey,
  camelizeSqlRow,
  postgresClientConfig,
  rowsFromPonderSqlResponse,
} from "./sqlRuntime.mjs";

assert.equal(camelizeSqlKey("commander_report_id"), "commanderReportId");
assert.deepEqual(
  camelizeSqlRow({ chain_id: 8453, created_at: 123, status: "GREEN" }),
  { chainId: 8453, createdAt: 123, status: "GREEN" },
);
assert.deepEqual(
  rowsFromPonderSqlResponse({ rows: [{ source_row_id: "alert-1", tx_hash: "0xabc" }] }),
  [{ sourceRowId: "alert-1", txHash: "0xabc" }],
);
assert.deepEqual(
  rowsFromPonderSqlResponse({ result: { rows: [{ open_alert_count: 2 }] } }),
  [{ openAlertCount: 2 }],
);
assert.deepEqual(
  postgresClientConfig("postgres://example", { DATABASE_SCHEMA: "nara_v4_monitor" }),
  { connectionString: "postgres://example", options: "-c search_path=nara_v4_monitor" },
);
assert.throws(
  () => postgresClientConfig("postgres://example", { DATABASE_SCHEMA: "public;drop schema public" }),
  /invalid/,
);

console.log("SQL row normalization tests passed.");
