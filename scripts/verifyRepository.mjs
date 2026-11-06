import { spawnSync } from "node:child_process";

const commands = [
  "check:repository-policy",
  "check:docs",
  "check:secrets",
  "check:dependencies",
  "validate:env",
  "test",
  "codegen",
  "lint",
  "typecheck",
];

const environment = {
  ...process.env,
  CHAIN_ID: process.env.CHAIN_ID ?? "8453",
  MONITOR_PROFILE: process.env.MONITOR_PROFILE ?? "core",
  BASE_RPC_URL: process.env.BASE_RPC_URL ?? "https://mainnet.base.org",
  DATABASE_URL:
    process.env.DATABASE_URL ??
    "postgres://verification:verification@127.0.0.1:5432/nara_monitor_verification",
  DATABASE_SCHEMA: process.env.DATABASE_SCHEMA ?? "nara_v4_monitor",
  V4_START_BLOCK: process.env.V4_START_BLOCK ?? "53422831",
  V4_EPOCH_LENGTH_SECONDS: process.env.V4_EPOCH_LENGTH_SECONDS ?? "900",
  V4_NARA_TOKEN:
    process.env.V4_NARA_TOKEN ?? "0x91FB78A9F46B67f54BbD4489941d19666b2fAe0f",
  V4_ENGINE:
    process.env.V4_ENGINE ?? "0xd93FbEbFb33FAc9288125074625D4750573B1a53",
  V4_LIQUIDITY_GROWTH_HOOK:
    process.env.V4_LIQUIDITY_GROWTH_HOOK ??
    "0x201fBD2839bEc513040024b37dAe97B401E96acC",
  V4_LIQUIDITY_GROWTH_VAULT:
    process.env.V4_LIQUIDITY_GROWTH_VAULT ??
    "0xe63b4BaAF873FC57859bfe13e0e8cFccAaB6AddE",
  V4_LIQUIDITY_COMPOUNDER:
    process.env.V4_LIQUIDITY_COMPOUNDER ??
    "0x01EF9de9f4e9197F2A3944b5B34A90eA2f558b64",
  FAILED_TX_SCAN_MAX_BLOCKS: process.env.FAILED_TX_SCAN_MAX_BLOCKS ?? "512",
  NARA_ENV_VALIDATION_SKIP_FILES:
    process.env.NARA_ENV_VALIDATION_SKIP_FILES ?? "true",
};

for (const command of commands) {
  const result = spawnSync("npm", ["run", command], {
    env: environment,
    shell: process.platform === "win32",
    stdio: "inherit",
  });

  if (result.error) {
    throw result.error;
  }

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

console.log("repository verification passed");
