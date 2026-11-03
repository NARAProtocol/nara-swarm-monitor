import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";

const packageJson = JSON.parse(readFileSync("package.json", "utf8"));
const envDocs = readFileSync("docs/ENVIRONMENT_VARIABLES.md", "utf8");
const commandsDocs = readFileSync("docs/COMMANDS.md", "utf8");
const railwayGuide = readFileSync("docs/RAILWAY_DEPLOYMENT_GUIDE.md", "utf8");
const telegramSource = readFileSync("scripts/telegramBotListener.mjs", "utf8");
const startAllSource = readFileSync("scripts/startAll.mjs", "utf8");

const requiredEnvVars = [
  "CHAIN_ID",
  "BASE_RPC_URL",
  "DATABASE_URL",
  "DATABASE_SCHEMA",
  "V4_START_BLOCK",
  "V4_EPOCH_LENGTH_SECONDS",
  "FAILED_TX_SCAN_MAX_BLOCKS",
  "NARA_WORKSPACE_ROOT",
  "NARA_PROTOCOL_ORIGIN_COMMIT",
  "NARA_BASKETS_ORIGIN_COMMIT",
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

assert.doesNotMatch(telegramSource, /0x[0-9a-fA-F]{40}/, "Telegram listener contains no hardcoded contract address");
assert.match(telegramSource, /requiredAddress\("V4_ENGINE"\)/, "Telegram listener requires the configured Engine");
assert.match(telegramSource, /safeGetAddress\(process\.env\.V4_POSITION_NFT\)/, "Position NFT remains optional in core profile");
assert.match(telegramSource, /Unavailable \(core integration gated\)/, "Unset Position NFT telemetry is reported as integration gated, not zero");
assert.match(telegramSource, /Unavailable \(configured read failed\)/, "Failed configured Position NFT reads are reported as unavailable, not zero");
assert.doesNotMatch(railwayGuide, /V4_POSITION_NFT=0x[0-9a-fA-F]{40}/, "Railway core profile does not publish an unverified NFT address");
assert.match(railwayGuide, /V4_START_BLOCK=53410681/, "Railway guide uses the verified fresh-v4/v5 scan start");
assert.match(railwayGuide, /LARGE_BUY_ALERT_ENABLED=false/, "Railway guide keeps optional buy alerts disabled by default");
assert.doesNotMatch(
  telegramSource,
  /Alpha Dossier|Yield Harvester|Diamond Conviction|Titan Mega Whale|Exposure Profile|Rank Tier|x Boost/i,
  "Telegram wallet copy contains no promotional investment labels",
);
assert.match(
  telegramSource,
  /not investment research, a trading signal/i,
  "Telegram wallet copy labels its output as operational telemetry",
);
assert.match(startAllSource, /validateFreshV4Env\.mjs/, "production start validates the deployment environment before launching");
assert.match(startAllSource, /process\.env\.DATABASE_SCHEMA/, "production start uses the configured database schema");
assert.doesNotMatch(startAllSource, /--schema", "public"/, "production start does not hardcode the shared public schema");
assert.doesNotMatch(startAllSource, /shell:\s*true/, "production child processes do not use shell execution");
assert.match(startAllSource, /scheduleRestart\("Ponder"/, "Ponder is supervised without stopping the sentinel");
assert.match(startAllSource, /scheduleRestart\("Telegram bot"/, "Telegram is supervised without stopping the sentinel");
assert.match(startAllSource, /checkEpochHealth\.mjs", "--sentinel"/, "production starts the independent epoch sentinel");
assert.match(startAllSource, /EPOCH_SENTINEL_INTERVAL_SECONDS/, "epoch sentinel cadence is configurable");
assert.doesNotMatch(startAllSource, /rangeRangerWatcher/, "production start never launches the retired Range Ranger");
assert.match(startAllSource, /Range Ranger is retired/, "production start logs that the Range Ranger is retired");
assert.doesNotMatch(startAllSource, /\.\.\.process\.env/, "child environments are never a raw copy of the parent environment");
assert.doesNotMatch(startAllSource, /env: process\.env\b/, "no child inherits the unfiltered parent environment");
assert.doesNotMatch(telegramSource, /rangeRangerRuntime/, "Telegram listener does not load the retired Range Ranger runtime");
assert.doesNotMatch(telegramSource, /synthesize\w*Bracket/, "Telegram listener never builds ladder previews");
assert.match(telegramSource, /"\/recenter"/, "the recenter command is still recognised");
assert.match(telegramSource, /Range Ranger retired/, "Range Ranger commands reply that the ranger is retired");

// Production start fails closed before spawning anything, the validator included, while the retired
// Range Ranger's key or auto-execution switch is configured. CHAIN_ID is deliberately invalid so that
// even a regressed guard cannot start long-running services from this test.
function runStartAll(overrides) {
  return spawnSync(process.execPath, ["scripts/startAll.mjs"], {
    encoding: "utf8",
    timeout: 30_000,
    env: { ...process.env, CHAIN_ID: "not-a-chain-id", ...overrides },
  });
}
{
  const keySentinel = "start-all-key-sentinel-should-not-print";
  const refused = runStartAll({ TREASURY_PRIVATE_KEY: keySentinel });
  assert.equal(refused.status, 1, "production start refuses a configured treasury signing key");
  assert.match(refused.stderr, /Remove TREASURY_PRIVATE_KEY/);
  assert.doesNotMatch(refused.stdout + refused.stderr, /Fresh v4 env validation/, "the refusal happens before the validator is spawned");
  assert.doesNotMatch(refused.stdout + refused.stderr, new RegExp(keySentinel), "the refused key value is never printed");

  const autoExecute = runStartAll({ RANGE_RANGER_AUTO_EXECUTE: "true" });
  assert.equal(autoExecute.status, 1, "production start refuses Range Ranger auto-execution");
  assert.match(autoExecute.stderr, /Remove RANGE_RANGER_AUTO_EXECUTE/);

  const secretSentinel = "withheld-secret-sentinel-should-not-print";
  const withheld = runStartAll({ DEPLOYER_PRIVATE_KEY: secretSentinel, OPERATOR_MNEMONIC: secretSentinel });
  assert.notEqual(withheld.status, 0, "the deliberately invalid test environment still fails validation");
  assert.match(withheld.stderr, /Withholding .*DEPLOYER_PRIVATE_KEY/, "signing-secret variables are withheld from child processes");
  assert.match(withheld.stderr, /Withholding .*OPERATOR_MNEMONIC/, "mnemonic variables are withheld from child processes");
  assert.match(withheld.stderr, /Fresh v4 env validation failed/, "validation, not a service, is the first child");
  assert.doesNotMatch(withheld.stdout + withheld.stderr, new RegExp(secretSentinel), "withheld values are never printed");
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
