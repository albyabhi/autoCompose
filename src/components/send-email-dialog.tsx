"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ContactAutocomplete } from "@/components/ui/contact-autocomplete";
import { AttachmentUpload } from "@/components/ui/attachment-upload";
import { validateAttachments } from "@/utils/attachments";
import { useProfile } from "@/features/profile/hooks/use-profile";

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
  const { data: profileData } = useProfile();
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
      <div className="field-group">
        <label htmlFor="send-email-to" className="field-label">Recipient</label>
        <ContactAutocomplete
          contacts={profileData?.profile?.contacts ?? []}
          id="send-email-to"
          className="field-input"
          placeholder="recipient@example.com"
          autoComplete="off"
          required
          value={to}
          onChange={setTo}
        />
      </div>
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
// PURPOSE: The "Send this email" dialog — a modal on desktop, full-screen page on mobile. Pre-fills subject/body from the generated email, lets user pick recipient from contacts, add attachments, and send via Gmail SMTP.
// HOW IT WORKS: React component with responsive layout switching:
//   LAYOUT: Uses matchMedia (via useSyncExternalStore) to detect ≤640px. Mobile: full-screen page with back arrow, fixed header, scrollable form. Desktop: centered dialog with backdrop, Escape key closes, backdrop click closes.
//   STATE: to (recipient), subject, body (pre-filled from props), files (attachments), sending/success/error states.
//   CONTACTS: ContactAutocomplete input populated from user's profile contacts.
//   ATTACHMENTS: AttachmentUpload component handles file selection (max 5 files, 10MB each, validated by validateAttachments).
//   SUBMISSION (handleSend): If files attached -> FormData POST to /api/send-email. If no files -> JSON POST. On success: shows "Email sent successfully" with attachment count, Done button closes dialog. On error: shows error message, keeps form.
//   PROPS: open (boolean), onClose (callback), defaultSubject, defaultBody, defaultRecipient (optional, auto-detected from prompt).
// INTEGRATION: API client (fetch /api/send-email), profile hook (useProfile for contacts), UI components (Button, Input, ContactAutocomplete, AttachmentUpload), attachment validation (validateAttachments). Called by ResponseDisplay component after email generation.
// ============================================================
