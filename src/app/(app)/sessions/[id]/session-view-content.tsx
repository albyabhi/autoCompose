"use client";

import { SessionView } from "@/features/sessions/components/session-view";

export function SessionViewContent({ id }: { id: string }) {
  return <SessionView id={id} />;
}

// ============================================================
// FILE: src/app/(app)/sessions/[id]/session-view-content.tsx
// ============================================================
// PURPOSE: Thin client wrapper to pass session ID to the SessionView feature component.
// HOW IT WORKS: Client component that accepts a session ID string prop and renders
//   the SessionView component from the sessions feature module. This exists to
//   bridge server/client boundary — the parent page.tsx extracts the ID from
//   params (server) and passes it here (client) for interactive session viewing.
// INTEGRATION: SessionView feature component
// ============================================================
