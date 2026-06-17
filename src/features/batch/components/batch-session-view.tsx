"use client";

import { useState } from "react";
import { useBulkEntries, useBatchUpdateCategory } from "../hooks/use-bulk";
import { Button } from "@/components/ui/button";
import { BulkRow } from "./bulk-row";
import { BulkSendBar } from "./bulk-send-bar";
import { BulkPreviewDialog } from "./bulk-preview-dialog";
import { CATEGORY_OPTIONS, type EmailCategory } from "@/modules/email/categories";
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
          <div className="batch-toolbar__count">
            {entries.length} rows
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
              <BulkRow key={entry.id} entry={entry} modelId="deepseek" onPreview={setPreviewEntry} />
            ))}
          </div>
          <BulkSendBar entries={entries} onComplete={() => {}} />
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
