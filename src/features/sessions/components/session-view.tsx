"use client";

import { useSession } from "../hooks/use-sessions";
import { SkeletonList } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { MessageBubble } from "./message-bubble";
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
          messages.map((msg) => <MessageBubble key={msg.id} message={msg} />)
        )}
      </div>
    </div>
  );
}
