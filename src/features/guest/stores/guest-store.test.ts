import { beforeEach, describe, expect, it, vi } from "vitest";
import { useGuestStore } from "./guest-store";
import { GUEST_LIMIT } from "@/lib/guest";

function stubStorage() {
  const map = new Map<string, string>();
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

describe("guest-store", () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
    stubStorage();
    useGuestStore.setState({ isGuest: false, count: 0, hasHydrated: false });
  });

  it("enters guest mode with zero usage", () => {
    useGuestStore.getState().enterGuest();
    const s = useGuestStore.getState();
    expect(s.isGuest).toBe(true);
    expect(s.count).toBe(0);
    expect(s.remaining()).toBe(GUEST_LIMIT);
    expect(s.canGenerate()).toBe(true);
  });

  it("increments and blocks generation at the limit", () => {
    const store = useGuestStore.getState();
    store.enterGuest();
    for (let i = 0; i < GUEST_LIMIT; i++) {
      useGuestStore.getState().increment();
    }
    const s = useGuestStore.getState();
    expect(s.count).toBe(GUEST_LIMIT);
    expect(s.remaining()).toBe(0);
    expect(s.canGenerate()).toBe(false);
    // Further increments clamp — never exceed 5.
    s.increment();
    expect(useGuestStore.getState().count).toBe(GUEST_LIMIT);
  });

  it("hydrates from existing storage", () => {
    const map = new Map<string, string>([
      ["autocompose_guest", "1"],
      ["autocompose_guest_count", "2"],
    ]);
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
    useGuestStore.getState().hydrate();
    const s = useGuestStore.getState();
    expect(s.isGuest).toBe(true);
    expect(s.count).toBe(2);
    expect(s.hasHydrated).toBe(true);
  });

  it("resets on login conversion", () => {
    useGuestStore.getState().enterGuest();
    useGuestStore.getState().increment();
    useGuestStore.getState().reset();
    const s = useGuestStore.getState();
    expect(s.isGuest).toBe(false);
    expect(s.count).toBe(0);
  });
});

// ============================================================
// FILE: src/features/guest/stores/guest-store.test.ts
// ============================================================
// PURPOSE: Unit tests for the guest-trial zustand store (enter/increment/clamp/reset).
// HOW IT WORKS: Stubs localStorage, resets store state between tests, then asserts
//   lifecycle transitions: fresh entry, 5 increments exhaust the trial and clamp,
//   hydration from stored values, and full reset on login.
// INTEGRATION: Covers src/features/guest/stores/guest-store.ts.
// ============================================================
