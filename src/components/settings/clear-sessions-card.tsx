"use client";

import { useState, useCallback } from "react";
import { useClearAllSessions } from "@/features/sessions/hooks/use-sessions";
import { useSessions } from "@/features/sessions/hooks/use-sessions";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardBody, CardFooter } from "@/components/ui/card";

export function ClearSessionsCard() {
  const { data: sessionsData } = useSessions({ pageSize: 1 });
  const { mutateAsync, isPending } = useClearAllSessions();
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const totalSessions = sessionsData?.total ?? 0;

  const handleClear = useCallback(async () => {
    setResult(null);
    setError(null);

    if (totalSessions === 0) return;

    if (!confirm(`Delete all ${totalSessions} session${totalSessions !== 1 ? "s" : ""}? This cannot be undone.`)) return;

    try {
      const res = await mutateAsync();
      setResult(`Cleared ${res.clearedCount} session${res.clearedCount !== 1 ? "s" : ""}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to clear sessions");
    }
  }, [totalSessions, mutateAsync]);

  return (
    <Card className="clear-sessions-card">
      <CardHeader>
        <h2 className="clear-sessions-card__title">Data Management</h2>
      </CardHeader>
      <CardBody>
        <p className="clear-sessions-card__description">
          {totalSessions > 0
            ? `You have ${totalSessions} active session${totalSessions !== 1 ? "s" : ""}. Clearing will soft-delete all of them.`
            : "No active sessions to clear."}
        </p>
        {result && <p className="clear-sessions-card__success">{result}</p>}
        {error && <p className="clear-sessions-card__error">{error}</p>}
      </CardBody>
      <CardFooter>
        <Button
          variant="danger"
          onClick={handleClear}
          loading={isPending}
          disabled={totalSessions === 0 || isPending}
        >
          Clear All Sessions
        </Button>
      </CardFooter>
    </Card>
  );
}
