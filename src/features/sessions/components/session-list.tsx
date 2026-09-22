"use client";

import { useInfiniteSessions } from "../hooks/use-sessions";
import { SessionCard } from "./session-card";
import { SessionListSkeleton } from "@/components/ui/skeleton";
import { useRef, useCallback } from "react";

interface SessionListProps {
  search?: string;
  isArchived?: boolean;
  onNewSession?: () => void;
  onClose?: () => void;
}

export function SessionList({ search, isArchived = false, onClose }: SessionListProps) {
  const {
    data,
    isLoading,
    isError,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteSessions({ search, isArchived });

  const observerRef = useRef<IntersectionObserver | null>(null);
  const lastItemRef = useCallback(
    (node: HTMLDivElement | null) => {
      if (isFetchingNextPage) return;
      if (observerRef.current) observerRef.current.disconnect();
      observerRef.current = new IntersectionObserver((entries) => {
        if (entries[0]?.isIntersecting && hasNextPage) {
          fetchNextPage();
        }
      });
      if (node) observerRef.current.observe(node);
    },
    [isFetchingNextPage, hasNextPage, fetchNextPage]
  );

  if (isLoading) {
    return (
      <div
        className="sidebar__sessions"
        role="status"
        aria-label="Loading sessions"
      >
        <SessionListSkeleton count={5} />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="sidebar__error">
        <p>Failed to load sessions</p>
      </div>
    );
  }

  const sessions = data?.pages.flatMap((p) => p.items) ?? [];

  if (sessions.length === 0) {
    return (
      <div className="sidebar__empty">
        <p className="sidebar__empty-text">
          {isArchived ? "No archived sessions" : "No sessions yet"}
        </p>
        {!isArchived && onClose && (
          <p className="sidebar__empty-hint">Click + to create one</p>
        )}
      </div>
    );
  }

  return (
    <div className="sidebar__sessions">
      {sessions.map((session, i) => (
        <div
          key={session.id}
          ref={i === sessions.length - 1 ? lastItemRef : undefined}
        >
          <SessionCard session={session} onClose={onClose} />
        </div>
      ))}
      {isFetchingNextPage && <SessionListSkeleton count={2} />}
    </div>
  );
}

// ============================================================
// FILE: src/features/sessions/components/session-list.tsx
// ============================================================
// PURPOSE: An infinitely-scrolling list of session cards used in the sidebar.
// HOW IT works: Uses useInfiniteSessions to load pages of sessions and attaches an IntersectionObserver to the last rendered card. When the sentinel enters the viewport, fetchNextPage is called automatically. Shows SessionListSkeleton (session-card-shaped, inside .sidebar__sessions) while loading, an EmptyState when no sessions exist, and SessionListSkeleton for the next-page loading indicator.
// PROPS: search (string), isArchived (boolean), onNewSession (() => void), onClose (() => void).
// INTEGRATION: useInfiniteSessions hook, SessionCard, SessionListSkeleton, EmptyState.
// ============================================================
