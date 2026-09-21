import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  GUEST_COUNT_KEY,
  GUEST_FLAG_KEY,
  GUEST_LIMIT,
  enterGuestMode,
  exitGuestMode,
  getGuestCount,
  getGuestRemaining,
  isGuestActive,
  isGuestLimitReached,
  setGuestCount,
} from "./guest";

function stubStorage(initial: Record<string, string> = {}) {
  const map = new Map(Object.entries(initial));
  const storage = {
    getItem: (k: string) => (map.has(k) ? map.get(k)! : null),
    setItem: (k: string, v: string) => {
      map.set(k, v);
    },
    removeItem: (k: string) => {
      map.delete(k);
    },
  };
  vi.stubGlobal("window", { localStorage: storage });
  vi.stubGlobal("localStorage", storage);
  return map;
}

describe("guest trial helpers", () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
  });

  it("caps the trial at 5 free mails", () => {
    expect(GUEST_LIMIT).toBe(5);
  });

  it("computes remaining and limit-reached", () => {
    expect(getGuestRemaining(0)).toBe(5);
    expect(getGuestRemaining(4)).toBe(1);
    expect(getGuestRemaining(5)).toBe(0);
    expect(getGuestRemaining(99)).toBe(0);
    expect(isGuestLimitReached(4)).toBe(false);
    expect(isGuestLimitReached(5)).toBe(true);
  });

  it("is inactive without a browser flag", () => {
    stubStorage();
    expect(isGuestActive()).toBe(false);
    expect(getGuestCount()).toBe(0);
  });

  it("enters guest mode and tracks count", () => {
    stubStorage();
    enterGuestMode();
    expect(isGuestActive()).toBe(true);
    expect(getGuestCount()).toBe(0);
    setGuestCount(3);
    expect(getGuestCount()).toBe(3);
  });

  it("clamps count into 0..5 and parses defensively", () => {
    const map = stubStorage();
    setGuestCount(99);
    expect(getGuestCount()).toBe(5);
    setGuestCount(-2);
    expect(getGuestCount()).toBe(0);
    map.set(GUEST_COUNT_KEY, "not-a-number");
    expect(getGuestCount()).toBe(0);
  });

  it("exits guest mode clearing flag and count", () => {
    stubStorage({ [GUEST_FLAG_KEY]: "1", [GUEST_COUNT_KEY]: "4" });
    exitGuestMode();
    expect(isGuestActive()).toBe(false);
    expect(getGuestCount()).toBe(0);
  });
});

// ============================================================
// FILE: src/lib/guest.test.ts
// ============================================================
// PURPOSE: Unit tests for client-only guest-trial helpers (limit, storage, clamp).
// HOW IT WORKS: Stubs window.localStorage with an in-memory Map (Node has no DOM)
//   and asserts flag/count lifecycle: enter, increment clamp at 5, defensive
//   parsing, and full cleanup on exit.
// INTEGRATION: Covers src/lib/guest.ts.
// ============================================================
