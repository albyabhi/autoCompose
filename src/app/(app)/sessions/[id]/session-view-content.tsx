"use client";

import { SessionView } from "@/features/sessions/components/session-view";

export function SessionViewContent({ id }: { id: string }) {
  return <SessionView id={id} />;
}
