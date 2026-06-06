import "server-only";
import { Bot } from "grammy";
import { getConfig } from "@/config";
import { handleUpdate } from "@/modules/telegram/webhook";

let cached: Bot | null = null;
let middlewareRegistered = false;

export function getBot(): Bot {
  if (cached) return cached;
  const cfg = getConfig();
  if (!cfg.telegram.botToken) {
    throw new Error("TELEGRAM_BOT_TOKEN is not configured");
  }
  cached = new Bot(cfg.telegram.botToken);
  return cached;
}

export function ensureBotMiddleware(): Bot {
  const bot = getBot();
  if (middlewareRegistered) return bot;
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
  middlewareRegistered = true;
  return bot;
}

export function isTelegramEnabled(): boolean {
  return getConfig().telegram.enabled;
}
