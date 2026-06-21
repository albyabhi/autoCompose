"use client";

import { useSession } from "../hooks/use-sessions";
import { SkeletonList } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { MessageBubble } from "./message-bubble";
import { extractEmailFromText } from "@/modules/email/content";
import { BatchSessionView } from "@/features/batch/components/batch-session-view";
import { useRouter } from "next/navigation";

interface SessionViewProps {
  id: string;
}

export function SessionView({ id }: SessionViewProps) {
  const { data: session, isLoading, isError } = useSession(id);
  const router = useRouter();

  if (isLoading) {
    return (
      <div className="session-detail">
        <SkeletonList count={3} />
      </div>
    );
  }

  if (isError || !session) {
    return (
      <EmptyState
        icon="⚠"
        title="Session not found"
        description="This session may have been deleted or you don't have access to it."
        action={
          <Button variant="primary" onClick={() => router.push("/sessions")}>
            Back to Sessions
          </Button>
        }
      />
    );
  }

  if (session.type === "batch") {
    return (
      <BatchSessionView
        sessionId={session.id}
        title={session.title}
        category={session.category}
      />
    );
  }

  const messages = session.messages ?? [];

  return (
    <div className="session-detail">
      <div className="session-detail__header">
        <div>
          <h1 className="session-detail__title">{session.title}</h1>
          <span className="session-detail__category">{session.category.replace(/_/g, " ")}</span>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <Button
            variant="secondary"
            onClick={() => router.push(`/?sessionId=${session.id}&clone=true`)}
          >
            Edit Prompt & Generate
          </Button>
          <Button
            variant="primary"
            onClick={() => router.push(`/?sessionId=${session.id}`)}
          >
            Continue
          </Button>
        </div>
      </div>

      <div className="session-detail__messages">
        {messages.length === 0 ? (
          <EmptyState
            icon="✉"
            title="No messages yet"
            description="Start a conversation to see messages here."
            action={
              <Button
                variant="primary"
                onClick={() => router.push(`/?sessionId=${session.id}`)}
              >
                Start Writing
              </Button>
            }
          />
        ) : (
          messages.map((msg, idx) => {
            const prevUserMsg = idx > 0 && messages[idx - 1]!.role === "user" ? messages[idx - 1] : null;
            const extractedRecipient = prevUserMsg ? extractEmailFromText(prevUserMsg.content) : null;
            return <MessageBubble key={msg.id} message={msg} defaultRecipient={extractedRecipient ?? undefined} />;
          })
        )}
      </div>
    </div>
  );
}

// ============================================================
// FILE: src/features/sessions/components/session-view.tsx
// ============================================================
// PURPOSE: Full detail view of a single session showing its messages and action buttons.
// HOW IT works: Fetches the session and its messages via useSession. Shows a skeleton while loading, an EmptyState on error, or the session header (title, category) with "Continue" and "Edit Prompt & Generate" buttons. Messages are rendered as MessageBubble components; if none exist, prompts the user to start writing.
// PROPS: id (string).
// INTEGRATION: useSession hook, MessageBubble, Button, EmptyState, SkeletonList, Next.js useRouter.
// ============================================================
