"use client";

import { useState } from "react";
import Link from "next/link";
import { useProfile } from "@/features/profile/hooks/use-profile";
import { cleanAIContent, parseEmailContent } from "@/modules/email/content";
import { SendEmailDialog } from "@/components/send-email-dialog";
import type { MessageData } from "../types";

interface MessageBubbleProps {
  message: MessageData;
}

export function MessageBubble({ message }: MessageBubbleProps) {
  const { data: profileData, isLoading: isProfileLoading } = useProfile();
  const [dialogOpen, setDialogOpen] = useState(false);

  const isAssistant = message.role === "assistant";
  const emailConfigured =
    !!profileData?.profile?.emailCredentials?.emailConfigured && isAssistant;
  const gmailAddress = profileData?.profile?.emailCredentials?.gmailAddress;

  const { subject, body } = isAssistant ? parseEmailContent(message.content) : { subject: "", body: "" };

  return (
    <div
      className={`message ${message.role === "user" ? "message--user" : "message--assistant"}`}
    >
      <div className="message__role">
        {message.role === "user" ? "You" : "AI"}
        {message.modelUsed && (
          <span className="message__model">{message.modelUsed}</span>
        )}
      </div>
      <div className="message__content">{cleanAIContent(message.content)}</div>
      {isAssistant && (
        <div className="message__actions">
          <button
            className="send-btn send-btn--inline"
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
      )}
      {isAssistant && (
        <SendEmailDialog
          open={dialogOpen}
          onClose={() => setDialogOpen(false)}
          defaultSubject={subject}
          defaultBody={body}
        />
      )}
    </div>
  );
}

// ============================================================
// FILE: src/features/sessions/components/message-bubble.tsx
// ============================================================
// PURPOSE: Renders a single chat message (user or assistant) with an optional "Send via Email" action for AI-generated emails.
// HOW IT works: Displays the role label, model badge, and cleaned content. For assistant messages, parses the email subject and body via parseEmailContent, and shows a "Send via Email" button that opens SendEmailDialog if Gmail credentials are configured. Otherwise shows a link to settings.
// PROPS: message (MessageData).
// INTEGRATION: useProfile hook, cleanAIContent/parseEmailContent, SendEmailDialog, MessageData type.
// ============================================================
