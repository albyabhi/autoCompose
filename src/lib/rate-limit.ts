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

export function getRateLimitStatus(key: string): { remaining: number; resetAt: number } | null {
  const entry = store.get(key);
  if (!entry) return null;
  const maxConfig = defaults.maxRequests;
  return {
    remaining: Math.max(0, maxConfig - entry.count),
    resetAt: entry.resetAt,
  };
}
