"use client";

import { useState } from "react";
import { BulkRow } from "./bulk-row";
import { BulkSendBar } from "./bulk-send-bar";
import { BulkPreviewDialog } from "./bulk-preview-dialog";
import { EmptyState } from "@/components/ui/empty-state";
import type { BulkEntryData } from "../types";
import { AddToScheduleDialog } from "@/features/schedule/components/add-to-schedule-dialog";
import type { AddScheduledEmailPayload } from "@/features/schedule/types";

interface BulkTableProps {
  entries: BulkEntryData[];
  modelId: string;
  onAddRow: () => void;
  sharedFiles?: File[];
  rowFilesMap?: Record<string, File[]>;
  onRowFilesChange?: (entryId: string, files: File[]) => void;
}

export function BulkTable({
  entries,
  modelId,
  onAddRow,
  sharedFiles = [],
  rowFilesMap = {},
  onRowFilesChange,
}: BulkTableProps) {
  const [previewEntry, setPreviewEntry] = useState<BulkEntryData | null>(null);
  const [schedulePayloads, setSchedulePayloads] = useState<AddScheduledEmailPayload[]>([]);
  const [scheduleSkippedCount, setScheduleSkippedCount] = useState(0);
  const [scheduleDialogOpen, setScheduleDialogOpen] = useState(false);

  function toSchedulePayload(entry: BulkEntryData): AddScheduledEmailPayload | null {
    if (!entry.recipient?.trim()) return null;
    if (entry.status === "generating" || entry.status === "sending" || entry.status === "sent") {
      return null;
    }
    if (!entry.generatedContent && entry.prompt.length < 10) return null;
    return {
      sourceType: "batch",
      sourceBulkEntryId: entry.id,
      modelId,
    };
  }

  function openScheduleDialog(targetEntries: BulkEntryData[]) {
    const payloads = targetEntries
      .map(toSchedulePayload)
      .filter((payload): payload is AddScheduledEmailPayload => payload !== null);
    setSchedulePayloads(payloads);
    setScheduleSkippedCount(targetEntries.length - payloads.length);
    setScheduleDialogOpen(true);
  }

  return (
    <div className="bulk-table-wrapper">
      {entries.length === 0 ? (
        <EmptyState
          icon="✉"
          title="No batch entries yet"
          description="Add rows to begin generating personalized emails."
          action={
            <button className="bulk-table__add-row" onClick={onAddRow}>
              + Add Row
            </button>
          }
        />
      ) : (
        <div className="bulk-list">
          {entries.map((entry) => (
            <BulkRow
              key={entry.id}
              entry={entry}
              modelId={modelId}
              onPreview={setPreviewEntry}
              onSchedule={(entry) => openScheduleDialog([entry])}
              rowFiles={rowFilesMap[entry.id] ?? []}
              onRowFilesChange={
                onRowFilesChange
                  ? (files) => onRowFilesChange(entry.id, files)
                  : undefined
              }
            />
          ))}
        </div>
      )}

      {entries.length > 0 && (
        <button className="bulk-table__add-row" onClick={onAddRow}>
          + Add Row
        </button>
      )}

      <BulkSendBar
        entries={entries}
        onComplete={() => {}}
        sharedFiles={sharedFiles}
        rowFilesMap={rowFilesMap}
        onScheduleAll={() => openScheduleDialog(entries)}
      />

      {previewEntry && (
        <BulkPreviewDialog
          entry={previewEntry}
          onClose={() => setPreviewEntry(null)}
          onSchedule={(entry) => openScheduleDialog([entry])}
        />
      )}
      <AddToScheduleDialog
        open={scheduleDialogOpen}
        onClose={() => setScheduleDialogOpen(false)}
        emails={schedulePayloads}
        skippedCount={scheduleSkippedCount}
        title="Add Batch to Schedule"
      />
    </div>
  );
}

// ============================================================
// FILE: src/features/batch/components/bulk-table.tsx
// ============================================================
// PURPOSE: Container component for the list of batch entries, send bar, and preview dialog.
// HOW IT WORKS: Renders an EmptyState when no entries exist and maps entries
//   to BulkRow components. Includes send/schedule bulk actions and a preview modal.
// PROPS: entries (BulkEntryData[]), modelId (string), onAddRow (callback), sharedFiles (File[]), rowFilesMap (Record), onRowFilesChange (callback).
// INTEGRATION: BulkRow, BulkSendBar, BulkPreviewDialog, EmptyState.
// ============================================================
