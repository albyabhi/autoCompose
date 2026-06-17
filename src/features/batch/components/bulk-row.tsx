"use client";

import { useState, useEffect } from "react";
import { CATEGORY_OPTIONS, type EmailCategory } from "@/modules/email/categories";
import { useGenerateEntry, useDeleteEntry, useUpdateEntry } from "../hooks/use-bulk";
import type { BulkEntryData } from "../types";

interface BulkRowProps {
  entry: BulkEntryData;
  modelId: string;
  onPreview?: (entry: BulkEntryData) => void;
}

export function BulkRow({ entry, modelId, onPreview }: BulkRowProps) {
  const generateMutation = useGenerateEntry();
  const deleteMutation = useDeleteEntry();
  const updateMutation = useUpdateEntry();

  const [localCategory, setLocalCategory] = useState(entry.category);
  const [localPrompt, setLocalPrompt] = useState(entry.prompt);
  const [localRecipient, setLocalRecipient] = useState(entry.recipient);
  const isEditing = entry.status === "pending" || entry.status === "failed";

  useEffect(() => {
    setLocalCategory(entry.category);
    setLocalPrompt(entry.prompt);
    setLocalRecipient(entry.recipient);
  }, [entry.category, entry.prompt, entry.recipient]);

  async function handleGenerate() {
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

  const isLoading = generateMutation.isPending;
  const isDeleting = deleteMutation.isPending;
  const isDisabled = isLoading || isDeleting;

  const statusBadge = (() => {
    if (entry.status === "generating" || entry.status === "sending") {
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

  const generateBtn = (
    entry.status === "pending" || entry.status === "failed"
  ) ? (
    <button
      className="bulk-card__btn bulk-card__btn--generate"
      onClick={handleGenerate}
      disabled={isDisabled || localPrompt.length < 10 || !localRecipient}
      aria-label="Generate email"
    >
      Generate
    </button>
  ) : null;

  const previewBtn = entry.status === "generated" ? (
    <button
      className="bulk-card__btn bulk-card__btn--preview"
      onClick={() => onPreview?.(entry)}
      aria-label="Preview email"
    >
      Preview
    </button>
  ) : null;

  const regenBtn = entry.status === "generated" ? (
    <button
      className="bulk-card__btn bulk-card__btn--regen"
      onClick={handleRegenerate}
      disabled={isDisabled}
      aria-label="Regenerate email"
    >
      Regenerate
    </button>
  ) : null;

  return (
    <div className="bulk-card">
      <div className="bulk-card__header">
        <span className="bulk-card__order">#{entry.sortOrder + 1}</span>
        <div className="bulk-card__status">{statusBadge}</div>
      </div>

      <div className="bulk-card__fields">
        <div className="bulk-card__field">
          <label
            htmlFor={`bulk-category-${entry.id}`}
            className="bulk-card__label"
          >
            Mail Type
          </label>
          {isEditing ? (
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
          ) : (
            <span className="bulk-card__readonly">
              {CATEGORY_OPTIONS.find((c) => c.value === entry.category)?.label ?? entry.category}
            </span>
          )}
        </div>

        <div className="bulk-card__field">
          <label
            htmlFor={`bulk-prompt-${entry.id}`}
            className="bulk-card__label"
          >
            Prompt
          </label>
          {isEditing ? (
            <textarea
              id={`bulk-prompt-${entry.id}`}
              className="field-textarea"
              value={localPrompt}
              onChange={(e) => setLocalPrompt(e.target.value)}
              rows={3}
              disabled={isDisabled}
              placeholder="Describe the email you want to generate..."
            />
          ) : (
            <span className="bulk-card__readonly bulk-card__readonly--truncated">
              {entry.prompt}
            </span>
          )}
        </div>

        <div className="bulk-card__field">
          <label
            htmlFor={`bulk-recipient-${entry.id}`}
            className="bulk-card__label"
          >
            Recipient
          </label>
          {isEditing ? (
            <input
              id={`bulk-recipient-${entry.id}`}
              className="field-input"
              type="email"
              value={localRecipient}
              onChange={(e) => setLocalRecipient(e.target.value)}
              disabled={isDisabled}
              placeholder="email@example.com"
            />
          ) : (
            <span className="bulk-card__readonly">{entry.recipient}</span>
          )}
        </div>
      </div>

      {entry.status === "failed" && entry.errorMessage && (
        <div className="bulk-card__error">{entry.errorMessage}</div>
      )}

      <div className="bulk-card__actions">
        {(entry.status === "generating" || entry.status === "sending") && (
          <span className="bulk-card__spinner" />
        )}
        {generateBtn}
        {previewBtn}
        {regenBtn}
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
