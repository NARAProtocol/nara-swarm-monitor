import {
  createPonderSqlCommanderReader,
  formatCommanderReport,
  generateCommanderReport,
} from "./commanderRuntime.mjs";

const report = await generateCommanderReport(createPonderSqlCommanderReader(), {
  chainId: Number(process.env.CHAIN_ID || "8453"),
});

console.log(formatCommanderReport(report));

