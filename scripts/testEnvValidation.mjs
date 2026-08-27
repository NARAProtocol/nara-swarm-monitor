import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";

const baseEnv = {
  ...process.env,
  NARA_ENV_VALIDATION_SKIP_FILES: "true",
  CHAIN_ID: "8453",
  MONITOR_PROFILE: "full",
  BASE_RPC_URL: "https://mainnet.base.org",
  DATABASE_URL: "postgres://postgres:postgres@localhost:5432/nara_monitor",
  DATABASE_SCHEMA: "nara_v4_monitor",
  V4_START_BLOCK: "1",
  V4_EPOCH_LENGTH_SECONDS: "900",
  FAILED_TX_SCAN_MAX_BLOCKS: "512",
  V4_NARA_TOKEN: "0x1000000000000000000000000000000000000001",
  V4_ENGINE: "0x1000000000000000000000000000000000000002",
  V4_POSITION_NFT: "0x1000000000000000000000000000000000000003",
  V4_BOND_DEPOSITORY_NFT: "0x1000000000000000000000000000000000000004",
  V4_BOND_VAULT: "0x1000000000000000000000000000000000000005",
  V4_OPS_VAULT: "0x1000000000000000000000000000000000000006",
  V4_ENGINE_OPS_ROUTER: "0x1000000000000000000000000000000000000007",
  V4_BREAK_GLASS_SAFE: "0x1000000000000000000000000000000000000008",
  V4_STAKING_POOL: "0x1000000000000000000000000000000000000009",
  V4_STAKING_POOL_SY: "0x1000000000000000000000000000000000000010",
  V4_FRACTIONAL_FACTORY: "0x1000000000000000000000000000000000000011",
  V4_LIQUIDITY_GROWTH_HOOK: "0x1000000000000000000000000000000000000012",
  V4_LIQUIDITY_GROWTH_VAULT: "0x1000000000000000000000000000000000000013",
  V4_LIQUIDITY_COMPOUNDER: "0x1000000000000000000000000000000000000014",
  V4_BASKET_FEE_COLLECTOR: "0x1000000000000000000000000000000000000015",
  V4_GENESIS_REWARD_DISTRIBUTOR: "0x1000000000000000000000000000000000000016",
  V4_BRIBE_ROUTER: "0x1000000000000000000000000000000000000017",
  V4_BASKET_MANAGERS: "0x1000000000000000000000000000000000000018",
  NOTIFY_CHANNELS: "console",
  API_READ_ONLY: "true",
};

function runValidation(overrides = {}) {
  return spawnSync(process.execPath, ["scripts/validateFreshV4Env.mjs", "--no-env-files"], {
    encoding: "utf8",
    env: { ...baseEnv, ...overrides },
  });
}

function expectPass(result, message) {
  assert.equal(result.status, 0, message);
  assert.match(result.stdout, /Fresh v4 env validation passed/);
}

function expectFail(result, pattern, message) {
  assert.notEqual(result.status, 0, message);
  assert.match(result.stderr, pattern);
}

expectPass(runValidation(), "valid seeded env passes");
expectPass(
  runValidation({
    MONITOR_PROFILE: "core",
    V4_POSITION_NFT: "",
    V4_BOND_DEPOSITORY_NFT: "",
    V4_BOND_VAULT: "",
    V4_OPS_VAULT: "",
    V4_ENGINE_OPS_ROUTER: "",
    V4_BREAK_GLASS_SAFE: "",
    V4_STAKING_POOL: "",
    V4_STAKING_POOL_SY: "",
    V4_FRACTIONAL_FACTORY: "",
    V4_BASKET_FEE_COLLECTOR: "",
    V4_GENESIS_REWARD_DISTRIBUTOR: "",
    V4_BRIBE_ROUTER: "",
    V4_BASKET_MANAGERS: "",
  }),
  "core profile passes without deferred surfaces",
);
expectFail(
  runValidation({ MONITOR_PROFILE: "core", V4_LIQUIDITY_COMPOUNDER: "" }),
  /V4_LIQUIDITY_COMPOUNDER/,
  "core profile fails when a deployed core surface is missing",
);
expectFail(runValidation({ MONITOR_PROFILE: "invalid" }), /MONITOR_PROFILE/, "unknown monitor profile fails");
expectFail(runValidation({ V4_EPOCH_LENGTH_SECONDS: "" }), /V4_EPOCH_LENGTH_SECONDS/, "missing epoch length fails");
expectFail(runValidation({ V4_EPOCH_LENGTH_SECONDS: "0" }), /V4_EPOCH_LENGTH_SECONDS/, "zero epoch length fails");
expectFail(runValidation({ FAILED_TX_SCAN_MAX_BLOCKS: "0" }), /FAILED_TX_SCAN_MAX_BLOCKS/, "zero failed transaction scan cap fails");
expectFail(runValidation({ V4_MAX_EPOCH_BACKLOG: "5", V4_EPOCH_CRITICAL_BACKLOG: "5" }), /healthy < critical/, "overlapping epoch thresholds fail");
expectFail(runValidation({ V4_EPOCH_CRITICAL_BACKLOG: "9" }), /between 2 and 8/, "late critical epoch threshold fails");
expectFail(runValidation({ EPOCH_SENTINEL_INTERVAL_SECONDS: "59" }), /at least 60/, "too-fast epoch polling fails");
expectFail(runValidation({ V4_NARA_TOKEN: "0xE444de61752bD13D1D37Ee59c31ef4e489bd727C" }), /retired NARA address/, "retired v3 address fails");
expectFail(runValidation({ API_READ_ONLY: "false" }), /API_READ_ONLY/, "write-enabled API flag fails");
expectFail(runValidation({ NOTIFY_CHANNELS: "webhook", WEBHOOK_URL: "" }), /WEBHOOK_URL/, "webhook channel requires webhook URL");
expectFail(runValidation({ NOTIFY_CHANNELS: "telegram", TELEGRAM_BOT_TOKEN: "", TELEGRAM_CHAT_ID: "" }), /TELEGRAM_BOT_TOKEN|TELEGRAM_CHAT_ID/, "telegram channel requires token and chat");
expectFail(
  runValidation({ LARGE_BUY_ALERT_ENABLED: "true" }),
  /V4_USDC_TOKEN|V4_UNISWAP_V4_POOL_ID|LARGE_BUY_ALERT_MIN_USDC|LARGE_BUY_ALERT_START_BLOCK|Telegram credentials/,
  "large-buy alerts require canonical pool, USDC, forward start block, threshold, and Telegram",
);
expectPass(runValidation({
  LARGE_BUY_ALERT_ENABLED: "true",
  V4_USDC_TOKEN: "0x1111111111111111111111111111111111111111",
  V4_UNISWAP_V4_POOL_ID: `0x${"22".repeat(32)}`,
  LARGE_BUY_ALERT_MIN_USDC: "100",
  LARGE_BUY_ALERT_START_BLOCK: "123",
  LARGE_BUY_ALERT_POLL_SECONDS: "10",
  LARGE_BUY_ALERT_CONFIRMATIONS: "2",
  LARGE_BUY_ALERT_MAX_BLOCKS_PER_SCAN: "500",
  TELEGRAM_BOT_TOKEN: "configured",
  TELEGRAM_CHAT_ID: "123",
  V4_TREASURY_ADDRESS: "0x3333333333333333333333333333333333333333",
  DEPLOYER_ADDRESS: "0x4444444444444444444444444444444444444444",
}), "large-buy alert configuration passes");
expectFail(
  runValidation({ TELEGRAM_BOT_TOKEN: "configured", V4_TREASURY_ADDRESS: "", DEPLOYER_ADDRESS: "" }),
  /V4_TREASURY_ADDRESS|DEPLOYER_ADDRESS/,
  "Telegram listener requires manifest-backed classification addresses",
);
expectFail(runValidation({ BASE_RPC_URL: "not-a-url" }), /BASE_RPC_URL/, "invalid RPC URL fails");
expectFail(runValidation({ DATABASE_URL: "https://example.com" }), /DATABASE_URL/, "non-Postgres DB URL fails");
expectFail(runValidation({ DATABASE_SCHEMA: "public;drop" }), /DATABASE_SCHEMA/, "invalid database schema fails");
expectFail(runValidation({ DATABASE_SCHEMA: "pg_catalog" }), /DATABASE_SCHEMA/, "Postgres system schema fails");
expectFail(runValidation({ V4_BASKET_MANAGERS: "" }), /V4_BASKET_MANAGERS/, "missing basket managers fail");
expectFail(
  runValidation({ V4_BASKET_MANAGERS: "0xE444de61752bD13D1D37Ee59c31ef4e489bd727C" }),
  /retired NARA address/,
  "retired basket manager fails",
);

console.log("env validation tests passed");
