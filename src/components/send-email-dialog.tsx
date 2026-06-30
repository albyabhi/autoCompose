"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AttachmentUpload } from "@/components/ui/attachment-upload";
import { validateAttachments } from "@/utils/attachments";

interface SendEmailDialogProps {
  open: boolean;
  onClose: () => void;
  defaultSubject: string;
  defaultBody: string;
  defaultRecipient?: string;
}

export function SendEmailDialog({ open, onClose, defaultSubject, defaultBody, defaultRecipient }: SendEmailDialogProps) {
  if (!open) return null;
  return (
    <SendEmailDialogContent
      key={`${defaultSubject.length}-${defaultBody.length}-${defaultRecipient ?? ""}`}
      onClose={onClose}
      defaultSubject={defaultSubject}
      defaultBody={defaultBody}
      defaultRecipient={defaultRecipient}
    />
  );
}

interface ContentProps {
  onClose: () => void;
  defaultSubject: string;
  defaultBody: string;
  defaultRecipient?: string;
}

function SendEmailDialogContent({ onClose, defaultSubject, defaultBody, defaultRecipient }: ContentProps) {
  const [to, setTo] = useState(defaultRecipient ?? "");
  const [subject, setSubject] = useState(defaultSubject);
  const [body, setBody] = useState(defaultBody);
  const [files, setFiles] = useState<File[]>([]);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const isMobile = useSyncExternalStore(
    (callback) => {
      const mq = window.matchMedia("(max-width: 640px)");
      mq.addEventListener("change", callback);
      return () => mq.removeEventListener("change", callback);
    },
    () => window.matchMedia("(max-width: 640px)").matches,
    () => false
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  useEffect(() => {
    if (isMobile) {
      document.body.style.overflow = "hidden";
      return () => { document.body.style.overflow = ""; };
    }
  }, [isMobile]);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (files.length > 0) {
      const validation = validateAttachments(files);
      if (!validation.ok) {
        setError(validation.error);
        return;
      }
    }

    setSending(true);
    try {
      const hasFiles = files.length > 0;

      if (hasFiles) {
        const formData = new FormData();
        formData.append("to", to.trim());
        formData.append("subject", subject.trim());
        formData.append("body", body);
        for (const file of files) {
          formData.append("attachments", file);
        }

        const res = await fetch("/api/send-email", {
          method: "POST",
          body: formData,
        });
        const json = await res.json();
        if (!json.success) {
          throw new Error(json.error?.message ?? "Failed to send");
        }
      } else {
        const res = await fetch("/api/send-email", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            to: to.trim(),
            subject: subject.trim(),
            body,
          }),
        });
        const json = await res.json();
        if (!json.success) {
          throw new Error(json.error?.message ?? "Failed to send");
        }
      }

      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send");
    } finally {
      setSending(false);
    }
  }

  const formFields = (
    <>
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
      <AttachmentUpload
        files={files}
        onFilesChange={setFiles}
        disabled={sending}
      />
      {error && (
        <div className="settings-message settings-message--error">{error}</div>
      )}
    </>
  );

  const successView = (
    <>
      <div className="settings-message settings-message--success">
        Email sent successfully to {to.trim()}.
        {files.length > 0 && (
          <div style={{ marginTop: 8 }}>
            {files.length} file{files.length !== 1 ? "s" : ""} attached.
          </div>
        )}
      </div>
      <Button variant="primary" onClick={onClose}>
        Done
      </Button>
    </>
  );

  if (isMobile) {
    return (
      <div className="send-email-page">
        <div className="send-email-page__header">
          <button
            type="button"
            className="send-email-page__back"
            onClick={onClose}
            aria-label="Go back"
          >
            ←
          </button>
          <h2 className="send-email-page__title">Send via Email</h2>
        </div>
        {success ? (
          <div className="send-email-page__body send-email-page__body--centered">
            {successView}
          </div>
        ) : (
          <form onSubmit={handleSend} className="send-email-page__body">
            {formFields}
            <div className="send-email-page__actions">
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
    );
  }

  return (
    <div className="dialog-backdrop" onClick={onClose} role="presentation">
      <div
        className="dialog dialog--email"
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
            {successView}
          </div>
        ) : (
          <form onSubmit={handleSend}>
            <div className="dialog__body">
              {formFields}
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

// ============================================================
// FILE: src/components/send-email-dialog.tsx
// ============================================================
// PURPOSE: Modal dialog for composing and sending an email via Gmail SMTP.
//   On desktop, renders a centered dialog with backdrop. On mobile (≤640px),
//   renders a full-screen page-like view with back arrow and scrollable form.
// HOW IT WORKS: Opens with pre-filled subject and body from the generated email.
//   User enters recipient email, can edit subject/body, and clicks Send. Calls
//   /api/send-email via the API client. Shows success/error states. Supports
//   Escape key to close and backdrop click. Detects mobile via matchMedia and
//   switches layout accordingly — no consumer changes needed.
// PROPS: open (boolean), onClose (callback), defaultSubject, defaultBody
// INTEGRATION: API client (post to /api/send-email), UI components (Button, Input)
// ============================================================
