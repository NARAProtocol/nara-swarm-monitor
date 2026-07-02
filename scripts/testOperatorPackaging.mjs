import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";

const packageJson = JSON.parse(readFileSync("package.json", "utf8"));
const envDocs = readFileSync("docs/ENVIRONMENT_VARIABLES.md", "utf8");
const commandsDocs = readFileSync("docs/COMMANDS.md", "utf8");

const requiredEnvVars = [
  "CHAIN_ID",
  "BASE_RPC_URL",
  "DATABASE_URL",
  "V4_START_BLOCK",
  "V4_EPOCH_LENGTH_SECONDS",
  "V4_NARA_TOKEN",
  "V4_ENGINE",
  "V4_POSITION_NFT",
  "V4_BOND_DEPOSITORY_NFT",
  "V4_BOND_VAULT",
  "V4_OPS_VAULT",
  "V4_ENGINE_OPS_ROUTER",
  "V4_BREAK_GLASS_SAFE",
  "V4_TREASURY_ADDRESS",
  "V4_FINAL_ADMIN",
  "DEPLOYER_ADDRESS",
  "NOTIFY_CHANNELS",
  "NOTIFY_YELLOW",
  "NOTIFY_GREEN",
  "FORCE_NOTIFY",
  "WEBHOOK_URL",
  "TELEGRAM_BOT_TOKEN",
  "TELEGRAM_CHAT_ID",
  "DISCORD_WEBHOOK_URL",
  "API_HOST",
  "API_PORT",
  "API_READ_ONLY",
  "API_MAX_LIMIT",
  "AI_SUMMARY_PROVIDER",
];

for (const envVar of requiredEnvVars) {
  assert.match(envDocs, new RegExp(`\\b${envVar}\\b`), `ENVIRONMENT_VARIABLES.md documents ${envVar}`);
}

for (const scriptName of Object.keys(packageJson.scripts)) {
  assert.match(commandsDocs, new RegExp(`npm run ${scriptName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`), `COMMANDS.md documents npm run ${scriptName}`);
}

const cycleDryRun = spawnSync(process.execPath, ["scripts/monitorCycle.mjs", "--dry-run"], {
  encoding: "utf8",
  env: { ...process.env, PRIVATE_KEY: "should-not-print", GEMINI_API_KEY: "should-not-print" },
});
assert.equal(cycleDryRun.status, 0, "monitor:cycle dry-run exits successfully");
assert.match(cycleDryRun.stdout, /Dry run enabled/);
assert.doesNotMatch(cycleDryRun.stdout + cycleDryRun.stderr, /should-not-print/);

const health = spawnSync(process.execPath, ["scripts/monitorHealth.mjs"], {
  encoding: "utf8",
  env: {
    ...process.env,
    DATABASE_URL: "",
    PRIVATE_KEY: "should-not-print",
    TELEGRAM_BOT_TOKEN: "should-not-print",
    DISCORD_WEBHOOK_URL: "should-not-print",
    WEBHOOK_URL: "should-not-print",
  },
});
assert.equal(health.status, 0, "monitor:health exits successfully without DB");
assert.match(health.stdout, /API config:/);
assert.doesNotMatch(health.stdout + health.stderr, /should-not-print/);

console.log("operator packaging tests passed");
