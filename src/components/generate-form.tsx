"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession as useAppSession } from "@/features/sessions/hooks/use-sessions";
import { useQueryClient } from "@tanstack/react-query";
import { ModelSelector } from "./model-selector";
import { ResponseDisplay } from "./response-display";
import { MODEL_IDS_KEYS, DEFAULT_MODEL_ID, type ModelId, type FormalityLevel } from "@/modules/ai/types";
import Link from "next/link";
import { CATEGORY_OPTIONS, CATEGORY_POLICIES, type EmailCategory } from "@/modules/email/categories";
import { extractEmailFromText } from "@/modules/email/content";
import { useProfile } from "@/features/profile/hooks/use-profile";
import { useLayoutStore } from "@/features/layout/stores/layout-store";
import { useGuest } from "@/features/guest/hooks/use-guest";
import { useGuestStore } from "@/features/guest/stores/guest-store";
import { GuestBanner } from "@/features/guest/components/guest-banner";
import { GUEST_HEADER, isGuestActive } from "@/lib/guest";

export function GenerateForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const { isGuestMode, count, remaining } = useGuest();
  const incrementGuest = useGuestStore((s) => s.increment);
  const rawSessionId = searchParams.get("sessionId");
  // Guests are stateless: ignore any ?sessionId (no cross-user history).
  const initialSessionId = isGuestMode ? null : rawSessionId;
  const clonePrompt = !isGuestMode && searchParams.get("clone") === "true";
  
  const { data: sessionData } = useAppSession(!isGuestMode && initialSessionId ? initialSessionId : "");
  const { data: profileData } = useProfile();
  
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const setDraft = useLayoutStore((s) => s.setDraft);
  const clearDraft = useLayoutStore((s) => s.clearDraft);

  const [restored, setRestored] = useState(() => {
    // Guest trial never inherits the authed in-memory draft (same-tab logout→guest).
    if (isGuestActive()) return false;
    const saved = useLayoutStore.getState().draft;
    return !initialSessionId && !clonePrompt && !!saved;
  });
  const [prompt, setPrompt] = useState(() => {
    if (isGuestActive()) return "";
    const saved = useLayoutStore.getState().draft;
    return !initialSessionId && !clonePrompt && saved ? saved.prompt : "";
  });
  const [promptEdited, setPromptEdited] = useState(() => {
    if (isGuestActive()) return false;
    const saved = useLayoutStore.getState().draft;
    return !initialSessionId && !clonePrompt && !!saved;
  });
  const [category, setCategory] = useState<EmailCategory>(() => {
    if (isGuestActive()) return "custom";
    const saved = useLayoutStore.getState().draft;
    return !initialSessionId && !clonePrompt && saved ? (saved.category as EmailCategory) : "custom";
  });
  const [tone, setTone] = useState<FormalityLevel | null>(null);
  const [modelId, setModelId] = useState<ModelId>(DEFAULT_MODEL_ID);
  const [userTouchedModel, setUserTouchedModel] = useState(false);
  const [modelSelection, setModelSelection] = useState<ModelId | "recommended">("recommended");
  const [response, setResponse] = useState<string | null>(null);
  const [modelUsed, setModelUsed] = useState<string | null>(null);
  const [generatedSessionId, setGeneratedSessionId] = useState<string | undefined>(initialSessionId || undefined);
  const [assistantMessageId, setAssistantMessageId] = useState<string | undefined>();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [extractedRecipient, setExtractedRecipient] = useState<string | null>(null);

  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  useEffect(() => {
    if (isGuestMode) return;
    if (!initialSessionId && !clonePrompt && (promptEdited || prompt)) {
      setDraft({ prompt, category });
    }
  }, [prompt, category, promptEdited, initialSessionId, clonePrompt, setDraft, isGuestMode]);

  const storedPreferred = profileData?.profile?.preferences?.preferredModel;
  const profileFormality = profileData?.profile?.preferences?.formalityLevel;
  const effectiveTone = tone ?? profileFormality;

  const effectiveModelId: ModelId =
    !userTouchedModel && modelSelection === "recommended"
      ? // When using “recommended”, we still send a deterministic modelId to the API.
        // The actual recommended key may change on the server; on the client we fall back to
        // the profile preferred model until the server recommendation is available.
        (typeof storedPreferred === "string" &&
        (MODEL_IDS_KEYS as readonly string[]).includes(storedPreferred)
          ? (storedPreferred as ModelId)
          : modelId)
      : modelId;

  const handleModelChange = (next: ModelId | "recommended") => {
    if (next === "recommended") {
      setUserTouchedModel(false);
      setModelSelection("recommended");
      return;
    }
    setUserTouchedModel(true);
    setModelSelection(next);
    setModelId(next);
  };

  const clonedPrompt = !isGuestMode && clonePrompt && sessionData?.messages
    ? ([...sessionData.messages].reverse().find((message) => message.role === "user")?.content ?? "")
    : "";
  const effectivePrompt = promptEdited ? prompt : clonedPrompt;
  const sessionCategory = (!isGuestMode ? sessionData?.category : undefined) as EmailCategory | undefined;
  const effectiveCategory: EmailCategory = sessionCategory ?? category;
  const policy = CATEGORY_POLICIES[effectiveCategory];
  const missingSections: string[] = isGuestMode
    ? []
    : (profileData?.readiness[effectiveCategory]?.missingSections ?? []);
  const limitReached = isGuestMode && remaining <= 0;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (isGuestMode && remaining <= 0) {
      setError("Limit exceeded — please login.");
      return;
    }
    setLoading(true);
    setResponse(null);

    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(isGuestMode ? { [GUEST_HEADER]: "1" } : {}),
        },
        body: JSON.stringify({
          prompt: effectivePrompt,
          category: effectiveCategory,
          modelId: effectiveModelId,
          tone: tone ?? undefined,
          sessionId: !isGuestMode && initialSessionId ? initialSessionId : undefined,
          ...(isGuestMode ? { guest: true } : {}),
        }),
      });

      const data = await res.json();

      if (!data.success) {
        if (res.status === 401) {
          throw new Error(isGuestMode ? "Please login to continue." : "Please sign in to generate emails");
        }
        if (data.error?.code === "GUEST_LIMIT_EXCEEDED") {
          throw new Error("Limit exceeded — please login.");
        }
        throw new Error(data.error?.message ?? "Generation failed");
      }

      setResponse(data.data.content);
      setModelUsed(data.data.modelUsed);
      if (isGuestMode) {
        setGeneratedSessionId(undefined);
        setAssistantMessageId(undefined);
        incrementGuest();
      } else {
        setGeneratedSessionId(data.data.sessionId);
        setAssistantMessageId(data.data.assistantMessageId);
      }
      setExtractedRecipient(extractEmailFromText(effectivePrompt));
      if (!isGuestMode) clearDraft();

      if (!isGuestMode) {
        // Invalidate sessions cache to update sidebar
        queryClient.invalidateQueries({ queryKey: ["sessions"] });

        if (data.data.sessionId && !initialSessionId) {
          router.push(`/sessions/${data.data.sessionId}`);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
      textareaRef.current?.focus();
    }
  }

  return (
    <div className="generate-page">
      {isGuestMode && (
        <GuestBanner count={count} remaining={remaining} limitReached={limitReached} />
      )}
      {restored && !isGuestMode && (
        <div className="profile-readiness-warning">
          <div>Draft restored from your previous session</div>
          <button type="button" className="draft-restore-dismiss" onClick={() => { clearDraft(); setRestored(false); setPrompt(""); setPromptEdited(true); }}>Discard</button>
        </div>
      )}

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

          <ModelSelector value={userTouchedModel ? modelId : "recommended"} onChange={handleModelChange} />
        </div>

        <div className="form-controls">
          <div className="field-group">
            <label className="field-label">Tone</label>
            <div className="tone-toggle">
              {(["formal", "semi-formal", "casual"] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  className={`tone-btn ${effectiveTone === t ? "tone-btn--active" : ""}`}
                  onClick={() => setTone(tone === t ? null : t)}
                >
                  {t === "semi-formal" ? "Neutral" : t.charAt(0).toUpperCase() + t.slice(1)}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="field-group">
          <label htmlFor="prompt-input" className="field-label">
            What kind of email do you need?
          </label>
          <textarea
            ref={textareaRef}
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
          <span className="field-hint" style={(() => {
            const pct = effectivePrompt.length / 5000;
            const color = pct > 0.95 ? "var(--text-danger)" : pct > 0.8 ? "var(--text-warning)" : "var(--text-muted)";
            return { color };
          })()}>{effectivePrompt.length} / 5000</span>
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

        <button
          type="submit"
          className="generate-btn"
          disabled={loading || effectivePrompt.length < 10 || limitReached}
          title={limitReached ? "Limit exceeded — please login." : undefined}
        >
          {loading ? "Generating..." : limitReached ? "Limit Reached — Login" : "Generate Email"}
        </button>
      </form>

      <ResponseDisplay
        content={response}
        modelUsed={modelUsed}
        loading={loading}
        error={error}
        defaultRecipient={extractedRecipient ?? undefined}
        sourceSessionId={generatedSessionId}
        sourceMessageId={assistantMessageId}
        category={effectiveCategory}
        prompt={effectivePrompt}
        modelId={effectiveModelId}
        isGuest={isGuestMode}
      />
    </div>
  );
}

// ============================================================
// FILE: src/components/generate-form.tsx
// ============================================================
// PURPOSE: The main "write an email" form on the dashboard — category picker, model selector, prompt textarea, and tone toggle, plus live guidance and profile completeness warnings.
// HOW IT WORKS: Client-side React component that manages the entire email composition UI:
//   STATE: prompt (textarea), category (dropdown), modelId (ModelSelector), tone (formal/semi-formal/casual toggle), response (AI result), loading/error states, extractedRecipient (auto-detected email in prompt).
//   INITIALIZATION: Reads URL params for sessionId (continue existing conversation) or clone=true (copy prompt from session). Restores draft from layout store (survives navigation).
//   MODEL SELECTION: Defaults to "recommended" (server-side fastest model). User can pick specific model. If profile has preferredModel, uses that as fallback.
//   SUBMISSION (handleSubmit): POSTs to /api/generate with prompt, category, modelId, tone, sessionId. Guest trial sends x-guest:1 + guest:true with no sessionId, increments the client counter only on success (validation/AI failures don't consume), and never navigates to /sessions or touches the authed draft. On success: shows ResponseDisplay with generated email, clears draft, invalidates sessions cache, navigates to session page if new.
//   PROFILE READINESS: Shows warning if current category needs profile sections that aren't filled (e.g., job_application needs professional + resume). Links to settings.
//   CATEGORY GUIDANCE: Shows "For best results, include:" with category-specific hints from CATEGORY_POLICIES.
//   PROPS: None (page-level component).
// INTEGRATION: Email categories (CATEGORY_OPTIONS, CATEGORY_POLICIES), AI types (ModelId, FormalityLevel), profile hook (useProfile), session hook (useAppSession), layout store (draft persistence), API client (fetch), ResponseDisplay component, extractEmailFromText utility.
// ============================================================
