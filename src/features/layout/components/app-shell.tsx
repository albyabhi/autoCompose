"use client";

import { Header } from "./header";
import { Sidebar } from "./sidebar";
import { useLayoutStore } from "@/features/layout/stores/layout-store";

interface AppShellProps {
  children: React.ReactNode;
  title?: string;
}

export function AppShell({ children, title }: AppShellProps) {
  const sidebarOpen = useLayoutStore((s) => s.sidebarOpen);

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
// PURPOSE: The top-level layout wrapper providing header, sidebar, and main content area.
// HOW IT WORKS: Reads the sidebarOpen state from the layout store and toggles a CSS class on the body container. Renders the Header, Sidebar, and a main content area for children.
// PROPS: children (ReactNode), title (string).
// INTEGRATION: layout-store (Zustand), Header, Sidebar components.
// ============================================================
