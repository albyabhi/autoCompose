"use client";

import { useLayoutStore } from "@/features/layout/stores/layout-store";
import { SessionList } from "@/features/sessions/components/session-list";
import { NewSessionDialog } from "@/features/sessions/components/new-session-dialog";
import { SidebarFooter } from "@/features/layout/components/sidebar-footer";
import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useGuest } from "@/features/guest/hooks/use-guest";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: "▦" },
  { href: "/", label: "Compose", icon: "✎" },
  { href: "/schedules", label: "Schedules", icon: "T" },
  { href: "/settings", label: "Settings", icon: "⚙" },
];

export function Sidebar() {
  const sidebarOpen = useLayoutStore((s) => s.sidebarOpen);
  const mobileSidebarOpen = useLayoutStore((s) => s.mobileSidebarOpen);
  const setMobileSidebarOpen = useLayoutStore((s) => s.setMobileSidebarOpen);
  const pathname = usePathname();
  const router = useRouter();
  const { status } = useSession();
  const { isGuestMode } = useGuest();
  const [newSessionOpen, setNewSessionOpen] = useState(false);
  const [showArchived, setShowArchived] = useState(false);

  function handleLockedNav(e: React.MouseEvent) {
    e.preventDefault();
    setMobileSidebarOpen(false);
    router.push("/login");
  }

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
            {navItems.map((item) => {
              const isCompose = item.href === "/";
              const locked = isGuestMode && !isCompose;
              return (
                <Link
                  key={item.href}
                  href={locked ? "/login" : item.href}
                  className={`sidebar__nav-item ${
                    pathname === item.href || pathname.startsWith(item.href + "/")
                      ? "sidebar__nav-item--active"
                      : ""
                  }${locked ? " sidebar__nav-item--locked" : ""}`}
                  onClick={(e) => {
                    if (locked) handleLockedNav(e);
                    else setMobileSidebarOpen(false);
                  }}
                  aria-disabled={locked}
                  title={locked ? "Login to access this section" : undefined}
                >
                  <span className="sidebar__nav-icon">{item.icon}</span>
                  <span className="sidebar__nav-label">{item.label}</span>
                </Link>
              );
            })}
          </div>

          <div className="sidebar__divider" />

          {isGuestMode ? (
            <div className="sidebar__guest-note">
              <p className="sidebar__guest-text">
                Guest trial — single compose only. Login for sessions, batch & schedules.
              </p>
              <button
                className="sidebar__new-btn sidebar__new-btn--disabled"
                disabled
                title="Login to create sessions"
                aria-label="New session (login required)"
              >
                +
              </button>
            </div>
          ) : (
            <>
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

              <SessionList
                onNewSession={() => setNewSessionOpen(true)}
                onClose={() => setMobileSidebarOpen(false)}
              />

              <div className="sidebar__divider" />

              <button
                type="button"
                className={`sidebar__archives-toggle ${
                  showArchived ? "sidebar__archives-toggle--open" : ""
                }`}
                onClick={() => setShowArchived((v) => !v)}
                aria-expanded={showArchived}
                aria-controls="sidebar-archives"
                title={showArchived ? "Hide archived sessions" : "Show archived sessions"}
              >
                <span className="sidebar__archives-label">Archives</span>
                <span
                  className="sidebar__archives-chevron"
                  aria-hidden="true"
                >
                  {showArchived ? "▾" : "▸"}
                </span>
              </button>

              {showArchived && (
                <div
                  id="sidebar-archives"
                  className="sidebar__archives-list"
                >
                  <SessionList
                    isArchived={true}
                    onClose={() => setMobileSidebarOpen(false)}
                  />
                </div>
              )}
            </>
          )}

          <SidebarFooter />
        </div>

        {status !== "unauthenticated" || !isGuestMode ? (
          <NewSessionDialog
            open={newSessionOpen}
            onClose={() => setNewSessionOpen(false)}
          />
        ) : null}
      </aside>
    </>
  );
}

// ============================================================
// FILE: src/features/layout/components/sidebar.tsx
// ============================================================
// PURPOSE: The application sidebar containing navigation links, session list, and archives section.
// HOW IT WORKS: Reads sidebar open/closed state from the layout store, highlights the active nav item via usePathname, and renders a mobile backdrop overlay when open. For guest-trial visitors only Compose stays enabled — other nav items redirect to /login and the sessions section is replaced with a trial note. The sessions section includes a "New" button that opens the NewSessionDialog, an active SessionList (isArchived=false), and a collapsible Archives toggle rendering SessionList with isArchived=true; archived cards reuse SessionCard Unarchive to remove from archive.
// PROPS: None (self-contained, reads state from store).
// INTEGRATION: layout-store, SessionList, NewSessionDialog, Next.js Link/usePathname, next-auth session, useGuest gate.
// ============================================================
