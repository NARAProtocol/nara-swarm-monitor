import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";

const baseEnv = {
  ...process.env,
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
expectFail(runValidation({ V4_EPOCH_LENGTH_SECONDS: "" }), /V4_EPOCH_LENGTH_SECONDS/, "missing epoch length fails");
expectFail(runValidation({ V4_EPOCH_LENGTH_SECONDS: "0" }), /V4_EPOCH_LENGTH_SECONDS/, "zero epoch length fails");
expectFail(runValidation({ V4_NARA_TOKEN: "0xE444de61752bD13D1D37Ee59c31ef4e489bd727C" }), /retired NARA address/, "retired v3 address fails");
expectFail(runValidation({ API_READ_ONLY: "false" }), /API_READ_ONLY/, "write-enabled API flag fails");
expectFail(runValidation({ NOTIFY_CHANNELS: "webhook", WEBHOOK_URL: "" }), /WEBHOOK_URL/, "webhook channel requires webhook URL");
expectFail(runValidation({ NOTIFY_CHANNELS: "telegram", TELEGRAM_BOT_TOKEN: "", TELEGRAM_CHAT_ID: "" }), /TELEGRAM_BOT_TOKEN|TELEGRAM_CHAT_ID/, "telegram channel requires token and chat");
expectFail(runValidation({ BASE_RPC_URL: "not-a-url" }), /BASE_RPC_URL/, "invalid RPC URL fails");
expectFail(runValidation({ DATABASE_URL: "https://example.com" }), /DATABASE_URL/, "non-Postgres DB URL fails");

console.log("env validation tests passed");

