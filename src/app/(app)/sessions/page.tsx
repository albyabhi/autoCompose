"use client";

import { useSessions } from "@/features/sessions/hooks/use-sessions";
import { SessionCard } from "@/features/sessions/components/session-card";
import { SkeletonList } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { NewSessionDialog } from "@/features/sessions/components/new-session-dialog";
import { useState } from "react";

export default function SessionsPage() {
  const { data, isLoading, isError } = useSessions({ pageSize: 50 });
  const [newOpen, setNewOpen] = useState(false);

  if (isLoading) {
    return (
      <div className="sessions-page">
        <h1 className="sessions-page__title">Session History</h1>
        <SkeletonList count={5} />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="sessions-page">
        <h1 className="sessions-page__title">Session History</h1>
        <div className="settings-message settings-message--error">
          Failed to load sessions. Please try again.
        </div>
      </div>
    );
  }

  const sessions = data?.items ?? [];

  return (
    <div className="sessions-page">
      <div className="sessions-page__header">
        <h1 className="sessions-page__title">Session History</h1>
        <button
          className="btn btn--primary"
          onClick={() => setNewOpen(true)}
        >
          New Session
        </button>
      </div>

      {sessions.length === 0 ? (
        <EmptyState
          icon="✦"
          title="No sessions yet"
          description="Create your first session to start generating emails with AI."
          action={
            <button
              className="btn btn--primary"
              onClick={() => setNewOpen(true)}
            >
              Create Session
            </button>
          }
        />
      ) : (
        <div className="sessions-page__list">
          {sessions.map((session) => (
            <SessionCard key={session.id} session={session} />
          ))}
        </div>
      )}

      <NewSessionDialog open={newOpen} onClose={() => setNewOpen(false)} />
    </div>
  );
}

// ============================================================
// FILE: src/app/(app)/sessions/page.tsx
// ============================================================
// PURPOSE: Sessions list page — displays all user sessions with creation/management.
// HOW IT WORKS: Client component that fetches sessions via useSessions() hook (50
//   page size). Shows skeleton loading state, error message, or empty state with
//   "Create Session" CTA. When sessions exist, renders a list of SessionCard
//   components. A "New Session" button opens the NewSessionDialog modal. Sessions
//   are fetched from /api/sessions via TanStack Query.
// INTEGRATION: useSessions hook, SessionCard, NewSessionDialog, API client
// ============================================================
