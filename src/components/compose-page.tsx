"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { GenerateForm } from "./generate-form";
import { BatchComposeView } from "@/features/batch/components/batch-compose-view";
import { useGuest } from "@/features/guest/hooks/use-guest";

export function ComposePage() {
  const searchParams = useSearchParams();
  const { isGuestMode } = useGuest();
  const requestedBatch = searchParams.get("mode") === "batch";
  const initialMode = !isGuestMode && requestedBatch ? "batch" : "single";
  const initialSessionId = searchParams.get("sessionId");
  const [mode, setMode] = useState<"single" | "batch">(initialMode);

  const effectiveMode = isGuestMode ? "single" : mode;

  return (
    <div className="compose-page">
      {isGuestMode ? (
        <div className="compose-page__toggle compose-page__toggle--guest">
          <button
            className="compose-page__toggle-btn compose-page__toggle-btn--active"
            type="button"
          >
            Single
          </button>
          <button
            className="compose-page__toggle-btn"
            type="button"
            disabled
            title="Login to use Batch"
          >
            Batch (login required)
          </button>
        </div>
      ) : (
        <div className="compose-page__toggle">
          <button
            className={`compose-page__toggle-btn ${mode === "single" ? "compose-page__toggle-btn--active" : ""}`}
            onClick={() => setMode("single")}
          >
            Single
          </button>
          <button
            className={`compose-page__toggle-btn ${mode === "batch" ? "compose-page__toggle-btn--active" : ""}`}
            onClick={() => setMode("batch")}
          >
            Batch
          </button>
        </div>
      )}

      {effectiveMode === "single" ? (
        <GenerateForm />
      ) : (
        <BatchComposeView initialSessionId={initialMode === "batch" ? initialSessionId : null} />
      )}
    </div>
  );
}

// ============================================================
// FILE: src/components/compose-page.tsx
// ============================================================
// PURPOSE: Compose mode switcher — single form vs batch view, single-only for guests.
// HOW IT WORKS: Reads ?mode/?sessionId from search params. Guest-trial visitors
//   are forced to single mode with a disabled Batch affordance (login tooltip);
//   authed users keep the Single/Batch toggle. Renders GenerateForm or
//   BatchComposeView accordingly.
// PROPS: None (page-level component).
// INTEGRATION: GenerateForm, BatchComposeView, useGuest gate.
// ============================================================
