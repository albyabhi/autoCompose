"use client";

import type { SessionData } from "../types";
import { useRouter, usePathname } from "next/navigation";
import { useState } from "react";
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
    setMenuOpen(false);
  }

  function handleArchive() {
    archiveMutation.mutate({ id: session.id, archived: !session.isArchived });
    setMenuOpen(false);
  }

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
          className="session-card__menu-btn"
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label="Session actions"
        >
          ⋯
        </button>
        {menuOpen && (
          <>
            <div className="session-card__backdrop" onClick={() => setMenuOpen(false)} />
            <div className="session-card__menu">
              <button
                className="session-card__menu-item"
                onClick={() => { setRenaming(true); setMenuOpen(false); }}
              >
                Rename
              </button>
              <button
                className="session-card__menu-item"
                onClick={handleArchive}
              >
                {session.isArchived ? "Unarchive" : "Archive"}
              </button>
              <button
                className="session-card__menu-item session-card__menu-item--danger"
                onClick={handleDelete}
              >
                Delete
              </button>
            </div>
          </>
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
