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

function assertNoSecretFallbacks() {
  const secretEnvRegex = /process\.env\.(TELEGRAM_BOT_TOKEN|PRIVATE_KEY|GEMINI_API_KEY|WEBHOOK_URL|DISCORD_WEBHOOK_URL|OZ_MONITOR_WEBHOOK_URL)\b\s*(\?\.\w+\(\))?\s*(?:\|\||\?\?)\s*["'`][^"'`]+["'`]/i;
  for (const file of scannedRoots.flatMap(listFiles)) {
    const lines = readFileSync(file, "utf8").split(/\r?\n/);
    for (const [index, line] of lines.entries()) {
      assert.equal(
        secretEnvRegex.test(line),
        false,
        `${file}:${index + 1} must not contain fallback literals for secret environment variables`,
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

function assertTrackedFilesSafe() {
  const tracked = spawnSync(
    "git",
    ["ls-files", "--cached", "--others", "--exclude-standard", "-z"],
    {
      encoding: "utf8",
    },
  );
  if (tracked.error) {
    throw tracked.error;
  }
  assert.equal(tracked.status, 0, "git ls-files succeeds");

  const files = tracked.stdout.split("\0").filter(Boolean);
  const forbiddenFileExtensions = /\.(?:key|pem|p12|pfx|keystore)$/i;
  const privateKeyBlock = new RegExp(
    ["-----BEGIN ", "(?:RSA |EC |OPENSSH )?", "PRIVATE KEY-----"].join(""),
  );
  const tokenPatterns = [
    /gh[pousr]_[A-Za-z0-9]{20,}/,
    /github_pat_[A-Za-z0-9_]{20,}/,
    /AKIA[0-9A-Z]{16}/,
    /xox[baprs]-[A-Za-z0-9-]{10,}/,
    /\b\d{8,11}:[A-Za-z0-9_-]{35}\b/,
    /AIza[0-9A-Za-z-_]{35}/,
    /sk-[A-Za-z0-9_-]{20,}/,
  ];

  for (const file of files) {
    const normalized = file.replaceAll("\\", "/");
    const lower = normalized.toLowerCase();
    const isEnvFile =
      (lower === ".env" || lower.startsWith(".env.")) &&
      lower !== ".env.example";
    assert.equal(isEnvFile, false, `${file} must not be tracked`);
    assert.equal(forbiddenFileExtensions.test(lower), false, `${file} looks like signing material`);

    const text = readFileSync(file, "utf8");
    assert.doesNotMatch(text, privateKeyBlock, `${file} must not contain a private key block`);
    for (const tokenPattern of tokenPatterns) {
      assert.doesNotMatch(text, tokenPattern, `${file} must not contain a token-shaped credential`);
    }
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
  MONITOR_PROFILE: "core",
  BASE_RPC_URL: "https://mainnet.base.org",
  DATABASE_URL: "postgres://postgres:postgres@localhost:5432/nara_monitor",
  V4_START_BLOCK: "1",
  V4_EPOCH_LENGTH_SECONDS: "900",
  V4_NARA_TOKEN: "0x1000000000000000000000000000000000000001",
  V4_ENGINE: "0x1000000000000000000000000000000000000002",
  V4_LIQUIDITY_GROWTH_HOOK: "0x1000000000000000000000000000000000000012",
  V4_LIQUIDITY_GROWTH_VAULT: "0x1000000000000000000000000000000000000013",
  V4_LIQUIDITY_COMPOUNDER: "0x1000000000000000000000000000000000000014",
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
assertNoSecretFallbacks();
assertSecretExamplesBlank();
assertTrackedFilesSafe();

const cycleDryRun = runAndAssertNoSecret(process.execPath, ["scripts/monitorCycle.mjs", "--dry-run"], {});
assert.equal(cycleDryRun.status, 0, "monitor cycle dry-run succeeds");

const health = runAndAssertNoSecret(process.execPath, ["scripts/monitorHealth.mjs"], { DATABASE_URL: "" });
assert.equal(health.status, 0, "monitor health succeeds without DATABASE_URL");

const validation = runAndAssertNoSecret(process.execPath, ["scripts/validateFreshV4Env.mjs", "--no-env-files"], validEnv);
assert.equal(validation.status, 0, "env validation succeeds with seeded non-secret env");

console.log("secret leakage checks passed");
