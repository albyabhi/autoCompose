export const GUEST_LIMIT = 5;

export const GUEST_FLAG_KEY = "autocompose_guest";
export const GUEST_COUNT_KEY = "autocompose_guest_count";
export const GUEST_HEADER = "x-guest";

export function isBrowser(): boolean {
  return typeof window !== "undefined" && typeof localStorage !== "undefined";
}

export function isGuestActive(): boolean {
  if (!isBrowser()) return false;
  try {
    return window.localStorage.getItem(GUEST_FLAG_KEY) === "1";
  } catch {
    return false;
  }
}

export function getGuestCount(): number {
  if (!isBrowser()) return 0;
  try {
    const raw = window.localStorage.getItem(GUEST_COUNT_KEY);
    const n = raw ? Number.parseInt(raw, 10) : 0;
    return Number.isFinite(n) && n >= 0 ? Math.min(n, GUEST_LIMIT) : 0;
  } catch {
    return 0;
  }
}

export function setGuestCount(count: number): void {
  if (!isBrowser()) return;
  try {
    window.localStorage.setItem(GUEST_COUNT_KEY, String(Math.max(0, Math.min(count, GUEST_LIMIT))));
  } catch {
    // storage unavailable (private mode) — caller falls back to in-memory store state
  }
}

export function enterGuestMode(): void {
  if (!isBrowser()) return;
  try {
    window.localStorage.setItem(GUEST_FLAG_KEY, "1");
    if (window.localStorage.getItem(GUEST_COUNT_KEY) === null) {
      window.localStorage.setItem(GUEST_COUNT_KEY, "0");
    }
  } catch {
    // ignore — zustand store still tracks session-lifetime state
  }
}

export function exitGuestMode(): void {
  if (!isBrowser()) return;
  try {
    window.localStorage.removeItem(GUEST_FLAG_KEY);
    window.localStorage.removeItem(GUEST_COUNT_KEY);
  } catch {
    // ignore
  }
}

export function getGuestRemaining(count: number): number {
  return Math.max(0, GUEST_LIMIT - count);
}

export function isGuestLimitReached(count: number): boolean {
  return count >= GUEST_LIMIT;
}

// ============================================================
// FILE: src/lib/guest.ts
// ============================================================
// PURPOSE: Client-only guest-trial constants and localStorage helpers (5 free mails).
// HOW IT WORKS: GUEST_LIMIT caps stateless generations. Flag + count keys persist
//   the trial in localStorage; helpers clamp/parse defensively and no-op on the
//   server or when storage is unavailable (zustand store covers the session).
// INTEGRATION: Used by guest-store, AuthGuard, GenerateForm, /api/generate guest
//   backstop messaging. Server never trusts this count — it only IP-throttles.
// ============================================================
