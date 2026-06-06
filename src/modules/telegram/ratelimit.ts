import "server-only";
import { checkRateLimit } from "@/lib/rate-limit";

export const TELEGRAM_RATE_KEYS = {
  loginCodeGenerate: (userId: string) => `telegram:login-code:gen:${userId}`,
  loginCodeAttempt: (chatId: string) => `telegram:login-code:try:${chatId}`,
  generate: (userId: string) => `telegram:generate:${userId}`,
  send: (userId: string) => `telegram:send:${userId}`,
};

export const TELEGRAM_RATE_LIMITS = {
  loginCodeGenerate: { maxRequests: 5, windowMs: 60 * 60 * 1000, minIntervalMs: 30 * 1000 },
  loginCodeAttempt: { maxRequests: 5, windowMs: 15 * 60 * 1000 },
  generate: { maxRequests: 20, windowMs: 60 * 60 * 1000 },
  send: { maxRequests: 10, windowMs: 60 * 60 * 1000 },
};

export function checkTelegramRateLimit(
  key: string,
  config: { maxRequests: number; windowMs: number }
): void {
  checkRateLimit(key, { maxRequests: config.maxRequests, windowMs: config.windowMs });
}
