"use client";

import { useSession } from "next-auth/react";
import { useState, useEffect, useCallback } from "react";
import type { CurrentUser } from "@/lib/auth/types";

interface UseCurrentUserResult {
  user: CurrentUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  refetch: () => Promise<void>;
}

export function useCurrentUser(): UseCurrentUserResult {
  const { data: session, status } = useSession();
  const [enriched, setEnriched] = useState<Partial<CurrentUser> | null>(null);
  const [fetching, setFetching] = useState(false);

  const isAuthenticated = status === "authenticated";
  const isLoading = status === "loading" || fetching;

  const refetch = useCallback(async () => {
    if (status !== "authenticated") return;
    setFetching(true);
    try {
      const res = await fetch("/api/auth/me");
      const json = await res.json();
      if (json.success && json.data.user) {
        setEnriched(json.data.user);
      }
    } catch {
      // silently fail
    } finally {
      setFetching(false);
    }
  }, [status]);

  useEffect(() => {
    if (status === "authenticated" && !enriched) {
      const timeout = setTimeout(() => void refetch(), 0);
      return () => clearTimeout(timeout);
    }
  }, [status, enriched, refetch]);

  if (!isAuthenticated || !session?.user) {
    return { user: null, isLoading, isAuthenticated: false, refetch };
  }

  const user: CurrentUser = {
    userId: session.user.id,
    name: session.user.name ?? enriched?.name ?? "",
    email: session.user.email ?? enriched?.email ?? "",
    role: (session.user.role as string) ?? enriched?.role ?? "user",
    onboardingCompleted: enriched?.onboardingCompleted ?? false,
    profileCompleted: enriched?.profileCompleted ?? false,
    avatar: enriched?.avatar,
  };

  return { user, isLoading, isAuthenticated, refetch };
}
