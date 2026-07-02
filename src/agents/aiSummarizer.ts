import { createHash } from "node:crypto";
import { buildAiSummaryPrompt } from "./summaryPrompt";

export type AiSummaryProviderName = "local_stub" | "gemini" | "openai";

export type CommanderReportStoredRow = {
  id: string;
  chainId: number;
  status: string;
  severity: number;
  title: string;
  summary: string;
  mainEvent: string;
  protocolActivityJson: string;
  walletActivityJson: string;
  positionActivityJson: string;
  adminActivityJson: string;
  treasuryActivityJson: string;
  routerActivityJson: string;
  failedTxActivityJson: string;
  riskSummaryJson: string;
  recommendedActionsJson: string;
  evidenceJson: string;
  requiresHumanDecision: number;
  createdAt: number;
};

export type CommanderReportForSummary = {
  id: string;
  chainId: number;
  status: string;
  severity: number;
  title: string;
  summary: string;
  mainEvent: string;
  protocolActivity: unknown;
  walletActivity: unknown;
  positionActivity: unknown;
  adminActivity: unknown;
  treasuryActivity: unknown;
  routerActivity: unknown;
  failedTxActivity: unknown;
  riskSummary: unknown;
  recommendedActions: string[];
  evidence: unknown[];
  requiresHumanDecision: boolean;
  createdAt: number;
};

export type AiSummaryOutput = {
  summaryText: string;
  operatorSummary: string;
  riskSummary: string;
  recommendedActionsText: string;
  evidence: unknown[];
};

export type AiSummaryRow = {
  id: string;
  chainId: number;
  commanderReportId: string;
  modelProvider: string;
  modelName: string;
  status: string;
  severity: number;
  summaryText: string;
  operatorSummary: string;
  riskSummary: string;
  recommendedActionsText: string;
  evidenceJson: string;
  inputHash: string;
  outputHash: string;
  createdAt: number;
};

export type AiSummaryProvider = {
  provider: AiSummaryProviderName;
  modelName: string;
  summarize(report: CommanderReportForSummary, prompt: string): Promise<AiSummaryOutput>;
};

const EVIDENCE_UNAVAILABLE = [{
  source: "commander_reports",
  sourceRowId: "evidence unavailable",
  note: "Evidence unavailable.",
}];

function parseJson<T>(raw: string, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function stableJson(value: unknown): string {
  return JSON.stringify(value, (_key, entry) => {
    if (typeof entry === "bigint") return entry.toString();
    if (entry && typeof entry === "object" && !Array.isArray(entry)) {
      return Object.fromEntries(Object.entries(entry as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b)));
    }
    return entry;
  });
}

export function sha256Hex(value: unknown): string {
  return createHash("sha256").update(stableJson(value)).digest("hex");
}

export function commanderReportFromStoredRow(row: CommanderReportStoredRow): CommanderReportForSummary {
  const evidence = parseJson<unknown[]>(row.evidenceJson, []);
  const recommendedActions = parseJson<string[]>(row.recommendedActionsJson, []);

  return {
    id: row.id,
    chainId: Number(row.chainId),
    status: row.status,
    severity: Number(row.severity),
    title: row.title,
    summary: row.summary,
    mainEvent: row.mainEvent,
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

function actionText(actions: string[]): string {
  if (actions.length === 0) return "No recommended actions were provided by the Commander report.";
  return actions.map((action) => `- ${action}`).join("\n");
}

function evidenceLine(evidence: unknown): string {
  if (!evidence || typeof evidence !== "object") return "- evidence unavailable";
  const row = evidence as Record<string, unknown>;
  const source = String(row.source ?? "evidence unavailable");
  const sourceRowId = String(row.sourceRowId ?? row.id ?? "evidence unavailable");
  const note = String(row.note ?? "Evidence unavailable.");
  const txHash = row.txHash ? ` tx=${String(row.txHash)}` : "";
  return `- ${source} ${sourceRowId}:${txHash} ${note}`;
}

export const localStubProvider: AiSummaryProvider = {
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

export function providerFromEnv(env: NodeJS.ProcessEnv = process.env): AiSummaryProvider {
  const provider = (env.AI_SUMMARY_PROVIDER || "local_stub") as AiSummaryProviderName;
  if (provider === "local_stub") return localStubProvider;
  throw new Error(`${provider} provider is reserved for a later read-only integration; local_stub is the only enabled provider.`);
}

export async function buildAiSummary(
  commanderRow: CommanderReportStoredRow,
  options: {
    provider?: AiSummaryProvider;
    createdAt?: number;
  } = {},
): Promise<AiSummaryRow> {
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

export function formatAiSummary(summary: AiSummaryRow): string {
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

