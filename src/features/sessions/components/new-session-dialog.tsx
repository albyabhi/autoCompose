"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useCreateSession } from "../hooks/use-sessions";
import { CATEGORY_OPTIONS, type EmailCategory } from "@/modules/email/categories";

interface NewSessionDialogProps {
  open: boolean;
  onClose: () => void;
}

export function NewSessionDialog({ open, onClose }: NewSessionDialogProps) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<EmailCategory>("custom");
  const createMutation = useCreateSession();

  if (!open) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;

    const result = await createMutation.mutateAsync({
      title: title.trim(),
      category,
    });

    setTitle("");
    setCategory("custom");
    onClose();
    router.push(`/sessions/${result.id}`);
  }

  return (
    <>
      <div className="dialog-backdrop" onClick={onClose} />
      <div className="dialog" role="dialog" aria-modal="true" aria-label="New session">
        <form className="dialog__form" onSubmit={handleSubmit}>
          <h2 className="dialog__title">New Session</h2>

          <div className="field-group">
            <label htmlFor="new-session-title" className="field-label">
              Title
            </label>
            <input
              id="new-session-title"
              className="field-input"
              placeholder="e.g., Leave Request for Tomorrow"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              autoFocus
              required
            />
          </div>

          <div className="field-group">
            <label htmlFor="new-session-category" className="field-label">
              Category
            </label>
            <select
              id="new-session-category"
              className="field-select"
              value={category}
              onChange={(e) => setCategory(e.target.value as EmailCategory)}
            >
              {CATEGORY_OPTIONS.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>

          <div className="dialog__actions">
            <button
              type="button"
              className="btn btn--secondary"
              onClick={onClose}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn--primary"
              disabled={!title.trim() || createMutation.isPending}
            >
              {createMutation.isPending ? "Creating..." : "Create"}
            </button>
          </div>
        </form>
      </div>
    </>
  );
}

// ============================================================
// FILE: src/features/sessions/components/new-session-dialog.tsx
// ============================================================
// PURPOSE: A modal dialog for creating a new email composition session with title and category.
// HOW IT works: Renders a form with a title input and category dropdown (from CATEGORY_OPTIONS). On submit, calls useCreateSession to create the session, resets the form, closes the dialog, and navigates to the new session's detail page. Returns null when not open.
// PROPS: open (boolean), onClose (() => void).
// INTEGRATION: useCreateSession hook, CATEGORY_OPTIONS/EmailCategory from email categories module, Next.js useRouter.
// ============================================================
