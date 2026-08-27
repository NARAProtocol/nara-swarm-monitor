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
  DATABASE_URL:
    process.env.DATABASE_URL ??
    "postgres://verification:verification@127.0.0.1:5432/nara_monitor_verification",
  DATABASE_SCHEMA: process.env.DATABASE_SCHEMA ?? "nara_v4_monitor",
  FAILED_TX_SCAN_MAX_BLOCKS: process.env.FAILED_TX_SCAN_MAX_BLOCKS ?? "512",
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
