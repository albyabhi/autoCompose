import { z } from "zod";
import type { EmailCategory, ProfileSection } from "@/modules/email/categories";

export const MODEL_IDS = {
  deepseek: "deepseek-ai/deepseek-v4-flash",
  nemotron: "nvidia/llama-3.3-nemotron-super-49b-v1.5",
  gptOss: "openai/gpt-oss-20b",
  mistralSmall: "mistralai/mistral-small-4-119b-2603",
  llamaMaverick: "meta/llama-4-maverick-17b-128e-instruct",
  minimaxM27: "minimaxai/minimax-m2.7",
  llamaNemotronNano: "nvidia/llama-3.1-nemotron-nano-vl-8b-v1",
  nemotron3Ultra: "nvidia/nemotron-3-ultra-550b-a55b",
  nemotron35Lightning: "nvidia/nemotron-3.5-lightning-30b-a3b",
} as const;

export const MODEL_IDS_KEYS = [
  "deepseek",
  "nemotron",
  "gptOss",
  "mistralSmall",
  "llamaMaverick",
  "minimaxM27",
  "llamaNemotronNano",
  "nemotron3Ultra",
  "nemotron35Lightning",
] as const satisfies readonly (keyof typeof MODEL_IDS)[];

export type ModelId = (typeof MODEL_IDS_KEYS)[number];

export const modelIdSchema = z.enum(MODEL_IDS_KEYS);

export const MODEL_LABELS: Record<ModelId, { name: string; description: string }> = {
  deepseek: { name: "DeepSeek V4 Flash", description: "Fast general-purpose drafting" },
  nemotron: { name: "Nemotron Super 49B", description: "NVIDIA reasoning model" },
  gptOss: { name: "GPT-OSS 20B", description: "OpenAI open-weight reasoning (Apache-2.0)" },
  mistralSmall: { name: "Mistral Small 4 (119B)", description: "Hybrid instruct + reasoning, 256K ctx" },
  llamaMaverick: { name: "Llama 4 Maverick 17B", description: "Meta multimodal MoE, 1M ctx" },
  minimaxM27: { name: "MiniMax M2.7", description: "Code/agent-tuned MoE (230B/10B)" },
  llamaNemotronNano: { name: "Llama Nemotron Nano 8B VL", description: "NVIDIA lightweight multimodal vision-language" },
  nemotron3Ultra: { name: "Nemotron 3 Ultra 550B", description: "NVIDIA flagship reasoning, 550B param MoE (55B active)" },
  nemotron35Lightning: { name: "Nemotron 3.5 Lightning 30B", description: "Fast MoE execution, 30B total / 3B active, 1M ctx" },
};

export const MODEL_DEFAULTS: Partial<Record<ModelId, { temperature?: number; maxTokens?: number }>> = {
  mistralSmall: { temperature: 0.6 },
  minimaxM27: { temperature: 1.0 },
  nemotron35Lightning: { temperature: 1.0 },
};

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
// HOW IT WORKS: MODEL_IDS maps friendly keys (deepseek, nemotron, etc.) to NVIDIA NIM
//   model identifiers. MODEL_LABELS provides display names and descriptions for 9 models.
//   MODEL_DEFAULTS overrides temperature/maxTokens for specific models. ProfileContext
//   carries user profile data for prompt enrichment. AICompletionRequest/Response define
//   the standard interface for AI completions. AIProvider is the contract that providers
//   must implement.
// INTEGRATION: Used by all AI module files, email service, and Telegram AI bridge
// ============================================================
