import { SessionViewContent } from "./session-view-content";

export default async function SessionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <SessionViewContent id={id} />;
}

// ============================================================
// FILE: src/app/(app)/sessions/[id]/page.tsx
// ============================================================
// PURPOSE: Session detail page — extracts session ID and renders the session view.
// HOW IT WORKS: Server component that awaits the dynamic route params to extract
//   the session ID. Passes the ID to the client-side SessionViewContent component
//   which handles fetching messages, editing, sending, and deletion.
// INTEGRATION: SessionViewContent (client component)
// ============================================================
