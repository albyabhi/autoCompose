"use client";

import { useEffect } from "react";
import { useSession } from "next-auth/react";
import { useGuestStore } from "@/features/guest/stores/guest-store";

/**
 * Syncs guest-trial state with auth: hydrates from localStorage on mount and
 * clears the guest flag once a real session exists (login converts the trial).
 */
export function useGuest() {
  const { status } = useSession();
  const isGuest = useGuestStore((s) => s.isGuest);
  const count = useGuestStore((s) => s.count);
  const hasHydrated = useGuestStore((s) => s.hasHydrated);
  const hydrate = useGuestStore((s) => s.hydrate);
  const reset = useGuestStore((s) => s.reset);
  const remaining = useGuestStore((s) => s.remaining);
  const canGenerate = useGuestStore((s) => s.canGenerate);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  useEffect(() => {
    if (status === "authenticated") reset();
  }, [status, reset]);

  return {
    isGuestMode: status === "unauthenticated" && isGuest,
    isGuest,
    count,
    hasHydrated,
    remaining: remaining(),
    canGenerate: canGenerate(),
    authStatus: status,
  };
}

// ============================================================
// FILE: src/features/guest/hooks/use-guest.ts
// ============================================================
// PURPOSE: Reactive guest-trial hook combining session status with the guest store.
// HOW IT WORKS: Hydrates the store once, auto-resets guest state on login, and
//   exposes isGuestMode (only true when unauthenticated + flag set) plus count,
//   remaining, and canGenerate for gates and banners.
// INTEGRATION: next-auth useSession, guest-store. Used by GenerateForm,
//   ComposePage, Sidebar, and GuestBanner.
// ============================================================
