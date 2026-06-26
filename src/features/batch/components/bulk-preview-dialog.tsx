"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { parseEmailContent } from "@/modules/email/content";
import { useSendEntry, useSendEntryWithAttachments, useUploadAttachments } from "../hooks/use-bulk";
import type { BulkEntryData } from "../types";

interface BulkPreviewDialogProps {
  entry: BulkEntryData;
  onClose: () => void;
  sharedFiles?: File[];
  rowFiles?: File[];
}

export function BulkPreviewDialog({ entry, onClose, sharedFiles = [], rowFiles = [] }: BulkPreviewDialogProps) {
  const sendMutation = useSendEntry();
  const sendWithAttachmentsMutation = useSendEntryWithAttachments();
  const uploadMutation = useUploadAttachments();
  const parsed = parseEmailContent(entry.generatedContent ?? "");
  const [subject, setSubject] = useState(entry.subject || parsed.subject);
  const [body, setBody] = useState(parsed.body);
  const [showSent, setShowSent] = useState(false);

  const hasRowFiles = rowFiles.length > 0;
  const hasSharedFiles = sharedFiles.length > 0;
  const hasFiles = hasRowFiles || hasSharedFiles;

  async function handleSend() {
    if (hasFiles) {
      const allFiles = [...sharedFiles, ...rowFiles];
      const uploadResult = await uploadMutation.mutateAsync(allFiles);
      const result = await sendWithAttachmentsMutation.mutateAsync({
        entryId: entry.id,
        sharedAttachmentIds: uploadResult.ids,
        rowAttachmentIds: [],
      });
      if (result.ok) setShowSent(true);
    } else {
      const result = await sendMutation.mutateAsync(entry.id);
      if (result.ok) setShowSent(true);
    }
  }

  const allFiles = [...sharedFiles, ...rowFiles];

  return (
    <div className="dialog-backdrop" onClick={onClose} role="presentation">
      <div
        className="dialog dialog--email"
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
              {allFiles.length > 0 && (
                <div style={{ marginTop: 8 }}>
                  {allFiles.length} file{allFiles.length !== 1 ? "s" : ""} attached.
                </div>
              )}
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
            {allFiles.length > 0 && (
              <div className="field-group">
                <label className="field-label">Attachments</label>
                <div className="field-input-readonly">
                  {allFiles.length} file{allFiles.length !== 1 ? "s" : ""}
                  {hasSharedFiles && hasRowFiles && (
                    <span style={{ opacity: 0.6, marginLeft: 8 }}>
                      ({sharedFiles.length} shared, {rowFiles.length} row-specific)
                    </span>
                  )}
                </div>
              </div>
            )}
            {(() => {
              const sendError = sendMutation.error ?? sendWithAttachmentsMutation.error ?? uploadMutation.error;
              if (!sendError) return null;
              return (
                <div className="settings-message settings-message--error">
                  {sendError instanceof Error ? sendError.message : "Failed to send"}
                </div>
              );
            })()}
            <div className="dialog__actions">
              <Button variant="ghost" onClick={onClose} disabled={sendMutation.isPending || sendWithAttachmentsMutation.isPending}>
                Cancel
              </Button>
              <Button
                variant="primary"
                loading={sendMutation.isPending || sendWithAttachmentsMutation.isPending || uploadMutation.isPending}
                disabled={sendMutation.isPending || sendWithAttachmentsMutation.isPending || uploadMutation.isPending || !subject.trim() || !body.trim()}
                onClick={handleSend}
              >
                {uploadMutation.isPending ? "Uploading..." : sendMutation.isPending || sendWithAttachmentsMutation.isPending ? "Sending..." : "Send"}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
