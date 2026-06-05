"use client";

import { useState, useEffect } from "react";
import { useSession as useAuthSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession as useAppSession } from "@/features/sessions/hooks/use-sessions";
import { useQueryClient } from "@tanstack/react-query";
import { ModelSelector } from "./model-selector";
import { ResponseDisplay } from "./response-display";
import { ModelId } from "@/modules/ai/types";
import Link from "next/link";

const CATEGORIES = [
  { value: "job_application", label: "Job Application" },
  { value: "leave_request", label: "Leave Request" },
  { value: "sick_leave", label: "Sick Leave" },
  { value: "resignation", label: "Resignation" },
  { value: "complaint", label: "Complaint" },
  { value: "meeting_request", label: "Meeting Request" },
  { value: "custom", label: "Custom" },
] as const;

export function GenerateForm() {
  const { status } = useAuthSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const initialSessionId = searchParams.get("sessionId");
  const clonePrompt = searchParams.get("clone") === "true";
  
  const { data: sessionData } = useAppSession(initialSessionId || "");
  
  const [prompt, setPrompt] = useState("");
  const [category, setCategory] = useState("custom");
  const [modelId, setModelId] = useState<ModelId>("deepseek");
  const [response, setResponse] = useState<string | null>(null);
  const [modelUsed, setModelUsed] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (clonePrompt && sessionData && sessionData.messages) {
      const messages = sessionData.messages;
      const lastUserMessage = [...messages].reverse().find(m => m.role === "user");
      if (lastUserMessage && !prompt) { // Prevent overwriting if user already started typing
        setPrompt(lastUserMessage.content);
        setCategory(sessionData.category);
      }
    }
  }, [clonePrompt, sessionData, prompt]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    setResponse(null);

    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, category, modelId, sessionId: initialSessionId || undefined }),
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
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              {CATEGORIES.map((cat) => (
                <option key={cat.value} value={cat.value}>
                  {cat.label}
                </option>
              ))}
            </select>
          </div>

          <ModelSelector value={modelId} onChange={setModelId} />
        </div>

        <div className="field-group">
          <label htmlFor="prompt-input" className="field-label">
            What kind of email do you need?
          </label>
          <textarea
            id="prompt-input"
            className="field-textarea"
            placeholder="e.g., Write a professional leave request email to my manager for 3 days off next week..."
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            rows={5}
            required
          />
          <span className="field-hint">{prompt.length}/5000 characters</span>
        </div>

        <button type="submit" className="generate-btn" disabled={loading || prompt.length < 10}>
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
