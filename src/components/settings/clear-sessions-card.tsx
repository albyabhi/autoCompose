"use client";

import { useState, useCallback } from "react";
import { useClearAllSessions } from "@/features/sessions/hooks/use-sessions";
import { useSessions } from "@/features/sessions/hooks/use-sessions";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardBody, CardFooter } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export function ClearSessionsCard() {
  const {
    data: sessionsData,
    isLoading: sessionsLoading,
    isError: sessionsError,
    refetch: refetchSessions,
    isRefetching: sessionsRefetching,
  } = useSessions({ pageSize: 1 });
  const { mutateAsync, isPending: isClearing } = useClearAllSessions();
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Undefined (pre-fetch) must stay unknown — never coerce to 0, otherwise
  // the first render flashes the "No active sessions" empty state.
  const isInitialLoading = sessionsLoading && !sessionsData;
  const totalSessions = sessionsData?.total ?? 0;
  const showFetchError = sessionsError && !sessionsData && !isInitialLoading;

  const handleClear = useCallback(async () => {
    setResult(null);
    setError(null);

    if (isInitialLoading || totalSessions === 0) return;

    if (!confirm(`Delete all ${totalSessions} session${totalSessions !== 1 ? "s" : ""}? This cannot be undone.`)) return;

    try {
      const res = await mutateAsync();
      setResult(`Cleared ${res.clearedCount} session${res.clearedCount !== 1 ? "s" : ""}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to clear sessions");
    }
  }, [totalSessions, mutateAsync, isInitialLoading]);

  return (
    <Card className="clear-sessions-card">
      <CardHeader>
        <h2 className="clear-sessions-card__title">Data Management</h2>
      </CardHeader>
      <CardBody>
        <div aria-live="polite" aria-busy={isInitialLoading}>
          {isInitialLoading ? (
            <div role="status" aria-label="Loading session count">
              <Skeleton height="16px" width="80%" />
              <p className="clear-sessions-card__description">
                Loading session count…
              </p>
            </div>
          ) : showFetchError ? (
            <>
              <p className="clear-sessions-card__error">
                Failed to load sessions.
              </p>
              <Button
                variant="secondary"
                onClick={() => void refetchSessions()}
                disabled={sessionsRefetching}
                loading={sessionsRefetching}
              >
                Retry
              </Button>
            </>
          ) : (
            <p className="clear-sessions-card__description">
              {totalSessions > 0
                ? `You have ${totalSessions} active session${totalSessions !== 1 ? "s" : ""}. Clearing will soft-delete all of them.`
                : "No active sessions to clear."}
            </p>
          )}
        </div>
        {result && <p className="clear-sessions-card__success">{result}</p>}
        {error && <p className="clear-sessions-card__error">{error}</p>}
      </CardBody>
      <CardFooter>
        <Button
          variant="danger"
          onClick={handleClear}
          loading={isClearing || isInitialLoading}
          disabled={
            isInitialLoading || totalSessions === 0 || isClearing
          }
        >
          Clear All Sessions
        </Button>
      </CardFooter>
    </Card>
  );
}

// ============================================================
// FILE: src/components/settings/clear-sessions-card.tsx
// ============================================================
// PURPOSE: Settings card showing the session count with a Clear All action.
// HOW IT WORKS: Counts sessions via useSessions(pageSize: 1). Shows a Skeleton
//   loading branch while the first fetch is pending (never coerces
//   undefined to 0, so no empty-state flash), a Retry branch on fetch error,
//   then the count/empty state. Clear runs useClearAllSessions after confirm.
// INTEGRATION: TanStack Query sessions hooks, Button/Card/Skeleton primitives.
// ============================================================
