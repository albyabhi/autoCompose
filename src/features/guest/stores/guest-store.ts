"use client";

import { create } from "zustand";
import {
  GUEST_LIMIT,
  enterGuestMode,
  exitGuestMode,
  getGuestCount,
  getGuestRemaining,
  isBrowser,
  isGuestActive,
  isGuestLimitReached,
  setGuestCount,
} from "@/lib/guest";

interface GuestState {
  isGuest: boolean;
  count: number;
  hasHydrated: boolean;
  hydrate: () => void;
  enterGuest: () => void;
  increment: () => void;
  reset: () => void;
  remaining: () => number;
  canGenerate: () => boolean;
}

export const useGuestStore = create<GuestState>((set, get) => ({
  isGuest: false,
  count: 0,
  hasHydrated: false,
  hydrate: () => {
    if (!isBrowser()) return;
    set({ isGuest: isGuestActive(), count: getGuestCount(), hasHydrated: true });
  },
  enterGuest: () => {
    enterGuestMode();
    const count = getGuestCount();
    set({ isGuest: true, count, hasHydrated: true });
  },
  increment: () => {
    const next = Math.min(get().count + 1, GUEST_LIMIT);
    setGuestCount(next);
    set({ count: next });
  },
  reset: () => {
    exitGuestMode();
    set({ isGuest: false, count: 0 });
  },
  remaining: () => getGuestRemaining(get().count),
  canGenerate: () => get().isGuest && !isGuestLimitReached(get().count),
}));

export { GUEST_LIMIT };

// ============================================================
// FILE: src/features/guest/stores/guest-store.ts
// ============================================================
// PURPOSE: Session-lifetime guest-trial state synced with localStorage (isGuest + count).
// HOW IT WORKS: Zustand store; hydrate() reads localStorage once on mount.
//   enterGuest() sets the flag, increment() clamps at GUEST_LIMIT and mirrors to
//   storage, reset() clears both (called on successful sign-in). remaining() and
//   canGenerate() drive the banner, button disabled state, and pre-flight block.
// PROPS: None (hook store).
// INTEGRATION: lib/guest helpers, LoginForm (enter), GenerateForm (increment),
//   AuthGuard/Sidebar (isGuest gate), guest-banner (remaining display).
// ============================================================
