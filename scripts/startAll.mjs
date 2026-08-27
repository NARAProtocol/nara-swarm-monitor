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

let shuttingDown = false;
let ponder;
let bot;
let largeBuyWatcher;

function scheduleRestart(label, start) {
  if (shuttingDown) return;
  console.error(`${label} stopped; restarting in 30 seconds while the epoch sentinel remains active.`);
  setTimeout(start, 30_000);
}

// 1. Start and supervise the Ponder indexer without coupling epoch polling to it.
const ponderCli = resolve("node_modules/ponder/dist/esm/bin/ponder.js");
function startPonder() {
  let stopped = false;
  const handleStop = () => {
    if (stopped) return;
    stopped = true;
    ponder = undefined;
    scheduleRestart("Ponder", startPonder);
  };
  ponder = spawn(process.execPath, [ponderCli, "start", "--schema", databaseSchema], {
    stdio: "inherit",
    env: runtimeEnv,
  });
  ponder.on("exit", handleStop);
  ponder.on("error", (error) => {
    console.error("Ponder failed to start:", error.message);
    handleStop();
  });
}
startPonder();

// 2. Start Telegram Bot listener if TELEGRAM_BOT_TOKEN is set
if (process.env.TELEGRAM_BOT_TOKEN) {
  const startTelegramBot = () => {
    let stopped = false;
    const handleStop = () => {
      if (stopped) return;
      stopped = true;
      bot = undefined;
      scheduleRestart("Telegram bot", startTelegramBot);
    };
    console.log("🤖 Starting Telegram interactive listener in background...");
    bot = spawn(process.execPath, ["scripts/telegramBotListener.mjs"], {
      stdio: "inherit",
      env: runtimeEnv,
    });
    bot.on("exit", handleStop);
    bot.on("error", (error) => {
      console.error("Telegram bot failed to start:", error.message);
      handleStop();
    });
  };
  startTelegramBot();
}

// 3. Independent large-buy watcher. It reads only the canonical Hook event,
// persists its cursor/deliveries in Postgres, and sends Telegram notifications.
if (["true", "1"].includes(String(process.env.LARGE_BUY_ALERT_ENABLED || "false").toLowerCase())) {
  const startLargeBuyWatcher = () => {
    let stopped = false;
    const handleStop = () => {
      if (stopped) return;
      stopped = true;
      largeBuyWatcher = undefined;
      scheduleRestart("Large-buy watcher", startLargeBuyWatcher);
    };
    console.log("🐋 Starting canonical NARA/USDC large-buy watcher...");
    largeBuyWatcher = spawn(process.execPath, ["scripts/largeBuyWatcher.mjs"], {
      stdio: "inherit",
      env: runtimeEnv,
    });
    largeBuyWatcher.on("exit", handleStop);
    largeBuyWatcher.on("error", (error) => {
      console.error("Large-buy watcher failed to start:", error.message);
      handleStop();
    });
  };
  startLargeBuyWatcher();
}

// 4. Independent epoch sentinel. It has no Ponder, database, Commander, or
// summarizer dependency and runs more frequently than the broad monitor cycle.
const epochSentinelIntervalSeconds = Number(process.env.EPOCH_SENTINEL_INTERVAL_SECONDS || "300");
if (!Number.isSafeInteger(epochSentinelIntervalSeconds) || epochSentinelIntervalSeconds < 60) {
  throw new Error("EPOCH_SENTINEL_INTERVAL_SECONDS must be an integer of at least 60 seconds");
}
console.log(`⏱️ Epoch sentinel scheduled every ${epochSentinelIntervalSeconds}s`);

let epochSentinelRunning = false;

function runEpochSentinel() {
  if (epochSentinelRunning) {
    console.log(`⏭️ [${new Date().toISOString()}] Previous epoch sentinel is still running; skipping overlap.`);
    return;
  }
  epochSentinelRunning = true;
  const sentinel = spawn(process.execPath, ["scripts/checkEpochHealth.mjs", "--sentinel"], {
    stdio: "inherit",
    env: runtimeEnv,
  });
  sentinel.on("exit", (code) => {
    epochSentinelRunning = false;
    if (code !== 0) console.error(`Epoch sentinel exited with status ${code}`);
  });
  sentinel.on("error", (error) => {
    epochSentinelRunning = false;
    console.error("Epoch sentinel failed to start:", error.message);
  });
}

setTimeout(runEpochSentinel, 10_000);
setInterval(runEpochSentinel, epochSentinelIntervalSeconds * 1000);

// 5. Autonomous broad monitor cycle (every 10 minutes by default)
const intervalSeconds = Number(process.env.MONITOR_CYCLE_INTERVAL_SECONDS || "600");
if (!Number.isSafeInteger(intervalSeconds) || intervalSeconds < 60) {
  throw new Error("MONITOR_CYCLE_INTERVAL_SECONDS must be an integer of at least 60 seconds");
}
console.log(`⏱️ Autonomous Swarm Monitor Cycle scheduled every ${intervalSeconds}s`);

let monitorCycleRunning = false;

function runMonitorCycle() {
  if (monitorCycleRunning) {
    console.log(`⏭️ [${new Date().toISOString()}] Previous Autonomous Swarm Cycle is still running; skipping overlap.`);
    return;
  }
  monitorCycleRunning = true;
  console.log(`\n🔄 [${new Date().toISOString()}] Executing Autonomous Swarm Cycle...`);
  const cycle = spawn(process.execPath, ["scripts/monitorCycle.mjs"], {
    stdio: "inherit",
    env: runtimeEnv,
  });

  cycle.on("exit", (code) => {
    monitorCycleRunning = false;
    console.log(`✅ [${new Date().toISOString()}] Autonomous Swarm Cycle completed with status: ${code === 0 ? "SUCCESS" : "EXIT " + code}`);
  });

  cycle.on("error", (error) => {
    monitorCycleRunning = false;
    console.error("Autonomous Swarm Cycle failed to start:", error.message);
  });
}

// Initial cycle run 45 seconds after Ponder warms up and connects
setTimeout(runMonitorCycle, 45_000);

// Recurring cycle every intervalSeconds
setInterval(runMonitorCycle, intervalSeconds * 1000);

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.once(signal, () => {
    shuttingDown = true;
    ponder?.kill("SIGTERM");
    bot?.kill("SIGTERM");
    largeBuyWatcher?.kill("SIGTERM");
    process.exit(0);
  });
}
