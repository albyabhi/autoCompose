"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { type EmailCategory } from "@/modules/email/categories";
import { MODEL_IDS_KEYS, type ModelId } from "@/modules/ai/types";
import { useProfile } from "@/features/profile/hooks/use-profile";
import { useBulkEntries, useCreateBatchSession, useCreateEntries, useBatchUpdateCategory } from "../hooks/use-bulk";
import { BatchSettingsPanel } from "./batch-settings-panel";
import { BatchHelpDialog } from "./batch-help-dialog";
import { BulkTable } from "./bulk-table";

interface BatchComposeViewProps {
  initialSessionId?: string | null;
}

export function BatchComposeView({ initialSessionId }: BatchComposeViewProps) {
  const router = useRouter();

  const [sessionId, setSessionId] = useState<string | undefined>(initialSessionId ?? undefined);

  const [addCount, setAddCount] = useState(5);
  const [toolbarCategory, setToolbarCategory] = useState<EmailCategory>("custom");
  const [applyingCategory, setApplyingCategory] = useState(false);
  const [sharedFiles, setSharedFiles] = useState<File[]>([]);
  const [rowFilesMap, setRowFilesMap] = useState<Record<string, File[]>>({});
  const [isSettingsExpanded, setIsSettingsExpanded] = useState(true);

  const sentinelRef = useRef<HTMLDivElement | null>(null);

  const createSessionMutation = useCreateBatchSession();
  const createEntriesMutation = useCreateEntries();
  const batchUpdateMutation = useBatchUpdateCategory();

  const { data: entries = [], isLoading } = useBulkEntries(sessionId);
  const { data: profileData } = useProfile();
  const storedPreferred = profileData?.profile?.preferences?.preferredModel;
  const effectiveModelId =
    typeof storedPreferred === "string" &&
    (MODEL_IDS_KEYS as readonly string[]).includes(storedPreferred)
      ? (storedPreferred as ModelId)
      : "deepseek";

  const isCreatingSession = createSessionMutation.isPending;

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    // Scroll container is the app content area, not the viewport.
    const rootEl =
      (document.querySelector(".app-shell__content") as Element | null) ??
      null;
    const getScrollTop = () =>
      rootEl instanceof HTMLElement ? rootEl.scrollTop : window.scrollY;
    let lastScrollTop = getScrollTop();

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (!entry || entry.isIntersecting) return;
        // Only auto-collapse when the sentinel scrolled ABOVE the viewport
        // (user scrolled down into rows). Ignore exits below the viewport,
        // which happen when the panel itself grows (e.g. opening CSV format).
        if (entry.boundingClientRect.top >= 0) {
          lastScrollTop = getScrollTop();
          return;
        }
        const scrollTop = getScrollTop();
        if (scrollTop <= lastScrollTop) {
          lastScrollTop = scrollTop;
          return;
        }
        lastScrollTop = scrollTop;
        setIsSettingsExpanded(false);
      },
      { root: rootEl, threshold: 0, rootMargin: "0px 0px -150px 0px" }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, []);

  const ensureSession = useCallback(async () => {
    if (sessionId) return sessionId;
    const session = await createSessionMutation.mutateAsync();
    setSessionId(session.id);
    router.replace(`/?mode=batch&sessionId=${session.id}`, { scroll: false });
    return session.id;
  }, [sessionId, createSessionMutation, router]);

  const handleAddRow = useCallback(async () => {
    setIsSettingsExpanded(false);
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
    setIsSettingsExpanded(false);
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

  const handleCsvImport = useCallback(
    async (
      rows: Array<{
        category: EmailCategory;
        prompt: string;
        recipient: string;
      }>
    ) => {
      if (rows.length === 0) return;
      setIsSettingsExpanded(false);
      const currentSessionId = await ensureSession();
      if (!currentSessionId) return;
      createEntriesMutation.mutate({
        sessionId: currentSessionId,
        entries: rows,
      });
    },
    [ensureSession, createEntriesMutation]
  );

  const handleToggleSettings = useCallback(() => {
    setIsSettingsExpanded((prev) => !prev);
  }, []);

  const readyCount = entries.filter((e) => e.status === "generated").length;
  const pendingCount = entries.filter((e) => e.status === "pending" || e.status === "failed").length;

  function handleRowFilesChange(entryId: string, files: File[]) {
    setRowFilesMap((prev) => ({ ...prev, [entryId]: files }));
  }

  return (
    <div className="batch-compose">
      <header className="batch-compose__header">
        <h2 className="batch-compose__title">New Batch</h2>
        <p className="batch-compose__subtitle">
          Set up your batch before adding recipients.
        </p>
      </header>

      <div className="batch-compose__layout">
        <div className="batch-compose__main">
          <BatchSettingsPanel
            expanded={isSettingsExpanded}
            onToggle={handleToggleSettings}
            toolbarCategory={toolbarCategory}
            onCategoryChange={setToolbarCategory}
            entryCount={entries.length}
            pendingCount={pendingCount}
            onApplyToAll={handleApplyCategoryToAll}
            applyingCategory={applyingCategory}
            batchUpdatePending={batchUpdateMutation.isPending}
            addCount={addCount}
            onAddCountChange={setAddCount}
            createEntriesPending={createEntriesMutation.isPending}
            isCreatingSession={isCreatingSession}
            onAddMultiple={handleAddMultiple}
            sharedFiles={sharedFiles}
            onSharedFilesChange={setSharedFiles}
            onCsvImport={handleCsvImport}
            csvPending={createEntriesMutation.isPending}
          />

          <div ref={sentinelRef} className="batch-sentinel" />

          {entries.length > 0 && (
            <div className="batch-compose__stats">
              {entries.length} rows · {readyCount} ready · {pendingCount} pending
            </div>
          )}
        </div>
      </div>

      <BatchHelpDialog />

      {isLoading ? (
        <div className="batch-compose__loading">Loading entries...</div>
      ) : (
        <BulkTable
          entries={entries}
          modelId={effectiveModelId}
          onAddRow={handleAddRow}
          sharedFiles={sharedFiles}
          rowFilesMap={rowFilesMap}
          onRowFilesChange={handleRowFilesChange}
        />
      )}
    </div>
  );
}

// ============================================================
// FILE: src/features/batch/components/batch-compose-view.tsx
// ============================================================
// PURPOSE: Main batch email configuration page.
// HOW IT WORKS: Single-column layout with collapsible BatchSettingsPanel and BulkTable. IntersectionObserver on a sentinel element auto-collapses the panel only on real scroll-down into entries (sentinel exits above the viewport inside .app-shell__content); in-panel growth such as opening CSV format help is ignored. A floating indicator button re-expands when collapsed. AI model is read from user profile preferences.
// PROPS: initialSessionId (optional string) for resuming an existing batch session.
// INTEGRATION: React Query hooks for batch operations, BatchSettingsPanel, BulkTable, BatchHelpDialog, email categories, attachment upload, profile preferences.
// ============================================================
