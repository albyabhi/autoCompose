import { describe, expect, it, beforeEach } from "vitest";
import { checkRateLimit, checkRegistrationRateLimit, validateHoneypot, getRateLimitStatus, clearRateLimitStore } from "./rate-limit";
import { RateLimitError } from "./errors";

describe("checkRateLimit", () => {
  beforeEach(() => {
    clearRateLimitStore();
  });

  it("allows requests under the limit", () => {
    for (let i = 0; i < 3; i++) {
      expect(() => checkRateLimit("test-key", { maxRequests: 5, windowMs: 60_000 })).not.toThrow();
    }
  });

  it("throws RateLimitError when limit is exceeded", () => {
    for (let i = 0; i < 3; i++) {
      checkRateLimit("test-key", { maxRequests: 3, windowMs: 60_000 });
    }
    expect(() => checkRateLimit("test-key", { maxRequests: 3, windowMs: 60_000 })).toThrow(RateLimitError);
  });

  it("tracks remaining requests via getRateLimitStatus", () => {
    const status = getRateLimitStatus("test-key");
    expect(status).toBeNull();

    checkRateLimit("test-key", { maxRequests: 5, windowMs: 60_000 });
    const after = getRateLimitStatus("test-key");
    expect(after).not.toBeNull();
    expect(after!.remaining).toBe(9);
  });
});

describe("checkRegistrationRateLimit", () => {
  beforeEach(() => {
    clearRateLimitStore();
  });

  it("allows registration requests under the limit", () => {
    for (let i = 0; i < 3; i++) {
      expect(() => checkRegistrationRateLimit("192.168.1.1")).not.toThrow();
    }
  });

  it("throws RateLimitError when per-IP limit is exceeded", () => {
    for (let i = 0; i < 5; i++) {
      checkRegistrationRateLimit("10.0.0.1");
    }
    expect(() => checkRegistrationRateLimit("10.0.0.1")).toThrow(RateLimitError);
  });

  it("does not rate-limit different IPs against each other", () => {
    for (let i = 0; i < 5; i++) {
      checkRegistrationRateLimit("172.16.0.1");
    }
    expect(() => checkRegistrationRateLimit("172.16.0.2")).not.toThrow();
  });

  it("enforces global limit across all IPs", () => {
    for (let i = 0; i < 10; i++) {
      checkRegistrationRateLimit(`10.0.${Math.floor(i / 5)}.${i % 5}`);
    }
    for (let i = 10; i < 20; i++) {
      checkRegistrationRateLimit(`10.0.${Math.floor(i / 5)}.${i % 5}`);
    }
    expect(() => checkRegistrationRateLimit("10.0.99.99")).toThrow(RateLimitError);
  });
});

describe("validateHoneypot", () => {
  it("returns false when honeypot field is empty string", () => {
    expect(validateHoneypot({ company: "" })).toBe(false);
  });

  it("returns false when honeypot field is absent", () => {
    expect(validateHoneypot({ name: "Alice", email: "a@b.com" })).toBe(false);
  });

  it("returns false when honeypot field is null", () => {
    expect(validateHoneypot({ company: null })).toBe(false);
  });

  it("returns true when honeypot field has a value", () => {
    expect(validateHoneypot({ company: "SpamBot Inc" })).toBe(true);
  });

  it("returns true when honeypot field is whitespace-only", () => {
    expect(validateHoneypot({ company: "   " })).toBe(true);
  });

  it("returns false for non-string honeypot values", () => {
    expect(validateHoneypot({ company: 123 })).toBe(false);
    expect(validateHoneypot({ company: true })).toBe(false);
  });
});
