import { spawn, spawnSync } from "node:child_process";
import { resolve } from "node:path";

console.log("🚀 Starting NARA Swarm Monitor, Telegram Console & Autonomous Scheduler...");

const validation = spawnSync(process.execPath, ["scripts/validateFreshV4Env.mjs", "--no-env-files"], {
  stdio: "inherit",
  env: process.env,
});
if (validation.status !== 0) {
  process.exit(validation.status ?? 1);
}

const databaseSchema = process.env.DATABASE_SCHEMA.trim();
const runtimeEnv = {
  ...process.env,
  PGOPTIONS: `-c search_path=${databaseSchema}`,
};

// 1. Start Ponder indexer
const ponderCli = resolve("node_modules/ponder/dist/esm/bin/ponder.js");
const ponder = spawn(process.execPath, [ponderCli, "start", "--schema", databaseSchema], {
  stdio: "inherit",
  env: runtimeEnv,
});

// 2. Start Telegram Bot listener if TELEGRAM_BOT_TOKEN is set
if (process.env.TELEGRAM_BOT_TOKEN) {
  console.log("🤖 Starting Telegram interactive listener in background...");
  const bot = spawn(process.execPath, ["scripts/telegramBotListener.mjs"], {
    stdio: "inherit",
    env: runtimeEnv,
  });

  bot.on("exit", (code) => {
    console.log("Telegram bot exited with code", code);
    ponder.kill("SIGTERM");
    process.exit(code ?? 1);
  });
}

// 3. Autonomous Swarm Heartbeat Scheduler (every 10 minutes)
const intervalSeconds = Number(process.env.MONITOR_CYCLE_INTERVAL_SECONDS || "600");
console.log(`⏱️ Autonomous Swarm Monitor Cycle scheduled every ${intervalSeconds}s (10 min)`);

function runMonitorCycle() {
  console.log(`\n🔄 [${new Date().toISOString()}] Executing Autonomous Swarm Cycle...`);
  const cycle = spawn(process.execPath, ["scripts/monitorCycle.mjs"], {
    stdio: "inherit",
    env: runtimeEnv,
  });

  cycle.on("exit", (code) => {
    console.log(`✅ [${new Date().toISOString()}] Autonomous Swarm Cycle completed with status: ${code === 0 ? "SUCCESS" : "EXIT " + code}`);
  });
}

// Initial cycle run 45 seconds after Ponder warms up and connects
setTimeout(runMonitorCycle, 45_000);

// Recurring cycle every intervalSeconds
setInterval(runMonitorCycle, intervalSeconds * 1000);

ponder.on("exit", (code) => {
  process.exit(code ?? 0);
});
