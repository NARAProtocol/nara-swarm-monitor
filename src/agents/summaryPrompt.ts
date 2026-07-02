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

export function buildAiSummaryPrompt(commanderReportJson: string): string {
  return [
    AI_SUMMARY_SYSTEM_PROMPT,
    "",
    "Commander report JSON:",
    commanderReportJson,
  ].join("\n");
}

