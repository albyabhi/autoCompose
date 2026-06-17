"use client";

import { useState, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { useSendEntry } from "../hooks/use-bulk";
import type { BulkEntryData } from "../types";

interface BulkSendBarProps {
  entries: BulkEntryData[];
  onComplete: () => void;
}

export function BulkSendBar({ entries, onComplete }: BulkSendBarProps) {
  const sendMutation = useSendEntry();
  const [sending, setSending] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0, failed: 0 });
  const abortRef = useRef(false);

  const generated = entries.filter((e) => e.status === "generated");
  const totalCount = entries.length;
  const generatedCount = generated.length;
  const sentCount = entries.filter((e) => e.status === "sent").length;
  const failedCount = entries.filter((e) => e.status === "failed").length;

  const sendOne = useCallback(
    async (entry: BulkEntryData): Promise<boolean> => {
      try {
        const result = await sendMutation.mutateAsync(entry.id);
        return result.ok;
      } catch {
        return false;
      }
    },
    [sendMutation]
  );

  async function handleSendAll() {
    if (generated.length === 0) return;
    setSending(true);
    abortRef.current = false;
    setProgress({ current: 0, total: generated.length, failed: 0 });

    let failed = 0;
    for (let i = 0; i < generated.length; i++) {
      if (abortRef.current) break;

      const ok = await sendOne(generated[i]);
      if (!ok) failed++;

      setProgress({ current: i + 1, total: generated.length, failed });

      // 12 second gap between sends to respect 5/min rate limit
      if (i < generated.length - 1 && !abortRef.current) {
        await new Promise((resolve) => setTimeout(resolve, 12000));
      }
    }

    setSending(false);
    onComplete();
  }

  function handleAbort() {
    abortRef.current = true;
    setSending(false);
  }

  const pct = progress.total > 0 ? Math.round((progress.current / progress.total) * 100) : 0;

  return (
    <div className="bulk-send-bar">
      <div className="bulk-send-bar__stats">
        <span>{totalCount} rows</span>
        <span className="bulk-send-bar__dot">·</span>
        <span className="bulk-send-bar__generated">{generatedCount} ready</span>
        {sentCount > 0 && (
          <>
            <span className="bulk-send-bar__dot">·</span>
            <span className="bulk-send-bar__sent">{sentCount} sent</span>
          </>
        )}
        {failedCount > 0 && (
          <>
            <span className="bulk-send-bar__dot">·</span>
            <span className="bulk-send-bar__failed">{failedCount} failed</span>
          </>
        )}
      </div>

      {sending ? (
        <div className="bulk-send-bar__progress">
          <div className="bulk-send-bar__bar">
            <div
              className="bulk-send-bar__fill"
              style={{ width: `${pct}%` }}
            />
          </div>
          <span className="bulk-send-bar__label">
            Sending {progress.current}/{progress.total}
            {progress.failed > 0 && ` (${progress.failed} failed)`}
          </span>
          <Button variant="ghost" onClick={handleAbort}>Stop</Button>
        </div>
      ) : (
        <Button
          variant="primary"
          disabled={generatedCount === 0}
          onClick={handleSendAll}
        >
          Send All ({generatedCount})
        </Button>
      )}
    </div>
  );
}
