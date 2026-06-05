import { z } from "zod";

export const MODEL_IDS = {
  deepseek: "deepseek-ai/deepseek-v4-flash",
  nemotron: "nvidia/llama-3.3-nemotron-super-49b-v1.5",
} as const;

export type ModelId = keyof typeof MODEL_IDS;

export const modelIdSchema = z.enum(["deepseek", "nemotron"]);

export const MODEL_LABELS: Record<ModelId, string> = {
  deepseek: "DeepSeek V4 Flash",
  nemotron: "Nemotron Super 49B",
};

export type FormalityLevel = "formal" | "semi-formal" | "casual";
export type PreferredTone = "professional" | "friendly" | "neutral" | "warm" | "direct";

export interface ProfileContext {
  sections: string[];
  signature: string;
  formality: FormalityLevel;
  tone: PreferredTone;
  hasJobInfo: boolean;
  language?: string;
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
