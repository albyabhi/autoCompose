"use client";

import { AuthGuard } from "@/components/auth/auth-guard";
import { AppShell } from "@/features/layout/components/app-shell";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthGuard>
      <AppShell>{children}</AppShell>
    </AuthGuard>
  );
}

// ============================================================
// FILE: src/app/(app)/layout.tsx
// ============================================================
// PURPOSE: Layout for authenticated pages — guards access and renders the app shell.
// HOW IT WORKS: Client component ("use client") that wraps children in AuthGuard
//   (redirects to /login if not authenticated) and AppShell (header, sidebar,
//   content area). This layout applies to all routes under the (app) group:
//   sessions, profile/settings, and the home page.
// INTEGRATION: AuthGuard (auth check), AppShell (UI layout)
// ============================================================
