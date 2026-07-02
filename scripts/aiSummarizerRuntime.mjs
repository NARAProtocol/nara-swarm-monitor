import { createHash } from "node:crypto";
import superjson from "superjson";
import pg from "pg";

export const AI_SUMMARY_SYSTEM_PROMPT = [
  "You are a read-only NARA monitor summarizer.",
  "Use only the provided Commander report.",
  "Do not invent facts.",
  "Do not add recommendations not present in the report.",
  "Do not reduce severity.",
  "Do not hide critical alerts.",
  "Do not imply execution authority.",
  "If evidence is missing, say evidence unavailable.",
  "Return JSON only.",
].join("\n");

const EVIDENCE_UNAVAILABLE = [{
  source: "commander_reports",
  sourceRowId: "evidence unavailable",
  note: "Evidence unavailable.",
}];

function parseJson(raw, fallback) {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

export function stableJson(value) {
  return JSON.stringify(value, (_key, entry) => {
    if (typeof entry === "bigint") return entry.toString();
    if (entry && typeof entry === "object" && !Array.isArray(entry)) {
      return Object.fromEntries(Object.entries(entry).sort(([a], [b]) => a.localeCompare(b)));
    }
    return entry;
  });
}

export function sha256Hex(value) {
  return createHash("sha256").update(stableJson(value)).digest("hex");
}

export function buildAiSummaryPrompt(commanderReportJson) {
  return [
    AI_SUMMARY_SYSTEM_PROMPT,
    "",
    "Commander report JSON:",
    commanderReportJson,
  ].join("\n");
}

export function commanderReportFromStoredRow(row) {
  const evidence = parseJson(row.evidenceJson, []);
  const recommendedActions = parseJson(row.recommendedActionsJson, []);

  return {
    id: row.id,
    chainId: Number(row.chainId),
    status: String(row.status),
    severity: Number(row.severity),
    title: String(row.title),
    summary: String(row.summary),
    mainEvent: String(row.mainEvent),
    protocolActivity: parseJson(row.protocolActivityJson, {}),
    walletActivity: parseJson(row.walletActivityJson, {}),
    positionActivity: parseJson(row.positionActivityJson, {}),
    adminActivity: parseJson(row.adminActivityJson, {}),
    treasuryActivity: parseJson(row.treasuryActivityJson, {}),
    routerActivity: parseJson(row.routerActivityJson, {}),
    failedTxActivity: parseJson(row.failedTxActivityJson, {}),
    riskSummary: parseJson(row.riskSummaryJson, {}),
    recommendedActions,
    evidence: evidence.length > 0 ? evidence : EVIDENCE_UNAVAILABLE,
    requiresHumanDecision: Number(row.requiresHumanDecision) === 1,
    createdAt: Number(row.createdAt),
  };
}

function actionText(actions) {
  if (actions.length === 0) return "No recommended actions were provided by the Commander report.";
  return actions.map((action) => `- ${action}`).join("\n");
}

function evidenceLine(evidence) {
  if (!evidence || typeof evidence !== "object") return "- evidence unavailable";
  const source = String(evidence.source ?? "evidence unavailable");
  const sourceRowId = String(evidence.sourceRowId ?? evidence.id ?? "evidence unavailable");
  const note = String(evidence.note ?? "Evidence unavailable.");
  const txHash = evidence.txHash ? ` tx=${String(evidence.txHash)}` : "";
  return `- ${source} ${sourceRowId}:${txHash} ${note}`;
}

export const localStubProvider = {
  provider: "local_stub",
  modelName: "local_stub_v1",
  async summarize(report) {
    const evidence = report.evidence.length > 0 ? report.evidence : EVIDENCE_UNAVAILABLE;
    const recommendedActionsText = actionText(report.recommendedActions);
    const evidenceText = evidence.map(evidenceLine).join("\n");
    const decisionText = report.requiresHumanDecision ? "Human decision required." : "No human decision required by Commander.";

    return {
      summaryText: [
        `Status: ${report.status}`,
        `Severity: ${report.severity}`,
        `Main event: ${report.mainEvent || "evidence unavailable"}`,
        `Commander summary: ${report.summary || "evidence unavailable"}`,
        decisionText,
        "Evidence:",
        evidenceText || "- evidence unavailable",
      ].join("\n"),
      operatorSummary: `${report.title}. ${report.summary} ${decisionText}`,
      riskSummary: `Commander status ${report.status} with severity ${report.severity}. Main event: ${report.mainEvent || "evidence unavailable"}.`,
      recommendedActionsText,
      evidence,
    };
  },
};

export function providerFromEnv(env = process.env) {
  const provider = env.AI_SUMMARY_PROVIDER || "local_stub";
  if (provider === "local_stub") return localStubProvider;
  throw new Error(`${provider} provider is reserved for a later read-only integration; local_stub is the only enabled provider.`);
}

export async function buildAiSummary(commanderRow, options = {}) {
  const report = commanderReportFromStoredRow(commanderRow);
  const provider = options.provider ?? localStubProvider;
  const prompt = buildAiSummaryPrompt(stableJson(report));
  const output = await provider.summarize(report, prompt);
  const createdAt = options.createdAt ?? Math.floor(Date.now() / 1000);
  const inputHash = sha256Hex({ commanderReport: report, prompt });
  const outputHash = sha256Hex(output);

  return {
    id: `${report.chainId}-${report.id}-${provider.provider}-${createdAt}`,
    chainId: report.chainId,
    commanderReportId: report.id,
    modelProvider: provider.provider,
    modelName: provider.modelName,
    status: report.status,
    severity: report.severity,
    summaryText: output.summaryText,
    operatorSummary: output.operatorSummary,
    riskSummary: output.riskSummary,
    recommendedActionsText: output.recommendedActionsText,
    evidenceJson: stableJson(output.evidence),
    inputHash,
    outputHash,
    createdAt,
  };
}

export function formatAiSummary(summary) {
  return [
    `AI Summary Provider: ${summary.modelProvider}/${summary.modelName}`,
    `Commander Report: ${summary.commanderReportId}`,
    `Status: ${summary.status}`,
    `Severity: ${summary.severity}`,
    "",
    summary.summaryText,
    "",
    "Recommended actions:",
    summary.recommendedActionsText,
    "",
    `Input hash: ${summary.inputHash}`,
    `Output hash: ${summary.outputHash}`,
  ].join("\n");
}

export async function queryPonderSql(baseUrl, sql) {
  const query = encodeURIComponent(superjson.stringify({ sql }));
  const response = await fetch(`${baseUrl.replace(/\/$/, "")}/db?sql=${query}`);
  if (!response.ok) throw new Error(`Ponder SQL query failed (${response.status}): ${await response.text()}`);
  const body = await response.json();
  if (Array.isArray(body)) return body;
  if (Array.isArray(body?.rows)) return body.rows;
  if (Array.isArray(body?.result?.rows)) return body.result.rows;
  return [];
}

export async function readLatestCommanderReport(baseUrl = process.env.COMMANDER_SQL_URL || "http://localhost:42069/sql") {
  const rows = await queryPonderSql(baseUrl, 'select * from commander_reports order by "createdAt" desc limit 1');
  if (rows.length === 0) throw new Error("No commander_reports rows available. Run/store Commander v1 before summarizing.");
  return rows[0];
}

export async function storeAiSummary(summary, databaseUrl = process.env.DATABASE_URL) {
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required to store ai_summaries.");
  }
  const client = new pg.Client({ connectionString: databaseUrl });
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
