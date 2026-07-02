import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

const secretSentinel = "nara-secret-sentinel-should-not-print";
const scannedRoots = ["scripts", "src"];
const secretExampleKeys = [
  "WEBHOOK_URL",
  "TELEGRAM_BOT_TOKEN",
  "DISCORD_WEBHOOK_URL",
  "GEMINI_API_KEY",
  "OZ_MONITOR_WEBHOOK_URL",
];

function listFiles(root) {
  const files = [];
  for (const entry of readdirSync(root)) {
    const path = join(root, entry);
    const stat = statSync(path);
    if (stat.isDirectory()) {
      files.push(...listFiles(path));
    } else if (/\.(mjs|ts)$/.test(path)) {
      files.push(path);
    }
  }
  return files;
}

function assertNoProcessEnvLogging() {
  for (const file of scannedRoots.flatMap(listFiles)) {
    const lines = readFileSync(file, "utf8").split(/\r?\n/);
    for (const [index, line] of lines.entries()) {
      const logsProcessEnv = /console\.(log|error|warn|info)\s*\(.*process\.env/.test(line);
      const stringifiesProcessEnv = /JSON\.stringify\s*\(\s*process\.env/.test(line);
      assert.equal(
        logsProcessEnv || stringifiesProcessEnv,
        false,
        `${file}:${index + 1} must not print process.env`,
      );
    }
  }
}

function envExampleValue(key) {
  const text = readFileSync(".env.example", "utf8");
  const line = text.split(/\r?\n/).find((entry) => entry.startsWith(`${key}=`));
  return line ? line.slice(key.length + 1).trim() : undefined;
}

function assertSecretExamplesBlank() {
  for (const key of secretExampleKeys) {
    assert.equal(envExampleValue(key), "", `.env.example keeps ${key} blank`);
  }
}

function runAndAssertNoSecret(command, args, env) {
  const result = spawnSync(command, args, {
    encoding: "utf8",
    env: {
      ...process.env,
      ...env,
      PRIVATE_KEY: secretSentinel,
      WEBHOOK_URL: secretSentinel,
      TELEGRAM_BOT_TOKEN: secretSentinel,
      DISCORD_WEBHOOK_URL: secretSentinel,
      GEMINI_API_KEY: secretSentinel,
      OZ_MONITOR_WEBHOOK_URL: secretSentinel,
    },
  });
  assert.doesNotMatch(result.stdout + result.stderr, new RegExp(secretSentinel), `${args.join(" ")} must not print secret sentinel`);
  return result;
}

const validEnv = {
  NARA_ENV_VALIDATION_SKIP_FILES: "true",
  CHAIN_ID: "8453",
  BASE_RPC_URL: "https://mainnet.base.org",
  DATABASE_URL: "postgres://postgres:postgres@localhost:5432/nara_monitor",
  V4_START_BLOCK: "1",
  V4_EPOCH_LENGTH_SECONDS: "900",
  V4_NARA_TOKEN: "0x1000000000000000000000000000000000000001",
  V4_ENGINE: "0x1000000000000000000000000000000000000002",
  V4_POSITION_NFT: "0x1000000000000000000000000000000000000003",
  V4_BOND_DEPOSITORY_NFT: "0x1000000000000000000000000000000000000004",
  V4_BOND_VAULT: "0x1000000000000000000000000000000000000005",
  V4_OPS_VAULT: "0x1000000000000000000000000000000000000006",
  V4_ENGINE_OPS_ROUTER: "0x1000000000000000000000000000000000000007",
  V4_BREAK_GLASS_SAFE: "0x1000000000000000000000000000000000000008",
  NOTIFY_CHANNELS: "console",
  API_READ_ONLY: "true",
};

assertNoProcessEnvLogging();
assertSecretExamplesBlank();

const cycleDryRun = runAndAssertNoSecret(process.execPath, ["scripts/monitorCycle.mjs", "--dry-run"], {});
assert.equal(cycleDryRun.status, 0, "monitor cycle dry-run succeeds");

const health = runAndAssertNoSecret(process.execPath, ["scripts/monitorHealth.mjs"], { DATABASE_URL: "" });
assert.equal(health.status, 0, "monitor health succeeds without DATABASE_URL");

const validation = runAndAssertNoSecret(process.execPath, ["scripts/validateFreshV4Env.mjs", "--no-env-files"], validEnv);
assert.equal(validation.status, 0, "env validation succeeds with seeded non-secret env");

console.log("secret leakage checks passed");

