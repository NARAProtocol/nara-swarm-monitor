import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import pg from "pg";

const zeroAddress = "0x0000000000000000000000000000000000000000";
const requiredAddressKeys = [
  "V4_NARA_TOKEN",
  "V4_ENGINE",
  "V4_POSITION_NFT",
  "V4_BOND_DEPOSITORY_NFT",
  "V4_BOND_VAULT",
  "V4_OPS_VAULT",
  "V4_ENGINE_OPS_ROUTER",
  "V4_BREAK_GLASS_SAFE",
];

const requiredCoreKeys = [
  "CHAIN_ID",
  "BASE_RPC_URL",
  "DATABASE_URL",
  "V4_START_BLOCK",
  "V4_EPOCH_LENGTH_SECONDS",
];

const retiredAddresses = new Set([
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
  "0x58c209B95350aFBEFa17137CEd209f8c4b7D896D",
  "0x9E8cE51805b13a4d75c324F75B06ABc00d9b1E03",
  "0x58C3f6E6b005009B775C0912B003D39660D14391",
  "0x86ED92166aF1f97Fba75A9b12D9b1F7FfEE5E088",
].map((address) => address.toLowerCase()));

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
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    parsed[key] = value;
  }
  return parsed;
}

function loadEnv() {
  return {
    ...parseEnvFile(resolve(".env")),
    ...parseEnvFile(resolve(".env.local")),
    ...process.env,
  };
}

function envStatus(env) {
  const missing = [];
  const invalid = [];
  for (const key of requiredCoreKeys) {
    if (!env[key]?.trim()) missing.push(key);
  }
  for (const key of requiredAddressKeys) {
    const value = env[key]?.trim();
    if (!value) {
      missing.push(key);
      continue;
    }
    const normalized = value.toLowerCase();
    if (!/^0x[a-fA-F0-9]{40}$/.test(value) || normalized === zeroAddress || retiredAddresses.has(normalized)) {
      invalid.push(key);
    }
  }
  return { missing, invalid, ok: missing.length === 0 && invalid.length === 0 };
}

async function tryQuery(client, sql, fallback = "unavailable") {
  try {
    const result = await client.query(sql);
    return result.rows[0]?.value ?? fallback;
  } catch {
    return fallback;
  }
}

function formatTime(epochSeconds) {
  const value = Number(epochSeconds);
  if (!Number.isFinite(value) || value <= 0) return "unavailable";
  return new Date(value * 1000).toISOString();
}

const env = loadEnv();
const status = envStatus(env);
const apiHost = env.API_HOST || "127.0.0.1";
const apiPort = env.API_PORT || "42069";
const apiReadOnly = env.API_READ_ONLY || "true";
const apiMaxLimit = env.API_MAX_LIMIT || "250";

console.log("NARA monitor health");
console.log(`Env validity: ${status.ok ? "ok" : "not ok"}`);
if (status.missing.length > 0) console.log(`Missing env keys: ${status.missing.join(", ")}`);
if (status.invalid.length > 0) console.log(`Invalid or retired address keys: ${status.invalid.join(", ")}`);
console.log(`API config: host=${apiHost} port=${apiPort} readOnly=${apiReadOnly} maxLimit=${apiMaxLimit}`);

if (!env.DATABASE_URL) {
  console.log("DB connection: unavailable (DATABASE_URL missing)");
  process.exit(0);
}

const client = new pg.Client({ connectionString: env.DATABASE_URL });
try {
  await client.connect();
  console.log("DB connection: ok");

  const latestIndexedBlock = await tryQuery(client, `
    select greatest(
      coalesce((select max("blockNumber") from erc20_transfers), 0),
      coalesce((select max("blockNumber") from locks), 0),
      coalesce((select max("blockNumber") from ops_router_events), 0),
      coalesce((select max("blockNumber") from failed_transactions), 0)
    ) as value
  `);
  const latestCommanderAt = await tryQuery(client, 'select max("createdAt") as value from commander_reports');
  const openSeverity5Count = await tryQuery(client, "select count(*)::integer as value from alerts where status = 'open' and severity = 5", 0);
  const latestFailedTxScanAt = await tryQuery(client, `
    select greatest(
      coalesce((select max(timestamp) from failed_transactions), 0),
      coalesce((select max("updatedAt") from failed_tx_groups), 0)
    ) as value
  `);

  console.log(`Latest indexed block: ${latestIndexedBlock}`);
  console.log(`Latest Commander report time: ${formatTime(latestCommanderAt)}`);
  console.log(`Open severity 5 count: ${openSeverity5Count}`);
  console.log(`Latest failed tx scan time: ${formatTime(latestFailedTxScanAt)}`);
} catch (error) {
  const message = error instanceof Error ? error.message : "unknown DB error";
  console.log(`DB connection: failed (${message})`);
} finally {
  await client.end().catch(() => {});
}

