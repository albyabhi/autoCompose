import { z } from "zod";
import type { EmailCategory, ProfileSection } from "@/modules/email/categories";

export const MODEL_IDS = {
  gptOss: "openai/gpt-oss-20b",
  nemotron3Super: "nvidia/nemotron-3-super-120b-a12b",
  nemotron3Ultra: "nvidia/nemotron-3-ultra-550b-a55b",
} as const;

export const MODEL_IDS_KEYS = [
  "gptOss",
  "nemotron3Super",
  "nemotron3Ultra",
] as const satisfies readonly (keyof typeof MODEL_IDS)[];

export type ModelId = (typeof MODEL_IDS_KEYS)[number];

export const modelIdSchema = z.enum(MODEL_IDS_KEYS);

export const MODEL_LABELS: Record<ModelId, { name: string; description: string }> = {
  gptOss: { name: "GPT-OSS 20B", description: "OpenAI open-weight reasoning (Apache-2.0)" },
  nemotron3Super: { name: "Nemotron 3 Super 120B", description: "Fast mid-size MoE, 120B total / 12B active" },
  nemotron3Ultra: { name: "Nemotron 3 Ultra 550B", description: "NVIDIA flagship reasoning, 550B param MoE (55B active)" },
};

export const DEFAULT_MODEL_ID: ModelId = "gptOss";

export const MODEL_DEFAULTS: Partial<Record<ModelId, { temperature?: number; maxTokens?: number }>> = {};

export type FormalityLevel = "formal" | "semi-formal" | "casual";
export type PreferredTone = "professional" | "friendly" | "neutral" | "warm" | "direct";

export interface ProfileContext {
  sections: string[];
  selectedSections: ProfileSection[];
  characterCount: number;
  signature: string;
  formality: FormalityLevel;
  tone: PreferredTone;
  language?: string;
}

export interface ProfileReadiness {
  category: EmailCategory;
  selectedSections: ProfileSection[];
  missingSections: ProfileSection[];
}

export interface ContextMetrics {
  profileSections: ProfileSection[];
  profileCharacters: number;
  historyMessages: number;
  historyCharacters: number;
}

export interface AIConfig {
  modelId: ModelId;
  temperature?: number;
  maxTokens?: number;
}

export interface AICompletionRequest {
  prompt: string;
  category: string;
  config: AIConfig;
  profileContext?: ProfileContext;
  systemPrompt?: string;
  messages?: { role: "user" | "assistant"; content: string }[];
  responseFormat?: { type: "json_object" };
}

export interface AICompletionResponse {
  content: string;
  modelUsed: string;
  durationMs?: number;
  usage?: {
    promptTokens?: number;
    completionTokens?: number;
    totalTokens?: number;
  };
}

export interface AIProvider {
  readonly name: string;
  complete(request: AICompletionRequest): Promise<AICompletionResponse>;
}

// ============================================================
// FILE: src/modules/ai/types.ts
// ============================================================
// PURPOSE: Defines all TypeScript types, constants, and Zod schemas for the AI module.
// HOW IT WORKS: MODEL_IDS maps friendly keys (gptOss, nemotron3Ultra) to NVIDIA NIM
//   model identifiers. DEFAULT_MODEL_ID is the single fallback used by every UI
//   default, Zod schema, and service so retired models can never leak back in.
//   MODEL_LABELS provides display names and descriptions for the live models.
//   MODEL_DEFAULTS overrides temperature/maxTokens for specific models. ProfileContext
//   carries user profile data for prompt enrichment. AICompletionRequest/Response define
//   the standard interface for AI completions. AIProvider is the contract that providers
//   must implement.
// INTEGRATION: Used by all AI module files, email service, and Telegram AI bridge
// ============================================================
