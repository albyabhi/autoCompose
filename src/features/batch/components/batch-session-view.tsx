"use client";

import { useState } from "react";
import { useBulkEntries, useBatchUpdateCategory } from "../hooks/use-bulk";
import { Button } from "@/components/ui/button";
import { BulkRow } from "./bulk-row";
import { BulkSendBar } from "./bulk-send-bar";
import { BulkPreviewDialog } from "./bulk-preview-dialog";
import { CATEGORY_OPTIONS, type EmailCategory } from "@/modules/email/categories";
import { AttachmentUpload } from "@/components/ui/attachment-upload";
import { useRouter } from "next/navigation";
import type { BulkEntryData } from "../types";

interface BatchSessionViewProps {
  sessionId: string;
  title: string;
  category: string;
}

export function BatchSessionView({ sessionId, title, category }: BatchSessionViewProps) {
  const { data: entries = [], isLoading } = useBulkEntries(sessionId);
  const [previewEntry, setPreviewEntry] = useState<BulkEntryData | null>(null);
  const [toolbarCategory, setToolbarCategory] = useState<EmailCategory>("custom");
  const [sharedFiles, setSharedFiles] = useState<File[]>([]);
  const [rowFilesMap, setRowFilesMap] = useState<Record<string, File[]>>({});
  const batchUpdateMutation = useBatchUpdateCategory();
  const router = useRouter();

  if (isLoading) {
    return <div className="session-detail"><div className="loading-spinner" /></div>;
  }

  const pendingCount = entries.filter((e) => e.status === "pending" || e.status === "failed").length;

  async function handleApplyCategoryToAll() {
    await batchUpdateMutation.mutateAsync({
      sessionId,
      category: toolbarCategory,
    });
  }

  function handleRowFilesChange(entryId: string, files: File[]) {
    setRowFilesMap((prev) => ({ ...prev, [entryId]: files }));
  }

  const sharedFileCount = sharedFiles.length;
  const totalRowFileCount = Object.values(rowFilesMap).reduce(
    (sum, files) => sum + files.length,
    0
  );

  return (
    <div className="session-detail">
      <div className="session-detail__header">
        <div>
          <h1 className="session-detail__title">{title}</h1>
          <span className="session-detail__category">
            <span className="session-card__batch-badge">Batch</span>
            {" · "}{category.replace(/_/g, " ")}
          </span>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <Button
            variant="primary"
            onClick={() => router.push(`/?mode=batch&sessionId=${sessionId}`)}
          >
            Open Batch
          </Button>
        </div>
      </div>

      {entries.length > 0 && (
        <div className="batch-toolbar">
          <div className="batch-toolbar__group">
            <span className="batch-toolbar__label">Mail Type</span>
            <div className="batch-toolbar__row">
              <select
                className="batch-toolbar__select"
                value={toolbarCategory}
                onChange={(e) => setToolbarCategory(e.target.value as EmailCategory)}
                aria-label="Mail type for bulk operations"
              >
                {CATEGORY_OPTIONS.map((cat) => (
                  <option key={cat.value} value={cat.value}>{cat.label}</option>
                ))}
              </select>
              <Button
                variant="secondary"
                disabled={pendingCount === 0 || batchUpdateMutation.isPending}
                onClick={handleApplyCategoryToAll}
              >
                Apply to All ({pendingCount})
              </Button>
            </div>
          </div>
          <AttachmentUpload
            files={sharedFiles}
            onFilesChange={setSharedFiles}
            label="Shared Attachments (sent to all)"
          />
          <div className="batch-toolbar__count">
            {entries.length} rows
            {sharedFileCount > 0 && ` · ${sharedFileCount} shared files`}
            {totalRowFileCount > 0 && ` · ${totalRowFileCount} row files`}
          </div>
        </div>
      )}

      {entries.length === 0 ? (
        <div className="session-detail__messages">
          <p className="bulk-table__empty">No entries in this batch session.</p>
        </div>
      ) : (
        <div className="bulk-table-wrapper">
          <div className="bulk-list">
            {entries.map((entry) => (
              <BulkRow
                key={entry.id}
                entry={entry}
                modelId="deepseek"
                onPreview={setPreviewEntry}
                rowFiles={rowFilesMap[entry.id] ?? []}
                onRowFilesChange={(files) => handleRowFilesChange(entry.id, files)}
              />
            ))}
          </div>
          <BulkSendBar entries={entries} onComplete={() => {}} sharedFiles={sharedFiles} rowFilesMap={rowFilesMap} />
        </div>
      )}

      {previewEntry && (
        <BulkPreviewDialog
          entry={previewEntry}
          onClose={() => setPreviewEntry(null)}
        />
      )}
    </div>
  );
}
