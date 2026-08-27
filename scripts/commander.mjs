import {
  createPonderSqlCommanderReader,
  formatCommanderReport,
  generateCommanderReport,
  storeCommanderReport,
} from "./commanderRuntime.mjs";

const report = await generateCommanderReport(createPonderSqlCommanderReader(), {
  chainId: Number(process.env.CHAIN_ID || "8453"),
});

await storeCommanderReport(report);
console.log(formatCommanderReport(report));
