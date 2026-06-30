"use client";

import { useState } from "react";
import { CATEGORY_OPTIONS, type EmailCategory } from "@/modules/email/categories";
import { extractEmailFromText, parseEmailContent } from "@/modules/email/content";
import { AttachmentUpload } from "@/components/ui/attachment-upload";
import { useGenerateEntry, useDeleteEntry, useUpdateEntry } from "../hooks/use-bulk";
import type { BulkEntryData } from "../types";

interface BulkRowProps {
  entry: BulkEntryData;
  modelId: string;
  onPreview?: (entry: BulkEntryData) => void;
  rowFiles?: File[];
  onRowFilesChange?: (files: File[]) => void;
}

export function BulkRow({ entry, modelId, onPreview, rowFiles = [], onRowFilesChange }: BulkRowProps) {
  const generateMutation = useGenerateEntry();
  const deleteMutation = useDeleteEntry();
  const updateMutation = useUpdateEntry();

  const [prevEntry, setPrevEntry] = useState(entry);
  const [localCategory, setLocalCategory] = useState(entry.category);
  const [localPrompt, setLocalPrompt] = useState(entry.prompt);
  const [localRecipient, setLocalRecipient] = useState(entry.recipient);
  const [isEditing, setIsEditing] = useState(entry.status === "pending" || entry.status === "failed");
  const [showPrompt, setShowPrompt] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  if (prevEntry !== entry) {
    setPrevEntry(entry);
    setLocalCategory(entry.category);
    setLocalPrompt(entry.prompt);
    setLocalRecipient(entry.recipient);
    if (entry.status === "pending" || entry.status === "failed") {
      setIsEditing(true);
    }
  }

  async function handleGenerate() {
    setIsEditing(false);
    if (entry.status === "pending" || entry.status === "failed") {
      await updateMutation.mutateAsync({
        id: entry.id,
        input: {
          category: localCategory,
          prompt: localPrompt,
          recipient: localRecipient,
        },
      });
    }
    generateMutation.mutate({ entryId: entry.id, modelId });
  }

  async function handleDelete() {
    deleteMutation.mutate(entry.id);
  }

  function handleRegenerate() {
    generateMutation.mutate({ entryId: entry.id, modelId });
  }

  function handleCancel() {
    setLocalCategory(entry.category);
    setLocalPrompt(entry.prompt);
    setLocalRecipient(entry.recipient);
    setIsEditing(false);
  }

  const isLoading = generateMutation.isPending;
  const isDeleting = deleteMutation.isPending;
  const isGenerating = entry.status === "generating" || entry.status === "sending" || isLoading;
  const isDisabled = isDeleting || isGenerating;

  const statusBadge = (() => {
    if (isGenerating || entry.status === "generating" || entry.status === "sending") {
      return <span className="bulk-card__spinner" />;
    }
    if (entry.status === "sent") {
      return <span className="bulk-card__badge bulk-card__badge--sent">Sent</span>;
    }
    if (entry.status === "failed") {
      return (
        <span className="bulk-card__badge bulk-card__badge--failed" title={entry.errorMessage}>
          Failed
        </span>
      );
    }
    if (entry.status === "generated") {
      return <span className="bulk-card__badge bulk-card__badge--generated">Ready</span>;
    }
    return null;
  })();

  // ── Edit Mode ──────────────────────────────────────────────
  if (isEditing) {
    const cancelBtn = (entry.status === "generated" || entry.status === "sent") ? (
      <button
        className="bulk-card__btn bulk-card__btn--cancel"
        onClick={handleCancel}
        disabled={isDisabled}
      >
        Cancel
      </button>
    ) : null;

    return (
      <div className={`bulk-card bulk-card--edit${isGenerating ? " bulk-card--generating" : ""}`}>
        <div className="bulk-card__header">
          <span className="bulk-card__order">#{entry.sortOrder + 1}</span>
          <div className="bulk-card__status">{statusBadge}</div>
        </div>

        <div className="bulk-card__fields">
          <div className="bulk-card__field">
            <label htmlFor={`bulk-category-${entry.id}`} className="bulk-card__label">
              Mail Type
            </label>
            <select
              id={`bulk-category-${entry.id}`}
              className="field-select"
              value={localCategory}
              onChange={(e) => setLocalCategory(e.target.value as EmailCategory)}
              disabled={isDisabled}
            >
              {CATEGORY_OPTIONS.map((cat) => (
                <option key={cat.value} value={cat.value}>{cat.label}</option>
              ))}
            </select>
          </div>

          <div className="bulk-card__field">
            <label htmlFor={`bulk-prompt-${entry.id}`} className="bulk-card__label">
              Prompt
            </label>
            <textarea
              id={`bulk-prompt-${entry.id}`}
              className="field-textarea"
              value={localPrompt}
              onChange={(e) => {
                const newPrompt = e.target.value;
                setLocalPrompt(newPrompt);
                if (!localRecipient) {
                  const extracted = extractEmailFromText(newPrompt);
                  if (extracted) setLocalRecipient(extracted);
                }
              }}
              rows={3}
              disabled={isDisabled}
              placeholder="Describe the email you want to generate..."
            />
          </div>

          <div className="bulk-card__field">
            <label htmlFor={`bulk-recipient-${entry.id}`} className="bulk-card__label">
              Recipient
            </label>
            <input
              id={`bulk-recipient-${entry.id}`}
              className="field-input"
              type="email"
              value={localRecipient}
              onChange={(e) => setLocalRecipient(e.target.value)}
              disabled={isDisabled}
              placeholder="email@example.com"
            />
          </div>
          {onRowFilesChange && (
            <AttachmentUpload
              files={rowFiles}
              onFilesChange={onRowFilesChange}
              disabled={isDisabled}
              label="Row Attachments"
            />
          )}
        </div>

        {entry.generatedContent && (
          <>
            <button
              className="bulk-card__preview-toggle"
              onClick={() => setShowPreview(!showPreview)}
            >
              {showPreview ? "Hide" : "Show"} Generated Preview
            </button>
            {showPreview && (
              <div className="bulk-card__preview">
                {entry.subject && (
                  <div className="bulk-card__preview-subject">{entry.subject}</div>
                )}
                <div className="bulk-card__preview-body">{parseEmailContent(entry.generatedContent).body}</div>
              </div>
            )}
          </>
        )}

        {entry.status === "failed" && entry.errorMessage && (
          <div className="bulk-card__error">{entry.errorMessage}</div>
        )}

        <div className="bulk-card__actions">
          {(isGenerating || entry.status === "generating" || entry.status === "sending") && (
            <span className="bulk-card__spinner" />
          )}
          <button
            className="bulk-card__btn bulk-card__btn--generate"
            onClick={handleGenerate}
            disabled={isDisabled || localPrompt.length < 10 || !localRecipient}
            aria-label="Generate email"
          >
            {isGenerating ? "Generating..." : "Generate"}
          </button>
          {cancelBtn}
          <button
            className="bulk-card__btn bulk-card__btn--delete"
            onClick={handleDelete}
            disabled={isDeleting}
            aria-label="Delete entry"
          >
            Delete
          </button>
        </div>
      </div>
    );
  }

  // ── Display Mode ──────────────────────────────────────────
  return (
      <div className={`bulk-card${isGenerating ? " bulk-card--generating" : ""}`}>
      <div className="bulk-card__header">
        <span className="bulk-card__order">#{entry.sortOrder + 1}</span>
        <div className="bulk-card__status">{statusBadge}</div>
      </div>

      <div className="bulk-card__display">
        <div className="bulk-card__display-row bulk-card__display-row--recipient">
          <span className="bulk-card__display-label">To</span>
          <span className="bulk-card__display-value">{entry.recipient}</span>
        </div>

        {entry.subject && (
          <div className="bulk-card__display-row">
            <span className="bulk-card__display-label">Subject</span>
            <span className="bulk-card__display-value">{entry.subject}</span>
          </div>
        )}

        <div className="bulk-card__display-prompt">
          <button
            className="bulk-card__prompt-toggle"
            onClick={() => setShowPrompt(!showPrompt)}
          >
            {showPrompt ? "Hide" : "Show"} Prompt
          </button>
          {showPrompt && (
            <span className="bulk-card__display-prompt-text">{entry.prompt}</span>
          )}
        </div>
      </div>

        {entry.status === "failed" && entry.errorMessage && (
          <div className="bulk-card__error">{entry.errorMessage}</div>
        )}

        {rowFiles.length > 0 && (
          <div className="bulk-card__attachment-info">
            {rowFiles.length} row attachment{rowFiles.length !== 1 ? "s" : ""}
          </div>
        )}

        <div className="bulk-card__actions">
          {(isGenerating || entry.status === "generating" || entry.status === "sending") && (
            <span className="bulk-card__spinner" />
          )}
          <button
            className="bulk-card__btn bulk-card__btn--edit"
            onClick={() => setIsEditing(true)}
            disabled={isDisabled || entry.status === "sending"}
            aria-label="Edit entry"
          >
            Edit
          </button>
          {entry.status === "generated" && (
            <>
              <button
                className="bulk-card__btn bulk-card__btn--preview"
                onClick={() => onPreview?.(entry)}
                aria-label="Preview email"
              >
                Preview
              </button>
              <button
                className="bulk-card__btn bulk-card__btn--regen"
                onClick={handleRegenerate}
                disabled={isDisabled}
                aria-label="Regenerate email"
              >
                Regenerate
              </button>
            </>
          )}
          <button
            className="bulk-card__btn bulk-card__btn--delete"
            onClick={handleDelete}
            disabled={isDeleting}
            aria-label="Delete entry"
          >
            Delete
          </button>
        </div>
      </div>
    );
  }
