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
// PURPOSE: Initializes and caches the grammY Bot instance for Telegram integration.
// HOW IT WORKS: initBot() creates a Bot with the configured token, calls bot.init()
//   to fetch bot info, and registers a middleware that delegates all updates to
//   handleUpdate(). The bot instance is cached in a promise singleton to avoid
//   re-initialization. getBot() returns the cached instance. ensureBotMiddleware()
//   is an alias for getBot(). isTelegramEnabled() checks if Telegram env vars are set.
// [SECURITY] Server-only - bot token never exposed to client
// INTEGRATION: grammY Bot SDK, config, webhook handler
// ============================================================
