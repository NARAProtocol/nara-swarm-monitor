import { spawnSync } from "node:child_process";

const steps = [
  ["sync:abis", "Sync generated active v4 ABIs"],
  ["validate:v4-env", "Validate fresh v4 environment"],
  ["scan:failed", "Scan failed active v4 transactions"],
  ["commander", "Generate deterministic Commander report"],
  ["summarize", "Generate local_stub AI summary"],
  ["notify", "Send configured read-only notifications"],
];

const dryRun = process.argv.includes("--dry-run") || process.env.MONITOR_CYCLE_DRY_RUN === "true";
const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";

console.log("NARA monitor single-cycle plan:");
for (const [scriptName, label] of steps) {
  console.log(`- npm run ${scriptName}: ${label}`);
}

if (dryRun) {
  console.log("Dry run enabled. No commands executed.");
  process.exit(0);
}

for (const [scriptName] of steps) {
  console.log(`\nRunning npm run ${scriptName}`);
  const result = spawnSync(npmCommand, ["run", scriptName], {
    stdio: "inherit",
    env: process.env,
  });
  if (result.status !== 0) {
    process.exitCode = result.status ?? 1;
    break;
  }
}

