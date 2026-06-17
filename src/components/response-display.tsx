"use client";

import { useState } from "react";
import Link from "next/link";
import { useProfile } from "@/features/profile/hooks/use-profile";
import { cleanAIContent, parseEmailContent } from "@/modules/email/content";
import { SendEmailDialog } from "./send-email-dialog";

interface ResponseDisplayProps {
  content: string | null;
  modelUsed: string | null;
  loading: boolean;
  error: string | null;
}

export function ResponseDisplay({ content, modelUsed, loading, error }: ResponseDisplayProps) {
  const { data: profileData, isLoading: isProfileLoading } = useProfile();
  const [dialogOpen, setDialogOpen] = useState(false);

  const emailConfigured = !!profileData?.profile?.emailCredentials?.emailConfigured;
  const gmailAddress = profileData?.profile?.emailCredentials?.gmailAddress;

  if (loading) {
    return (
      <div className="response-card response-loading">
        <div className="loading-spinner" />
        <p className="loading-text">Composing your email...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="response-card response-error">
        <h3 className="response-error-title">Generation Failed</h3>
        <p className="response-error-text">{error}</p>
      </div>
    );
  }

  if (!content) {
    return (
      <div className="response-card response-empty">
        <div className="empty-icon">✉</div>
        <h3 className="empty-title">Your email will appear here</h3>
        <p className="empty-text">
          Enter a prompt above and click Generate to compose your email.
        </p>
      </div>
    );
  }

  const { subject, body } = parseEmailContent(content);

  return (
    <div className="response-card response-success">
      <div className="response-header">
        <h3 className="response-title">Generated Email</h3>
        {modelUsed && <span className="response-model">via {modelUsed}</span>}
      </div>
      <div className="response-content">
        <div className="response-subject">
          <span className="response-subject-label">Subject:</span>
          <span className="response-subject-text">{subject}</span>
        </div>
        <div className="response-body">
          {body.split("\n").map((line, i) => (
            <p key={i}>{line || "\u00A0"}</p>
          ))}
        </div>
      </div>
      <div className="response-actions">
        <button
          className="copy-btn"
          onClick={() => navigator.clipboard.writeText(cleanAIContent(content))}
        >
          Copy to Clipboard
        </button>
        <button
          className="send-btn"
          onClick={() => {
            if (emailConfigured) setDialogOpen(true);
          }}
          disabled={!emailConfigured || isProfileLoading}
          title={
            emailConfigured
              ? `Send this email from ${gmailAddress ?? "your Gmail"}`
              : "Add Gmail credentials in Settings to enable sending"
          }
        >
          Send via Email
        </button>
        {!emailConfigured && !isProfileLoading && (
          <Link
            className="send-btn-hint"
            href="/settings?focus=email-credentials"
          >
            Connect Gmail in Settings
          </Link>
        )}
      </div>

      <SendEmailDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        defaultSubject={subject}
        defaultBody={body}
      />
    </div>
  );
}

// ============================================================
// FILE: src/components/response-display.tsx
// ============================================================
// PURPOSE: Displays the AI-generated email with copy, send, and retry actions.
// HOW IT WORKS: Shows loading spinner during generation, error state on failure,
//   empty state before first generation, and the formatted email on success.
//   Parses the email content to extract subject/body for the send dialog.
//   Copy button writes cleaned content to clipboard. Send button opens the
//   SendEmailDialog if Gmail credentials are configured, otherwise shows a
//   link to Settings. Shows model used as a badge.
// PROPS: content (string|null), modelUsed (string|null), loading, error
// INTEGRATION: Email content parser, profile hook (credential check), SendEmailDialog
// ============================================================
