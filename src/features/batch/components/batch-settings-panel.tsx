"use client";

import { CATEGORY_OPTIONS, type EmailCategory } from "@/modules/email/categories";
import { AttachmentUpload } from "@/components/ui/attachment-upload";
import { Card, CardHeader, CardBody } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { BatchStepper } from "./batch-stepper";

interface BatchSettingsPanelProps {
  expanded: boolean;
  onToggle: () => void;
  toolbarCategory: EmailCategory;
  onCategoryChange: (cat: EmailCategory) => void;
  entryCount: number;
  pendingCount: number;
  onApplyToAll: () => void;
  applyingCategory: boolean;
  batchUpdatePending: boolean;
  addCount?: number;
  onAddCountChange?: (n: number) => void;
  createEntriesPending?: boolean;
  isCreatingSession?: boolean;
  onAddMultiple?: () => void;
  sharedFiles: File[];
  onSharedFilesChange: (files: File[]) => void;
}

export function BatchSettingsPanel({
  expanded,
  onToggle,
  toolbarCategory,
  onCategoryChange,
  entryCount,
  pendingCount,
  onApplyToAll,
  applyingCategory,
  batchUpdatePending,
  addCount,
  onAddCountChange,
  createEntriesPending,
  isCreatingSession,
  onAddMultiple,
  sharedFiles,
  onSharedFilesChange,
}: BatchSettingsPanelProps) {
  return (
    <>
      <div
        className={`batch-settings-panel ${expanded ? "batch-settings-panel--expanded" : "batch-settings-panel--collapsed"}`}
      >
        <Card>
          <CardHeader>
            <div className="batch-settings-panel__header">
              <span className="batch-settings-panel__title">Batch Settings</span>
              <button
                type="button"
                className="batch-settings-panel__toggle"
                onClick={onToggle}
                aria-expanded={expanded}
                aria-label={expanded ? "Collapse settings" : "Expand settings"}
              >
                {expanded ? "▲" : "▼"}
              </button>
            </div>
          </CardHeader>
          <CardBody>
            <div className="batch-settings-panel__body">
              <div className="batch-settings-panel__section">
                <div className="batch-primary-controls">
                  <div className="batch-primary-controls__mail-type">
                    <Select
                      label="Mail Type"
                      value={toolbarCategory}
                      onChange={(e) => onCategoryChange(e.target.value as EmailCategory)}
                      options={CATEGORY_OPTIONS}
                    />
                  </div>

                  {entryCount > 0 && (
                    <div className="batch-primary-controls__apply">
                      <Button
                        variant="secondary"
                        onClick={onApplyToAll}
                        disabled={pendingCount === 0 || applyingCategory || batchUpdatePending}
                      >
                        Apply to All ({pendingCount})
                      </Button>
                    </div>
                  )}
                </div>
              </div>

              {onAddMultiple && (
                <div className="batch-settings-panel__section batch-settings-panel__section--stepper">
                  <div className="batch-stepper-row">
                    <BatchStepper
                      value={addCount ?? 5}
                      onChange={onAddCountChange ?? (() => {})}
                      min={1}
                      max={50}
                      disabled={createEntriesPending || isCreatingSession}
                    />
                    <Button
                      onClick={onAddMultiple}
                      disabled={createEntriesPending || isCreatingSession}
                    >
                      + Add {addCount ?? 5}
                    </Button>
                  </div>
                </div>
              )}

              <div className="batch-settings-panel__section">
                <p className="batch-compose__card-hint">
                  Files sent with every email.
                </p>
                <AttachmentUpload
                  files={sharedFiles}
                  onFilesChange={onSharedFilesChange}
                  label="Shared Attachments"
                />
              </div>
            </div>
          </CardBody>
        </Card>
      </div>

      {!expanded && (
        <button
          type="button"
          className="batch-settings-indicator"
          onClick={onToggle}
          aria-label="Open batch settings"
        >
          ⚙ Settings
        </button>
      )}
    </>
  );
}

// ============================================================
// FILE: src/features/batch/components/batch-settings-panel.tsx
// ============================================================
// PURPOSE: Collapsible settings panel containing Mail Type, row adder, and shared attachments for batch compose.
// HOW IT WORKS: Renders a Card with a toggle button in the header. When collapsed, a floating indicator pill appears. An optional sentinel ref is placed below for IntersectionObserver-based auto-hide.
// PROPS: expanded (boolean), onToggle (callback), toolbarCategory, onCategoryChange, entryCount, pendingCount, onApplyToAll, applyingCategory, batchUpdatePending, addCount (optional), onAddCountChange (optional), createEntriesPending (optional), isCreatingSession (optional), onAddMultiple (optional — when omitted, the stepper/adder section is hidden), sharedFiles, onSharedFilesChange.
// INTEGRATION: Card, Button, Select, BatchStepper, AttachmentUpload, CATEGORY_OPTIONS.
// ============================================================
