"use client";

import { useState, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { useSendEntry, useSendEntryWithAttachments, useUploadAttachments } from "../hooks/use-bulk";
import type { BulkEntryData } from "../types";

interface BulkSendBarProps {
  entries: BulkEntryData[];
  onComplete: () => void;
  sharedFiles?: File[];
  rowFilesMap?: Record<string, File[]>;
  onScheduleAll?: () => void;
}

export function BulkSendBar({ entries, onComplete, sharedFiles = [], rowFilesMap = {}, onScheduleAll }: BulkSendBarProps) {
  const sendMutation = useSendEntry();
  const sendWithAttachmentsMutation = useSendEntryWithAttachments();
  const uploadMutation = useUploadAttachments();
  const [sending, setSending] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0, failed: 0, phase: "idle" as "idle" | "uploading" | "sending" });
  const abortRef = useRef(false);
  const sharedAttachmentIds = useRef<string[]>([]);

  const generated = entries.filter((e) => e.status === "generated");
  const totalCount = entries.length;
  const generatedCount = generated.length;
  const sentCount = entries.filter((e) => e.status === "sent").length;
  const failedCount = entries.filter((e) => e.status === "failed").length;

  const hasSharedFiles = sharedFiles.length > 0;

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

  const sendOneWithAttachments = useCallback(
    async (
      entry: BulkEntryData,
      sharedIds: string[],
      rowIds: string[]
    ): Promise<boolean> => {
      try {
        const result = await sendWithAttachmentsMutation.mutateAsync({
          entryId: entry.id,
          sharedAttachmentIds: sharedIds,
          rowAttachmentIds: rowIds,
        });
        return result.ok;
      } catch {
        return false;
      }
    },
    [sendWithAttachmentsMutation]
  );

  const hasAnyFiles = (entry: BulkEntryData): boolean => {
    return hasSharedFiles || (rowFilesMap[entry.id]?.length ?? 0) > 0;
  };

  async function handleSendAll() {
    if (generated.length === 0) return;
    setSending(true);
    abortRef.current = false;

    // Phase 1: Pre-upload shared files
    if (hasSharedFiles) {
      setProgress({ current: 0, total: generated.length, failed: 0, phase: "uploading" });
      setUploading(true);
      try {
        const result = await uploadMutation.mutateAsync(sharedFiles);
        sharedAttachmentIds.current = result.ids;
      } catch {
        // If shared upload fails, can't proceed
        setSending(false);
        setUploading(false);
        setProgress({ current: 0, total: generated.length, failed: 0, phase: "idle" });
        return;
      }
      setUploading(false);
    }

    // Phase 2: Pre-upload unique row files
    const rowAttachmentIdsMap: Record<string, string[]> = {};
    const entriesWithRowFiles = generated.filter((e) => (rowFilesMap[e.id]?.length ?? 0) > 0);
    for (const entry of entriesWithRowFiles) {
      const rowFiles = rowFilesMap[entry.id];
      if (!rowFiles || rowFiles.length === 0) continue;
      try {
        const result = await uploadMutation.mutateAsync(rowFiles);
        rowAttachmentIdsMap[entry.id] = result.ids;
      } catch {
        // Skip this entry's row files, proceed with shared only
        rowAttachmentIdsMap[entry.id] = [];
      }
    }

    // Phase 3: Send all entries
    setProgress({ current: 0, total: generated.length, failed: 0, phase: "sending" });
    let failed = 0;
    for (let i = 0; i < generated.length; i++) {
      if (abortRef.current) break;

      const entry = generated[i];
      let ok: boolean;

      if (hasAnyFiles(entry)) {
        ok = await sendOneWithAttachments(
          entry,
          sharedAttachmentIds.current,
          rowAttachmentIdsMap[entry.id] ?? []
        );
      } else {
        ok = await sendOne(entry);
      }

      if (!ok) failed++;
      setProgress({ current: i + 1, total: generated.length, failed, phase: "sending" });

      if (i < generated.length - 1 && !abortRef.current) {
        await new Promise((resolve) => setTimeout(resolve, 12000));
      }
    }

    setSending(false);
    setProgress({ current: 0, total: 0, failed: 0, phase: "idle" });
    onComplete();
  }

  function handleAbort() {
    abortRef.current = true;
    setSending(false);
    setUploading(false);
  }

  const pct = progress.total > 0 ? Math.round((progress.current / progress.total) * 100) : 0;
  const isUploading = progress.phase === "uploading";

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
        {hasSharedFiles && (
          <>
            <span className="bulk-send-bar__dot">·</span>
            <span className="bulk-send-bar__attachments">{sharedFiles.length} shared file{sharedFiles.length !== 1 ? "s" : ""}</span>
          </>
        )}
      </div>

      {sending ? (
        <div className="bulk-send-bar__progress">
          <div className="bulk-send-bar__bar">
            <div
              className="bulk-send-bar__fill"
              style={{ width: isUploading ? 100 : pct }}
            />
          </div>
          <span className="bulk-send-bar__label">
            {isUploading
              ? "Uploading attachments..."
              : `Sending ${progress.current}/${progress.total}${progress.failed > 0 ? ` (${progress.failed} failed)` : ""}`}
          </span>
          <Button variant="ghost" onClick={handleAbort}>Stop</Button>
        </div>
      ) : (
        <div className="bulk-send-bar__actions">
          <Button
            variant="secondary"
            disabled={entries.length === 0}
            onClick={onScheduleAll}
            title="Attachments are not included in scheduled sends"
          >
            Add All to Schedule
          </Button>
          <Button
            variant="primary"
            disabled={generatedCount === 0}
            onClick={handleSendAll}
          >
            Send All ({generatedCount})
          </Button>
        </div>
      )}
    </div>
  );
}
