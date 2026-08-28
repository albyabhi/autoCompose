"use client";

import { useState } from "react";
import Link from "next/link";
import { useProfile } from "@/features/profile/hooks/use-profile";
import { parseEmailContent } from "@/modules/email/content";
import { ContactAutocomplete } from "@/components/ui/contact-autocomplete";
import { SendEmailDialog } from "@/components/send-email-dialog";
import { AddToScheduleDialog } from "@/features/schedule/components/add-to-schedule-dialog";
import type { MessageData } from "@/modules/session/types";

interface MessageBubbleProps {
  message: MessageData;
  defaultRecipient?: string;
}

export function MessageBubble({ message, defaultRecipient }: MessageBubbleProps) {
  const { data: profileData, isLoading: isProfileLoading } = useProfile();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [showFullPrompt, setShowFullPrompt] = useState(false);
  const [recipientLocal, setRecipientLocal] = useState(defaultRecipient ?? "");
  const recipient = defaultRecipient ?? recipientLocal;

  const isAssistant = message.role === "assistant";
  const emailConfigured =
    !!profileData?.profile?.emailCredentials?.emailConfigured && isAssistant;
  const gmailAddress = profileData?.profile?.emailCredentials?.gmailAddress;

  const { subject, body } = isAssistant ? parseEmailContent(message.content) : { subject: "", body: "" };
  const lineCount = message.content.split('\n').length;
  const isLongPrompt = !isAssistant && lineCount > 12;

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
      <div className="message__content">
        {isAssistant ? (
          <>
              <div className="message-recipient">
                <label htmlFor={`msg-recipient-${message.id}`} className="message-recipient-label">To:</label>
                <ContactAutocomplete
                  contacts={profileData?.profile?.contacts ?? []}
                  id={`msg-recipient-${message.id}`}
                  className="message-recipient-input"
                  value={recipient}
                  onChange={setRecipientLocal}
                  placeholder="recipient@example.com"
                />
              </div>
            <div className="message-subject">
              <span className="message-subject-label">Subject:</span>
              <span className="message-subject-text">{subject}</span>
            </div>
            <div className="message-body">{body}</div>
          </>
        ) : isLongPrompt && !showFullPrompt ? (
          <div>
            <div className="message__prompt-collapsed">
              {message.content.split('\n').slice(0, 10).join('\n')}
              {lineCount > 10 && <span className="message__prompt-ellipsis">...</span>}
            </div>
            <button
              className="message__prompt-toggle"
              onClick={() => setShowFullPrompt(true)}
            >
              Show full prompt
            </button>
          </div>
        ) : (
          <div>
            {message.content}
            {isLongPrompt && (
              <button
                className="message__prompt-toggle"
                onClick={() => setShowFullPrompt(false)}
              >
                Hide prompt
              </button>
            )}
          </div>
        )}
      </div>
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
          <button
            className="send-btn send-btn--inline send-btn--schedule"
            onClick={() => setScheduleOpen(true)}
            disabled={!recipient?.trim()}
            title={recipient?.trim() ? "Schedule this email" : "Add a recipient before scheduling"}
          >
            Add to Schedule
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
          defaultRecipient={recipient || undefined}
        />
      )}
      {isAssistant && (
        <AddToScheduleDialog
          open={scheduleOpen}
          onClose={() => setScheduleOpen(false)}
          emails={[
            {
              sourceType: "single",
              sourceSessionId: message.sessionId,
              sourceMessageId: message.id,
              to: recipient,
              subject,
              body,
            },
          ]}
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
