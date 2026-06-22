"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { ModelSelector } from "@/components/model-selector";
import { CATEGORY_OPTIONS, type EmailCategory } from "@/modules/email/categories";
import { AttachmentUpload } from "@/components/ui/attachment-upload";
import type { ModelId } from "@/modules/ai/types";
import { useBulkEntries, useCreateBatchSession, useCreateEntries, useBatchUpdateCategory } from "../hooks/use-bulk";
import { BulkTable } from "./bulk-table";

interface BatchComposeViewProps {
  initialSessionId?: string | null;
}

export function BatchComposeView({ initialSessionId }: BatchComposeViewProps) {
  const router = useRouter();

  const [sessionId, setSessionId] = useState<string | undefined>(initialSessionId ?? undefined);
  const [modelId, setModelId] = useState<ModelId>("deepseek");

  const [addCount, setAddCount] = useState(5);
  const [toolbarCategory, setToolbarCategory] = useState<EmailCategory>("custom");
  const [applyingCategory, setApplyingCategory] = useState(false);
  const [sharedFiles, setSharedFiles] = useState<File[]>([]);
  const [rowFilesMap, setRowFilesMap] = useState<Record<string, File[]>>({});

  const createSessionMutation = useCreateBatchSession();
  const createEntriesMutation = useCreateEntries();
  const batchUpdateMutation = useBatchUpdateCategory();

  const { data: entries = [], isLoading } = useBulkEntries(sessionId);

  const handleModelChange = (next: ModelId) => {
    setModelId(next);
  };

  const isCreatingSession = createSessionMutation.isPending;

  const ensureSession = useCallback(async () => {
    if (sessionId) return sessionId;
    const session = await createSessionMutation.mutateAsync();
    setSessionId(session.id);
    router.replace(`/?mode=batch&sessionId=${session.id}`, { scroll: false });
    return session.id;
  }, [sessionId, createSessionMutation, router]);

  const handleAddRow = useCallback(async () => {
    const currentSessionId = await ensureSession();
    if (currentSessionId) {
      createEntriesMutation.mutate({
        sessionId: currentSessionId,
        entries: [
          {
            category: toolbarCategory,
            prompt: "",
            recipient: "",
          },
        ],
      });
    }
  }, [ensureSession, createEntriesMutation, toolbarCategory]);

  const handleAddMultiple = useCallback(async () => {
    const currentSessionId = await ensureSession();
    if (!currentSessionId || addCount < 1) return;

    const newEntries = Array.from({ length: Math.min(addCount, 50) }, () => ({
      category: toolbarCategory,
      prompt: "",
      recipient: "",
    }));

    createEntriesMutation.mutate({
      sessionId: currentSessionId,
      entries: newEntries,
    });
  }, [ensureSession, addCount, toolbarCategory, createEntriesMutation]);

  const handleApplyCategoryToAll = useCallback(async () => {
    if (!sessionId) return;
    setApplyingCategory(true);
    try {
      await batchUpdateMutation.mutateAsync({
        sessionId,
        category: toolbarCategory,
      });
    } finally {
      setApplyingCategory(false);
    }
  }, [sessionId, toolbarCategory, batchUpdateMutation]);

  const readyCount = entries.filter((e) => e.status === "generated").length;
  const pendingCount = entries.filter((e) => e.status === "pending" || e.status === "failed").length;

  function handleRowFilesChange(entryId: string, files: File[]) {
    setRowFilesMap((prev) => ({ ...prev, [entryId]: files }));
  }

  const sharedFileCount = sharedFiles.length;
  const totalRowFileCount = Object.values(rowFilesMap).reduce(
    (sum, files) => sum + files.length,
    0
  );

  return (
    <div className="batch-compose">
      <div className="batch-compose__header">
        <h2 className="batch-compose__title">Batch Email Generator</h2>
        <div className="batch-compose__controls">
          <ModelSelector value={modelId} onChange={handleModelChange} />
        </div>
        <p className="batch-compose__hint">
          Add rows below, then click Generate on each row. Preview, regenerate, or send individually. Use &ldquo;Send All&rdquo; to send in sequence.
        </p>
      </div>

      <div className="batch-toolbar">
        <div className="batch-toolbar__group">
          <span className="batch-toolbar__label">Add Rows</span>
          <div className="batch-toolbar__row">
            <input
              type="number"
              className="batch-toolbar__input"
              min={1}
              max={50}
              value={addCount}
              onChange={(e) => setAddCount(Math.max(1, Math.min(50, parseInt(e.target.value) || 1)))}
              aria-label="Number of rows to add"
            />
            <button
              className="btn btn--primary"
              onClick={handleAddMultiple}
              disabled={createEntriesMutation.isPending || isCreatingSession}
            >
              + Add {addCount}
            </button>
          </div>
        </div>

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
            <button
              className="btn btn--secondary"
              onClick={handleApplyCategoryToAll}
              disabled={!sessionId || pendingCount === 0 || applyingCategory || batchUpdateMutation.isPending}
              aria-label="Apply mail type to all pending rows"
            >
              Apply to All ({pendingCount})
            </button>
          </div>
        </div>

        <AttachmentUpload
          files={sharedFiles}
          onFilesChange={setSharedFiles}
          label="Shared Attachments (sent to all)"
        />

        {entries.length > 0 && (
          <div className="batch-toolbar__count">
            {entries.length} rows · {readyCount} ready · {pendingCount} pending
            {sharedFileCount > 0 && ` · ${sharedFileCount} shared files`}
            {totalRowFileCount > 0 && ` · ${totalRowFileCount} row files`}
          </div>
        )}
      </div>

      {isLoading ? (
        <div className="batch-compose__loading">Loading entries...</div>
      ) : (
        <BulkTable
          entries={entries}
          modelId={modelId}
          onAddRow={handleAddRow}
          sharedFiles={sharedFiles}
          rowFilesMap={rowFilesMap}
          onRowFilesChange={handleRowFilesChange}
        />
      )}
    </div>
  );
}
