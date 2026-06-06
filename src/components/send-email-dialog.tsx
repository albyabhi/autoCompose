"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { api } from "@/lib/api-client";

interface SendEmailDialogProps {
  open: boolean;
  onClose: () => void;
  defaultSubject: string;
  defaultBody: string;
}

export function SendEmailDialog({ open, onClose, defaultSubject, defaultBody }: SendEmailDialogProps) {
  if (!open) return null;
  return (
    <SendEmailDialogContent
      key={`${defaultSubject.length}-${defaultBody.length}`}
      onClose={onClose}
      defaultSubject={defaultSubject}
      defaultBody={defaultBody}
    />
  );
}

interface ContentProps {
  onClose: () => void;
  defaultSubject: string;
  defaultBody: string;
}

function SendEmailDialogContent({ onClose, defaultSubject, defaultBody }: ContentProps) {
  const [to, setTo] = useState("");
  const [subject, setSubject] = useState(defaultSubject);
  const [body, setBody] = useState(defaultBody);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSending(true);
    try {
      await api.post<{ sent: boolean }>("/api/send-email", {
        to: to.trim(),
        subject: subject.trim(),
        body,
      });
      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="dialog-backdrop" onClick={onClose} role="presentation">
      <div
        className="dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="send-email-dialog-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="dialog__header">
          <h2 id="send-email-dialog-title" className="dialog__title">
            Send via Email
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

        {success ? (
          <div className="dialog__body">
            <div className="settings-message settings-message--success">
              Email sent successfully to {to.trim()}.
            </div>
            <div className="dialog__actions">
              <Button variant="primary" onClick={onClose}>
                Done
              </Button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSend}>
            <div className="dialog__body">
              <Input
                id="send-email-to"
                name="to"
                type="email"
                label="Recipient"
                placeholder="recipient@example.com"
                autoComplete="off"
                required
                value={to}
                onChange={(e) => setTo(e.target.value)}
              />
              <Input
                id="send-email-subject"
                name="subject"
                type="text"
                label="Subject"
                required
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
              />
              <div className="field-group">
                <label htmlFor="send-email-body" className="field-label">
                  Body
                </label>
                <textarea
                  id="send-email-body"
                  name="body"
                  className="field-textarea"
                  rows={10}
                  required
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                />
              </div>
              {error && (
                <div className="settings-message settings-message--error">{error}</div>
              )}
            </div>
            <div className="dialog__actions">
              <Button type="button" variant="ghost" onClick={onClose} disabled={sending}>
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                loading={sending}
                disabled={sending || !to.trim() || !subject.trim() || !body.trim()}
              >
                {sending ? "Sending..." : "Send"}
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
