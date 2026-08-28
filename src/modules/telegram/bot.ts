import "server-only";
import { Bot } from "grammy";
import { getConfig } from "@/config";
import { handleUpdate } from "@/modules/telegram/webhook";

let initPromise: Promise<Bot> | null = null;

async function initBot(): Promise<Bot> {
  const cfg = getConfig();
  if (!cfg.telegram.botToken) {
    throw new Error("TELEGRAM_BOT_TOKEN is not configured");
  }
  const bot = new Bot(cfg.telegram.botToken);
  await bot.init();
  bot.use(async (ctx, next) => {
    try {
      const result = await handleUpdate(ctx);
      if (result.status === "rejected") {
        throw new Error("rejected");
      }
    } catch (error) {
      console.error("Bot middleware error", error);
    }
    await next();
  });
  return bot;
}

export function getBot(): Promise<Bot> {
  if (!initPromise) {
    initPromise = initBot();
  }
  return initPromise;
}

export function ensureBotMiddleware(): Promise<Bot> {
  return getBot();
}

export function isTelegramEnabled(): boolean {
  return getConfig().telegram.enabled;
}

// ============================================================
// FILE: src/modules/telegram/bot.ts
// ============================================================
// PURPOSE: Initializes and manages the Telegram bot connection — the bridge between Telegram and AutoCompose.
// HOW IT WORKS: Uses grammY (a Telegram Bot framework) to create a single, cached bot instance:
//   - initBot(): Creates Bot with token from config, calls bot.init() to verify connection with Telegram, registers middleware that forwards all updates to handleUpdate() (in webhook.ts). Returns the Bot instance.
//   - getBot(): Returns the cached bot promise — creates it on first call, reuses on subsequent calls. Prevents multiple connections.
//   - ensureBotMiddleware(): Alias for getBot(), used by the webhook route to ensure bot is ready before processing updates.
//   - isTelegramEnabled(): Quick check if both bot token and webhook secret are configured.
//   The bot token is a secret — never exposed to the client. All update handling happens server-side.
// [SECURITY] Server-only — marked with "server-only" import. Bot token never leaves the server.
// INTEGRATION: grammY Bot SDK; config (src/config/index.ts) for token; webhook handler (src/modules/telegram/webhook.ts) for update processing; called by webhook route (src/app/api/telegram/webhook/route.ts) and status route (src/app/api/telegram/status/route.ts).
// ============================================================
