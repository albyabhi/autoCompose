"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { ModelSelector } from "@/components/model-selector";
import { CATEGORY_OPTIONS, type EmailCategory } from "@/modules/email/categories";
import { AttachmentUpload } from "@/components/ui/attachment-upload";
import { Card, CardHeader, CardBody } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { MODEL_IDS_KEYS, type ModelId } from "@/modules/ai/types";
import { useProfile } from "@/features/profile/hooks/use-profile";
import { useBulkEntries, useCreateBatchSession, useCreateEntries, useBatchUpdateCategory } from "../hooks/use-bulk";
import { BatchStepper } from "./batch-stepper";
import { BatchSidebar } from "./batch-sidebar";
import { BulkTable } from "./bulk-table";

interface BatchComposeViewProps {
  initialSessionId?: string | null;
}

export function BatchComposeView({ initialSessionId }: BatchComposeViewProps) {
  const router = useRouter();

  const [sessionId, setSessionId] = useState<string | undefined>(initialSessionId ?? undefined);
  const [modelId, setModelId] = useState<ModelId>("deepseek");
  const [userTouchedModel, setUserTouchedModel] = useState(false);

  const [addCount, setAddCount] = useState(5);
  const [toolbarCategory, setToolbarCategory] = useState<EmailCategory>("custom");
  const [applyingCategory, setApplyingCategory] = useState(false);
  const [sharedFiles, setSharedFiles] = useState<File[]>([]);
  const [rowFilesMap, setRowFilesMap] = useState<Record<string, File[]>>({});

  const createSessionMutation = useCreateBatchSession();
  const createEntriesMutation = useCreateEntries();
  const batchUpdateMutation = useBatchUpdateCategory();

  const { data: entries = [], isLoading } = useBulkEntries(sessionId);
  const { data: profileData } = useProfile();
  const storedPreferred = profileData?.profile?.preferences?.preferredModel;
  const effectiveModelId =
    !userTouchedModel &&
    typeof storedPreferred === "string" &&
    (MODEL_IDS_KEYS as readonly string[]).includes(storedPreferred)
      ? (storedPreferred as ModelId)
      : modelId;

  const handleModelChange = (next: ModelId) => {
    setUserTouchedModel(true);
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

  return (
    <div className="batch-compose">
      {/* HEADER */}
      <header className="batch-compose__header">
        <div className="batch-compose__header-top">
          <span className="batch-compose__step-badge">Step 1</span>
        </div>
        <h2 className="batch-compose__title">Configure Your Batch</h2>
        <p className="batch-compose__subtitle">
          Set up your batch email generation settings before adding recipients.
        </p>
      </header>

      {/* 2-COLUMN LAYOUT */}
      <div className="batch-compose__layout">
        {/* LEFT COLUMN — Main Controls */}
        <div className="batch-compose__main">
          {/* Primary Controls Card */}
          <Card>
            <CardHeader>Primary Controls</CardHeader>
            <CardBody>
              <div className="batch-primary-controls">
                <div className="batch-primary-controls__model">
                  <ModelSelector value={effectiveModelId} onChange={handleModelChange} />
                  
                </div>

                <div className="batch-primary-controls__mail-type">
                  <Select
                    label="Mail Type"
                    value={toolbarCategory}
                    onChange={(e) => setToolbarCategory(e.target.value as EmailCategory)}
                    options={CATEGORY_OPTIONS}
                  />
                </div>

                <div className="batch-primary-controls__apply">
                  <Button
                    variant="secondary"
                    onClick={handleApplyCategoryToAll}
                    disabled={!sessionId || pendingCount === 0 || applyingCategory || batchUpdateMutation.isPending}
                  >
                    Apply to All
                  </Button>
                </div>
              </div>
            </CardBody>
          </Card>

          {/* Stepper Row */}
          <div className="batch-stepper-row">
            <BatchStepper
              value={addCount}
              onChange={setAddCount}
              min={1}
              max={50}
              disabled={createEntriesMutation.isPending || isCreatingSession}
            />
            <Button
              onClick={handleAddMultiple}
              disabled={createEntriesMutation.isPending || isCreatingSession}
            >
              + Add {addCount}
            </Button>
          </div>

          {/* Shared Attachments Card */}
          <Card>
            <CardHeader>Shared Attachments</CardHeader>
            <CardBody>
              <p className="batch-compose__card-hint">
                Files sent with every email.
              </p>
              <AttachmentUpload
                files={sharedFiles}
                onFilesChange={setSharedFiles}
                label="Attachments"
              />
            </CardBody>
          </Card>

          {/* Entry Stats */}
          {entries.length > 0 && (
            <div className="batch-compose__stats">
              {entries.length} rows · {readyCount} ready · {pendingCount} pending
            </div>
          )}
        </div>

        {/* RIGHT COLUMN — Sidebar */}
        <BatchSidebar />
      </div>

      {/* BULK TABLE — Below grid */}
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
// PURPOSE: Main batch email configuration page with 2-column desktop layout.
// HOW IT WORKS: Renders a header with step badge, title, and subtitle. Below is a CSS Grid layout with a 70% left column (primary controls card, stepper row, shared attachments card) and a 30% right column (sidebar with collapsible quick tips). The BulkTable renders below the grid. Uses Card, Select, Button, ModelSelector, BatchStepper, and BatchSidebar primitives. Responsive: collapses to single column at 768px.
// PROPS: initialSessionId (optional string) for resuming an existing batch session.
// INTEGRATION: React Query hooks for batch operations, AI model types, email categories, attachment upload, profile preferences.
// ============================================================
