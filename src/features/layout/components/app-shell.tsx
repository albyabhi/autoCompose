"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Header } from "./header";
import { Sidebar } from "./sidebar";
import { useLayoutStore } from "@/features/layout/stores/layout-store";

interface AppShellProps {
  children: React.ReactNode;
  title?: string;
}

export function AppShell({ children, title }: AppShellProps) {
  const router = useRouter();
  const sidebarOpen = useLayoutStore((s) => s.sidebarOpen);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        router.push("/");
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [router]);

  return (
    <div className="app-shell">
      <Header title={title} />
      <div className={`app-shell__body ${sidebarOpen ? "" : "app-shell__body--sidebar-closed"}`}>
        <Sidebar />
        <main className="app-shell__content">{children}</main>
      </div>
    </div>
  );
}

// ============================================================
// FILE: src/features/layout/components/app-shell.tsx
// ============================================================
// PURPOSE: The main layout wrapper for all authenticated pages — provides the header, collapsible sidebar, and content area.
// HOW IT WORKS: Client component that reads sidebarOpen from the Zustand layout store. Renders:
//   - Header: Top bar with app title, user avatar, notifications.
//   - Sidebar: Navigation (Dashboard, Sessions, Schedules, Batch, Settings) + toggle button.
//   - Content: Main area with children (the actual page).
//   CSS class on body toggles between "sidebar open" and "sidebar closed" states.
//   Keyboard shortcut: Cmd/Ctrl+K navigates to dashboard (home).
// PROPS: children (ReactNode - the page content), title (string - page title shown in header).
// INTEGRATION: layout-store (Zustand for sidebarOpen), Header component, Sidebar component. Wraps all (app) route group pages via src/app/(app)/layout.tsx.
// ============================================================
