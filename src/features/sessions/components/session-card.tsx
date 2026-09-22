"use client";

import type { SessionData } from "@/modules/session/types";
import { useRouter, usePathname } from "next/navigation";
import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { useDeleteSession, useToggleArchive, useUpdateSession } from "../hooks/use-sessions";

const CATEGORY_LABELS: Record<string, string> = {
  job_application: "Job Application",
  leave_request: "Leave Request",
  sick_leave: "Sick Leave",
  resignation: "Resignation",
  complaint: "Complaint",
  meeting_request: "Meeting Request",
  custom: "Custom",
};

interface SessionCardProps {
  session: SessionData;
  onClose?: () => void;
}

export function SessionCard({ session, onClose }: SessionCardProps) {
  const router = useRouter();
  const pathname = usePathname();
  const isActive = pathname === `/sessions/${session.id}`;
  
  const [menuOpen, setMenuOpen] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [newTitle, setNewTitle] = useState(session.title);
  const menuBtnRef = useRef<HTMLButtonElement>(null);
  const [flipUp, setFlipUp] = useState(false);
  const [menuPos, setMenuPos] = useState<{ top: number; left: number } | null>(null);

  const deleteMutation = useDeleteSession();
  const archiveMutation = useToggleArchive();
  const updateMutation = useUpdateSession();

  function handleOpen() {
    router.push(`/sessions/${session.id}`);
    onClose?.();
  }

  function handleRename() {
    if (newTitle.trim() && newTitle !== session.title) {
      updateMutation.mutate({ id: session.id, input: { title: newTitle.trim() } });
    }
    setRenaming(false);
  }

  function handleDelete() {
    deleteMutation.mutate(session.id);
    closeMenu();
  }

  function handleArchive() {
    archiveMutation.mutate({ id: session.id, archived: !session.isArchived });
    closeMenu();
  }

  function closeMenu() {
    setMenuOpen(false);
    setFlipUp(false);
    setMenuPos(null);
  }

  useEffect(() => {
    if (!menuOpen) return;
    const el = menuBtnRef.current;
    if (!el) return;
    const MENU_W = 140;
    const MENU_H = 108; // approx 3 items
    const GAP = 4;
    function calc() {
      const el = menuBtnRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      const spaceAbove = rect.top;
      const shouldFlip = spaceBelow < MENU_H + GAP && spaceAbove > spaceBelow;
      setFlipUp(shouldFlip);
      let top = shouldFlip ? rect.top - MENU_H - GAP : rect.bottom + GAP;
      // Clamp vertically to viewport
      top = Math.max(8, Math.min(top, window.innerHeight - MENU_H - 8));
      // Right-align to button edge; clamp horizontally
      let left = rect.right - MENU_W;
      left = Math.max(8, Math.min(left, window.innerWidth - MENU_W - 8));
      setMenuPos({ top, left });
    }
    calc();
    // Re-calc on resize; on scroll inside sidebar we close (avoids drift)
    window.addEventListener("resize", calc);
    const handleScroll = () => {
      // If user scrolls sidebar heavily, close to avoid stale position
      // For small moves we recalc, for simplicity recalc
      calc();
    };
    window.addEventListener("scroll", handleScroll, true);
    return () => {
      window.removeEventListener("resize", calc);
      window.removeEventListener("scroll", handleScroll, true);
    };
  }, [menuOpen]);

  // Close on Escape and return focus
  useEffect(() => {
    if (!menuOpen) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        closeMenu();
        menuBtnRef.current?.focus();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [menuOpen]);

  const categoryLabel = CATEGORY_LABELS[session.category] ?? session.category;
  
  const dateObj = new Date(session.lastMessageAt || session.createdAt);
  const now = new Date();
  
  const d = new Date(dateObj.getFullYear(), dateObj.getMonth(), dateObj.getDate());
  const n = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const diffDays = Math.round((n.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
  
  let timeAgo = "";
  if (diffDays === 0) {
    timeAgo = "Today";
  } else if (diffDays === 1) {
    timeAgo = "Yesterday";
  } else if (dateObj.getFullYear() === now.getFullYear()) {
    timeAgo = dateObj.toLocaleDateString('en-US', { day: 'numeric', month: 'short' });
  } else {
    timeAgo = dateObj.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
  }

  return (
    <div className={`session-card ${isActive ? "session-card--active" : ""}`}>
      {renaming ? (
        <div className="session-card__rename">
          <input
            className="session-card__rename-input"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleRename();
              if (e.key === "Escape") setRenaming(false);
            }}
            autoFocus
            onClick={(e) => e.stopPropagation()}
          />
          <button className="session-card__rename-btn" onClick={handleRename}>
            ✓
          </button>
        </div>
      ) : (
        <button className="session-card__main" onClick={handleOpen}>
          <span className="session-card__title">
            {session.title}
            {session.type === "batch" && <span className="session-card__batch-badge">Batch</span>}
          </span>
          <span className="session-card__meta">
            <span className="session-card__category">{categoryLabel}</span>
            <span className="session-card__date">{timeAgo}</span>
            {session.messageCount !== undefined && session.type !== "batch" && (
              <span className="session-card__count">{session.messageCount} msgs</span>
            )}
          </span>
        </button>
      )}

      <div className="session-card__actions">
        <button
          ref={menuBtnRef}
          className="session-card__menu-btn"
          onClick={() => {
            if (menuOpen) {
              closeMenu();
            } else {
              setMenuOpen(true);
            }
          }}
          aria-label="Session actions"
          aria-haspopup="menu"
          aria-expanded={menuOpen}
        >
          ⋯
        </button>
        {menuOpen &&
          menuPos &&
          typeof document !== "undefined" &&
          createPortal(
            <>
              <div
                className="session-card__backdrop session-card__backdrop--portal"
                onClick={closeMenu}
                aria-hidden="true"
              />
              <div
                className={`session-card__menu session-card__menu--portal ${flipUp ? "session-card__menu--flip" : ""}`}
                style={{ top: menuPos.top, left: menuPos.left }}
                role="menu"
              >
                <button
                  className="session-card__menu-item"
                  role="menuitem"
                  onClick={() => { setRenaming(true); closeMenu(); }}
                >
                  Rename
                </button>
                <button
                  className="session-card__menu-item"
                  role="menuitem"
                  onClick={handleArchive}
                >
                  {session.isArchived ? "Unarchive" : "Archive"}
                </button>
                <button
                  className="session-card__menu-item session-card__menu-item--danger"
                  role="menuitem"
                  onClick={handleDelete}
                >
                  Delete
                </button>
              </div>
            </>,
            document.body
          )}
      </div>
    </div>
  );
}

// ============================================================
// FILE: src/features/sessions/components/session-card.tsx
// ============================================================
// PURPOSE: A clickable card representing a single session with actions menu (rename, archive, delete).
// HOW IT works: Displays the session title, category label, relative date (Today/Yesterday/n), and message count. Clicking navigates to /sessions/:id. The overflow menu offers rename (inline edit), archive/unarchive, and delete via useDeleteSession/useToggleArchive/useUpdateSession mutations.
// PROPS: session (SessionData), onClose (() => void).
// INTEGRATION: useDeleteSession/useToggleArchive/useUpdateSession hooks, Next.js useRouter/usePathname.
// ============================================================
