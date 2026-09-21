"use client";

import { useSession } from "next-auth/react";
import { useRouter, usePathname } from "next/navigation";
import { useEffect } from "react";
import { useGuestStore } from "@/features/guest/stores/guest-store";

/** Routes a logged-out guest may visit. Everything else still forces /login. */
const GUEST_ALLOWED_PATHS = new Set(["/"]);

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { status } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const hydrate = useGuestStore((s) => s.hydrate);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  useEffect(() => {
    if (status !== "unauthenticated") return;
    const isGuest =
      typeof window !== "undefined" && window.localStorage.getItem("autocompose_guest") === "1";
    if (isGuest && pathname && GUEST_ALLOWED_PATHS.has(pathname)) return;
    router.push("/login");
  }, [status, router, pathname]);

  if (status === "loading") {
    return (
      <div className="auth-loading">
        <div className="loading-spinner" />
        <p className="loading-text">Loading...</p>
      </div>
    );
  }

  if (status === "unauthenticated") {
    const isGuest =
      typeof window !== "undefined" && window.localStorage.getItem("autocompose_guest") === "1";
    if (isGuest && pathname && GUEST_ALLOWED_PATHS.has(pathname)) {
      return <>{children}</>;
    }
    return null;
  }

  return <>{children}</>;
}

// ============================================================
// FILE: src/components/auth/auth-guard.tsx
// ============================================================
// PURPOSE: Client-side component that protects routes by requiring authentication.
// HOW IT WORKS: Uses NextAuth's useSession to check auth status. Shows a loading
//   spinner while the session is loading. Redirects to /login if unauthenticated —
//   except for guest-trial visitors (localStorage autocompose_guest=1) on the
//   single-compose route (/), who render children so they can use the 5 free
//   mails. All other (app) routes still force login for guests.
// PROPS: children (React nodes to render when authenticated)
// INTEGRATION: NextAuth session, Next.js router/pathname, guest-store hydrate
// ============================================================
