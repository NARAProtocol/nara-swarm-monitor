import { spawn } from "node:child_process";

console.log("🚀 Starting NARA Monitor & Telegram Console services...");

// 1. Start Ponder indexer
const ponder = spawn("npx", ["ponder", "start", "--schema", "public"], {
  stdio: "inherit",
  shell: true,
  env: process.env,
});

// 2. Start Telegram Bot listener if TELEGRAM_BOT_TOKEN is set
if (process.env.TELEGRAM_BOT_TOKEN) {
  console.log("🤖 Starting Telegram interactive listener in background...");
  const bot = spawn("node", ["scripts/telegramBotListener.mjs"], {
    stdio: "inherit",
    shell: true,
    env: process.env,
  });

  bot.on("exit", (code) => {
    console.log("Telegram bot exited with code", code);
  });
}

ponder.on("exit", (code) => {
  process.exit(code ?? 0);
});
