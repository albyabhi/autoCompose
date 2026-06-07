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
