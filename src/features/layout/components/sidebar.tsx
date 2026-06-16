"use client";

import { useLayoutStore } from "@/features/layout/stores/layout-store";
import { SessionList } from "@/features/sessions/components/session-list";
import { NewSessionDialog } from "@/features/sessions/components/new-session-dialog";
import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: "▦" },
  { href: "/", label: "Compose", icon: "✎" },
  { href: "/settings", label: "Settings", icon: "⚙" },
];

export function Sidebar() {
  const sidebarOpen = useLayoutStore((s) => s.sidebarOpen);
  const mobileSidebarOpen = useLayoutStore((s) => s.mobileSidebarOpen);
  const setMobileSidebarOpen = useLayoutStore((s) => s.setMobileSidebarOpen);
  const pathname = usePathname();
  const [newSessionOpen, setNewSessionOpen] = useState(false);

  return (
    <>
      {mobileSidebarOpen && (
        <div
          className="sidebar-backdrop"
          onClick={() => setMobileSidebarOpen(false)}
        />
      )}

      <aside
        className={`sidebar ${sidebarOpen ? "sidebar--open" : "sidebar--closed"} ${
          mobileSidebarOpen ? "sidebar--mobile-open" : ""
        }`}
      >
        <div className="sidebar__inner">
          <div className="sidebar__mobile-close">
            <button
              className="sidebar__close-btn"
              onClick={() => setMobileSidebarOpen(false)}
              aria-label="Close sidebar"
            >
              ✕
            </button>
          </div>
          <div className="sidebar__nav">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`sidebar__nav-item ${
                  pathname === item.href || pathname.startsWith(item.href + "/")
                    ? "sidebar__nav-item--active"
                    : ""
                }`}
                onClick={() => setMobileSidebarOpen(false)}
              >
                <span className="sidebar__nav-icon">{item.icon}</span>
                <span className="sidebar__nav-label">{item.label}</span>
              </Link>
            ))}
          </div>

          <div className="sidebar__divider" />

          <div className="sidebar__sessions-header">
            <h3 className="sidebar__sessions-title">Sessions</h3>
            <button
              className="sidebar__new-btn"
              onClick={() => setNewSessionOpen(true)}
              aria-label="New session"
            >
              +
            </button>
          </div>

          <SessionList onNewSession={() => setNewSessionOpen(true)} />
        </div>

        <NewSessionDialog
          open={newSessionOpen}
          onClose={() => setNewSessionOpen(false)}
        />
      </aside>
    </>
  );
}

// ============================================================
// FILE: src/features/layout/components/sidebar.tsx
// ============================================================
// PURPOSE: The application sidebar containing navigation links and a session list.
// HOW IT WORKS: Reads sidebar open/closed state from the layout store, highlights the active nav item via usePathname, and renders a mobile backdrop overlay when open. The sessions section includes a "New" button that opens the NewSessionDialog, plus an embedded SessionList.
// PROPS: None (self-contained, reads state from store).
// INTEGRATION: layout-store, SessionList, NewSessionDialog, Next.js Link/usePathname.
// ============================================================
