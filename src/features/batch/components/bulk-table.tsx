"use client";

import { useState } from "react";
import { BulkRow } from "./bulk-row";
import { BulkSendBar } from "./bulk-send-bar";
import { BulkPreviewDialog } from "./bulk-preview-dialog";
import { EmptyState } from "@/components/ui/empty-state";
import type { BulkEntryData } from "../types";

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

      <BulkSendBar entries={entries} onComplete={() => {}} sharedFiles={sharedFiles} />

      {previewEntry && (
        <BulkPreviewDialog
          entry={previewEntry}
          onClose={() => setPreviewEntry(null)}
        />
      )}
    </div>
  );
}

// ============================================================
// FILE: src/features/batch/components/bulk-table.tsx
// ============================================================
// PURPOSE: Container component for the list of batch entries, send bar, and preview dialog.
// HOW IT WORKS: Renders an EmptyState when no entries exist (with title "No batch entries yet" and a CTA button). When entries exist, maps them to BulkRow components. Includes BulkSendBar at the bottom and BulkPreviewDialog modal for previewing emails before sending.
// PROPS: entries (BulkEntryData[]), modelId (string), onAddRow (callback), sharedFiles (File[]), rowFilesMap (Record), onRowFilesChange (callback).
// INTEGRATION: BulkRow, BulkSendBar, BulkPreviewDialog, EmptyState.
// ============================================================
