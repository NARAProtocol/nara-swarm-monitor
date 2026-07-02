import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const zeroAddress = "0x0000000000000000000000000000000000000000";

const retiredAddresses = new Set(
  [
    // Retired v3 stack.
    "0xE444de61752bD13D1D37Ee59c31ef4e489bd727C",
    "0x62250aEE40F37e2eb2cd300E5a429d7096C8868F",
    "0xC425F45f3e108cA4E49f86E01C6d256e6c572876",
    "0xcCe364b9cF815D47B0338aAd960367CdE8E3525D",
    "0xe5f3D18d81661F63F9Fa5B53401eee08d383Ca20",
    "0x81573dEDa5BcED23f0754cf3D0D2553d3694a0Ba",
    "0x6a1d3f01EFB35F3A8d5d6B3101f2764Bdf47cf3b",
    "0x2654602d8b0A7e328dcEC553aC2d1D289fC3B5da",
    "0x255770CA9D2b69ef766cF2755276051a6D21D131",
    "0x7FDbA2DB4C46d69216f2166aA7f2CED403d97885",

    // Retired v4 incident stack.
    "0x58c209B95350aFBEFa17137CEd209f8c4b7D896D",
    "0x9E8cE51805b13a4d75c324F75B06ABc00d9b1E03",
    "0x58C3f6E6b005009B775C0912B003D39660D14391",
    "0x86ED92166aF1f97Fba75A9b12D9b1F7FfEE5E088",
  ].map((address) => address.toLowerCase()),
);

const requiredAddresses = [
  "V4_NARA_TOKEN",
  "V4_ENGINE",
  "V4_POSITION_NFT",
  "V4_BOND_DEPOSITORY_NFT",
  "V4_BOND_VAULT",
  "V4_OPS_VAULT",
  "V4_ENGINE_OPS_ROUTER",
  "V4_BREAK_GLASS_SAFE",
];

const optionalAddresses = [
  "V4_TREASURY_ADDRESS",
  "V4_FINAL_ADMIN",
  "DEPLOYER_ADDRESS",
  "V4_LIQUIDITY_HOOK",
  "V4_LIQUIDITY_VAULT",
  "V4_LIQUIDITY_COMPOUNDER",
];

const supportedNotificationChannels = new Set(["console", "webhook", "telegram", "discord", "email"]);

function parseEnvFile(path) {
  if (!existsSync(path)) return {};

  const parsed = {};
  const text = readFileSync(path, "utf8");
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;

    const separator = line.indexOf("=");
    if (separator === -1) continue;

    const key = line.slice(0, separator).trim();
    let value = line.slice(separator + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    parsed[key] = value;
  }
  return parsed;
}

const shouldLoadEnvFiles = !process.argv.includes("--no-env-files") && process.env.NARA_ENV_VALIDATION_SKIP_FILES !== "true";
const fileEnv = shouldLoadEnvFiles
  ? {
      ...parseEnvFile(resolve(".env")),
      ...parseEnvFile(resolve(".env.local")),
    }
  : {};
const env = { ...fileEnv, ...process.env };

function fail(message) {
  console.error(`Fresh v4 env validation failed: ${message}`);
  process.exitCode = 1;
}

function valueOf(name) {
  return env[name]?.trim() ?? "";
}

function assertPositiveInteger(name, description) {
  const value = valueOf(name);
  if (!value || !Number.isInteger(Number(value)) || Number(value) <= 0) {
    fail(`${name} must be a positive integer${description ? ` ${description}` : ""}.`);
  }
}

function assertHttpUrl(name) {
  const value = valueOf(name);
  if (!value) {
    fail(`${name} is required.`);
    return;
  }
  try {
    const parsed = new URL(value);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      fail(`${name} must be an http(s) URL.`);
    }
  } catch {
    fail(`${name} must be a valid URL.`);
  }
}

function assertDatabaseUrl(name) {
  const value = valueOf(name);
  if (!value) {
    fail(`${name} is required.`);
    return;
  }
  try {
    const parsed = new URL(value);
    if (parsed.protocol !== "postgres:" && parsed.protocol !== "postgresql:") {
      fail(`${name} must use postgres:// or postgresql://.`);
    }
  } catch {
    fail(`${name} must be a valid Postgres URL.`);
  }
}

function assertAddress(name, required = true) {
  const value = env[name]?.trim();
  if (!value) {
    if (required) fail(`${name} is required.`);
    return;
  }
  if (!/^0x[a-fA-F0-9]{40}$/.test(value)) {
    fail(`${name} must be a 20-byte EVM address.`);
    return;
  }
  const normalized = value.toLowerCase();
  if (normalized === zeroAddress) {
    fail(`${name} cannot be the zero address.`);
    return;
  }
  if (retiredAddresses.has(normalized)) {
    fail(`${name} points to a retired NARA address. Fresh v4 redeploy only.`);
  }
}

function assertNotificationConfig() {
  const rawChannels = valueOf("NOTIFY_CHANNELS") || "console";
  const channels = rawChannels
    .split(",")
    .map((channel) => channel.trim().toLowerCase())
    .filter(Boolean);
  if (channels.length === 0) {
    fail("NOTIFY_CHANNELS must include at least console or another supported channel.");
    return;
  }
  for (const channel of channels) {
    if (!supportedNotificationChannels.has(channel)) {
      fail(`NOTIFY_CHANNELS includes unsupported channel ${channel}.`);
    }
  }
  if (channels.includes("webhook")) assertHttpUrl("WEBHOOK_URL");
  if (channels.includes("discord")) assertHttpUrl("DISCORD_WEBHOOK_URL");
  if (channels.includes("telegram")) {
    if (!valueOf("TELEGRAM_BOT_TOKEN")) fail("TELEGRAM_BOT_TOKEN is required when telegram notifications are enabled.");
    if (!valueOf("TELEGRAM_CHAT_ID")) fail("TELEGRAM_CHAT_ID is required when telegram notifications are enabled.");
  }
}

assertPositiveInteger("CHAIN_ID", "for the active v4 monitor chain");
assertHttpUrl("BASE_RPC_URL");
assertDatabaseUrl("DATABASE_URL");
assertPositiveInteger("V4_START_BLOCK", "from the fresh v4 deployment");
assertPositiveInteger("V4_EPOCH_LENGTH_SECONDS", "for the deployed engine epoch length");

if (valueOf("API_READ_ONLY").toLowerCase() === "false") {
  fail("API_READ_ONLY cannot be false for the read-only monitor.");
}

for (const name of requiredAddresses) {
  assertAddress(name);
}

for (const name of optionalAddresses) {
  assertAddress(name, false);
}

assertNotificationConfig();

if (process.exitCode) {
  process.exit();
}

console.log("Fresh v4 env validation passed.");
