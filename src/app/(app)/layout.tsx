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
