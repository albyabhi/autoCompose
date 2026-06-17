"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { parseEmailContent } from "@/modules/email/content";
import { useSendEntry } from "../hooks/use-bulk";
import type { BulkEntryData } from "../types";

interface BulkPreviewDialogProps {
  entry: BulkEntryData;
  onClose: () => void;
}

export function BulkPreviewDialog({ entry, onClose }: BulkPreviewDialogProps) {
  const sendMutation = useSendEntry();
  const parsed = parseEmailContent(entry.generatedContent ?? "");
  const [subject, setSubject] = useState(entry.subject || parsed.subject);
  const [body, setBody] = useState(entry.generatedContent ?? "");
  const [showSent, setShowSent] = useState(false);

  async function handleSend() {
    const result = await sendMutation.mutateAsync(entry.id);
    if (result.ok) {
      setShowSent(true);
    }
  }

  return (
    <div className="dialog-backdrop" onClick={onClose} role="presentation">
      <div
        className="dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="preview-dialog-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="dialog__header">
          <h2 id="preview-dialog-title" className="dialog__title">
            Preview Email
          </h2>
          <button
            type="button"
            className="dialog__close"
            onClick={onClose}
            aria-label="Close"
          >
            ×
          </button>
        </div>

        {showSent ? (
          <div className="dialog__body">
            <div className="settings-message settings-message--success">
              Email sent successfully to {entry.recipient}.
            </div>
            <div className="dialog__actions">
              <Button variant="primary" onClick={onClose}>Done</Button>
            </div>
          </div>
        ) : (
          <div className="dialog__body">
            <div className="field-group">
              <label className="field-label">To</label>
              <div className="field-input-readonly">{entry.recipient}</div>
            </div>
            <div className="field-group">
              <label htmlFor="preview-subject" className="field-label">Subject</label>
              <input
                id="preview-subject"
                className="field-input"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
              />
            </div>
            <div className="field-group">
              <label htmlFor="preview-body" className="field-label">Body</label>
              <textarea
                id="preview-body"
                className="field-textarea"
                rows={10}
                value={body}
                onChange={(e) => setBody(e.target.value)}
              />
            </div>
            {sendMutation.isError && (
              <div className="settings-message settings-message--error">
                {sendMutation.error instanceof Error
                  ? sendMutation.error.message
                  : "Failed to send"}
              </div>
            )}
            <div className="dialog__actions">
              <Button variant="ghost" onClick={onClose} disabled={sendMutation.isPending}>
                Cancel
              </Button>
              <Button
                variant="primary"
                loading={sendMutation.isPending}
                disabled={sendMutation.isPending || !subject.trim() || !body.trim()}
                onClick={handleSend}
              >
                {sendMutation.isPending ? "Sending..." : "Send"}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
