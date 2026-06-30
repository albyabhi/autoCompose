"use client";

import { useState, useRef, useEffect } from "react";
import { useBulkEntries, useBatchUpdateCategory } from "../hooks/use-bulk";
import { Button } from "@/components/ui/button";
import { BulkRow } from "./bulk-row";
import { BulkSendBar } from "./bulk-send-bar";
import { BulkPreviewDialog } from "./bulk-preview-dialog";
import { type EmailCategory } from "@/modules/email/categories";
import { MODEL_IDS_KEYS, type ModelId } from "@/modules/ai/types";
import { useProfile } from "@/features/profile/hooks/use-profile";
import { useRouter } from "next/navigation";
import { BatchSettingsPanel } from "./batch-settings-panel";
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
  const [isSettingsExpanded, setIsSettingsExpanded] = useState(true);
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const batchUpdateMutation = useBatchUpdateCategory();
  const { data: profileData } = useProfile();
  const router = useRouter();

  const storedPreferred = profileData?.profile?.preferences?.preferredModel;
  const modelId =
    typeof storedPreferred === "string" &&
    (MODEL_IDS_KEYS as readonly string[]).includes(storedPreferred)
      ? (storedPreferred as ModelId)
      : "deepseek";

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) {
          setIsSettingsExpanded(false);
        }
      },
      { threshold: 0 }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, []);

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

      <BatchSettingsPanel
        expanded={isSettingsExpanded}
        onToggle={() => setIsSettingsExpanded((prev) => !prev)}
        toolbarCategory={toolbarCategory}
        onCategoryChange={setToolbarCategory}
        entryCount={entries.length}
        pendingCount={pendingCount}
        onApplyToAll={handleApplyCategoryToAll}
        applyingCategory={false}
        batchUpdatePending={batchUpdateMutation.isPending}
        sharedFiles={sharedFiles}
        onSharedFilesChange={setSharedFiles}
      />

      <div ref={sentinelRef} className="batch-sentinel" />

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
                modelId={modelId}
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

// ============================================================
// FILE: src/features/batch/components/batch-session-view.tsx
// ============================================================
// PURPOSE: View for displaying/resuming an existing batch session.
// HOW IT WORKS: Fetches entries by sessionId, renders toolbar with Mail Type selector and Apply to All, lists BulkRow components, and provides BulkSendBar. Model is read from user profile preferences.
// PROPS: sessionId (string), title (string), category (string).
// INTEGRATION: React Query hooks, BulkRow, BulkSendBar, BulkPreviewDialog, profile preferences.
// ============================================================
