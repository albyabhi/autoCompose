import { RateLimitError } from "./errors";

const store = new Map<string, { count: number; resetAt: number }>();

interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
}

const defaults: RateLimitConfig = {
  maxRequests: 10,
  windowMs: 60_000,
};

export function checkRateLimit(key: string, config: Partial<RateLimitConfig> = {}): void {
  const { maxRequests, windowMs } = { ...defaults, ...config };
  const now = Date.now();
  const entry = store.get(key);

  if (!entry || now > entry.resetAt) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    return;
  }

  if (entry.count >= maxRequests) {
    throw new RateLimitError(`Rate limit exceeded. Max ${maxRequests} requests per ${windowMs / 1000}s.`);
  }

  entry.count++;
}

export function checkRegistrationRateLimit(ip: string): void {
  checkRateLimit(`register:${ip}`, { maxRequests: 5, windowMs: 60_000 });
  checkRateLimit("register-global", { maxRequests: 20, windowMs: 60_000 });
}

export function validateHoneypot(body: Record<string, unknown>): boolean {
  const honeypot = body.company;
  if (typeof honeypot === "string" && honeypot.length > 0) {
    return true;
  }
  return false;
}

export function getRateLimitStatus(key: string): { remaining: number; resetAt: number } | null {
  const entry = store.get(key);
  if (!entry) return null;
  const maxConfig = defaults.maxRequests;
  return {
    remaining: Math.max(0, maxConfig - entry.count),
    resetAt: entry.resetAt,
  };
}

export function clearRateLimitStore(): void {
  store.clear();
}

// ============================================================
// FILE: src/lib/rate-limit.ts
// ============================================================
// PURPOSE: In-memory sliding-window rate limiter for API endpoint protection.
// HOW IT WORKS: Maintains a Map of keyed entries with request counts and reset
//   timestamps. checkRateLimit() throws RateLimitError when the count exceeds
//   maxRequests (default 10) within the time window (default 60 seconds).
//   If the window has expired, the counter resets. getRateLimitStatus() returns
//   remaining requests without throwing, useful for setting response headers.
//   checkRegistrationRateLimit() applies both per-IP (5/min) and global (20/min)
//   limits for registration endpoints. validateHoneypot() detects bots by checking
//   for a hidden form field that humans never fill.
// NOTE: In-memory only - resets on server restart. Not suitable for distributed
//   deployments without an external store like Redis.
// INTEGRATION: Used by API routes, Telegram rate limiter, and auth registration
// ============================================================
