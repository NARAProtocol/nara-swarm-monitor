import {
  buildAiSummary,
  formatAiSummary,
  providerFromEnv,
  readLatestCommanderReport,
  storeAiSummary,
} from "./aiSummarizerRuntime.mjs";

const commanderReport = await readLatestCommanderReport();
const summary = await buildAiSummary(commanderReport, { provider: providerFromEnv() });

console.log(formatAiSummary(summary));
await storeAiSummary(summary);

