"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession as useAppSession } from "@/features/sessions/hooks/use-sessions";
import { useQueryClient } from "@tanstack/react-query";
import { ModelSelector } from "./model-selector";
import { ResponseDisplay } from "./response-display";
import { MODEL_IDS_KEYS, type ModelId } from "@/modules/ai/types";
import Link from "next/link";
import { CATEGORY_OPTIONS, CATEGORY_POLICIES, type EmailCategory } from "@/modules/email/categories";
import { useProfile } from "@/features/profile/hooks/use-profile";

export function GenerateForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const initialSessionId = searchParams.get("sessionId");
  const clonePrompt = searchParams.get("clone") === "true";
  
  const { data: sessionData } = useAppSession(initialSessionId || "");
  const { data: profileData } = useProfile();
  
  const [prompt, setPrompt] = useState("");
  const [promptEdited, setPromptEdited] = useState(false);
  const [category, setCategory] = useState<EmailCategory>("custom");
  const [modelId, setModelId] = useState<ModelId>("deepseek");
  const [userTouchedModel, setUserTouchedModel] = useState(false);
  const [response, setResponse] = useState<string | null>(null);
  const [modelUsed, setModelUsed] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const storedPreferred = profileData?.profile?.preferences?.preferredModel;
  const effectiveModelId =
    !userTouchedModel &&
    typeof storedPreferred === "string" &&
    (MODEL_IDS_KEYS as readonly string[]).includes(storedPreferred)
      ? (storedPreferred as ModelId)
      : modelId;

  const handleModelChange = (next: ModelId) => {
    setUserTouchedModel(true);
    setModelId(next);
  };

  const clonedPrompt = clonePrompt && sessionData?.messages
    ? [...sessionData.messages].reverse().find((message) => message.role === "user")?.content ?? ""
    : "";
  const effectivePrompt = promptEdited ? prompt : clonedPrompt;
  const effectiveCategory = (sessionData?.category as EmailCategory | undefined) ?? category;
  const policy = CATEGORY_POLICIES[effectiveCategory];
  const missingSections = profileData?.readiness[effectiveCategory]?.missingSections ?? [];

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    setResponse(null);

    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: effectivePrompt, category: effectiveCategory, modelId: effectiveModelId, sessionId: initialSessionId || undefined }),
      });

      const data = await res.json();

      if (!data.success) {
        if (res.status === 401) {
          throw new Error("Please sign in to generate emails");
        }
        throw new Error(data.error?.message ?? "Generation failed");
      }

      setResponse(data.data.content);
      setModelUsed(data.data.modelUsed);
      
      // Invalidate sessions cache to update sidebar
      queryClient.invalidateQueries({ queryKey: ["sessions"] });
      
      if (data.data.sessionId && !initialSessionId) {
        router.push(`/sessions/${data.data.sessionId}`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="generate-page">
      

      <form className="generate-form" onSubmit={handleSubmit}>
        <div className="form-controls">
          <div className="field-group">
            <label htmlFor="category-select" className="field-label">
              Category
            </label>
            <select
              id="category-select"
              className="field-select"
              value={effectiveCategory}
              onChange={(e) => setCategory(e.target.value as EmailCategory)}
              disabled={!!initialSessionId}
            >
              {CATEGORY_OPTIONS.map((cat) => (
                <option key={cat.value} value={cat.value}>
                  {cat.label}
                </option>
              ))}
            </select>
          </div>

          <ModelSelector value={effectiveModelId} onChange={handleModelChange} />
        </div>

        <div className="field-group">
          <label htmlFor="prompt-input" className="field-label">
            What kind of email do you need?
          </label>
          <textarea
            id="prompt-input"
            className="field-textarea"
            placeholder="e.g., Write a professional leave request email to my manager for 3 days off next week..."
            value={effectivePrompt}
            onChange={(e) => {
              setPromptEdited(true);
              setPrompt(e.target.value);
            }}
            rows={5}
            required
          />
          <span className="field-hint">{effectivePrompt.length}/5000 characters</span>
        </div>

        <div className="category-guidance">
          <strong>For the best result, include:</strong>
          <span>{policy.promptGuidance.join(", ")}</span>
        </div>

        {missingSections.length > 0 && (
          <div className="profile-readiness-warning">
            <div>
              <strong>Complete these profile sections for best results:</strong>{" "}
              {missingSections.map((section) => section === "jobApplication" ? "Job Application" : section[0].toUpperCase() + section.slice(1)).join(", ")}
            </div>
            <Link href={`/settings?category=${effectiveCategory}`}>Complete profile</Link>
          </div>
        )}

        <button type="submit" className="generate-btn" disabled={loading || effectivePrompt.length < 10}>
          {loading ? "Generating..." : "Generate Email"}
        </button>
      </form>

      <ResponseDisplay
        content={response}
        modelUsed={modelUsed}
        loading={loading}
        error={error}
      />
    </div>
  );
}

// ============================================================
// FILE: src/components/generate-form.tsx
// ============================================================
// PURPOSE: Main email generation form with category, model, and prompt inputs.
// HOW IT WORKS: Manages form state for prompt, category, and model selection.
//   Supports cloning prompts from existing sessions via URL params. On submit,
//   calls /api/generate and displays the result. Shows profile readiness warnings
//   for missing sections. Uses the user's preferred model from profile as default.
//   Invalidates sessions cache on success and navigates to the new session.
// PROPS: None (standalone page component)
// INTEGRATION: Email categories, AI types, profile hook, session hook, API client
// ============================================================
