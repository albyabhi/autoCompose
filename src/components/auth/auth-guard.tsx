"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, router]);

  if (status === "loading") {
    return (
      <div className="auth-loading">
        <div className="loading-spinner" />
        <p className="loading-text">Loading...</p>
      </div>
    );
  }

  if (status === "unauthenticated") {
    return null;
  }

  return <>{children}</>;
}

// ============================================================
// FILE: src/components/auth/auth-guard.tsx
// ============================================================
// PURPOSE: Client-side component that protects routes by requiring authentication.
// HOW IT WORKS: Uses NextAuth's useSession to check auth status. Shows a loading
//   spinner while the session is loading. Redirects to /login if unauthenticated.
//   Renders children only when authenticated. Prevents flash of protected content.
// PROPS: children (React nodes to render when authenticated)
// INTEGRATION: NextAuth session, Next.js router
// ============================================================
