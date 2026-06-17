"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { GenerateForm } from "./generate-form";
import { BatchComposeView } from "@/features/batch/components/batch-compose-view";

export function ComposePage() {
  const searchParams = useSearchParams();
  const initialMode = searchParams.get("mode") === "batch" ? "batch" : "single";
  const initialSessionId = searchParams.get("sessionId");
  const [mode, setMode] = useState<"single" | "batch">(initialMode);

  return (
    <div className="compose-page">
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

      {mode === "single" ? (
        <GenerateForm />
      ) : (
        <BatchComposeView initialSessionId={initialMode === "batch" ? initialSessionId : null} />
      )}
    </div>
  );
}
