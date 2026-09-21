import OpenAI from "openai";
import { getConfig } from "@/config";
import { AICompletionRequest, AICompletionResponse, MODEL_DEFAULTS, MODEL_IDS } from "../types";
import { BaseAIProvider } from "../provider";
import { AIProviderError } from "@/lib/errors";
import { logger } from "@/lib/logger";

export class NvidiaNIMProvider extends BaseAIProvider {
  readonly name = "nvidia-nim";
  private client: OpenAI;

  constructor() {
    super();
    const cfg = getConfig();
    this.client = new OpenAI({
      apiKey: cfg.nvidia.apiKey,
      baseURL: cfg.nvidia.baseUrl,
    });
  }

  async complete(request: AICompletionRequest): Promise<AICompletionResponse> {
    const modelKey = request.config.modelId;
    const modelId = MODEL_IDS[modelKey];
    const defaults = MODEL_DEFAULTS[modelKey] ?? {};
    const startTime = Date.now();

    logger.info("AI completion request", {
      model: modelId,
      category: request.category,
    });

    try {
      const messages: { role: "system" | "user" | "assistant"; content: string }[] = [
        {
          role: "system",
          content: request.systemPrompt ?? this.buildSystemPrompt(request.profileContext, request.category),
        },
      ];

      if (request.messages && request.messages.length > 0) {
        messages.push(...request.messages);
      }

      messages.push({ role: "user", content: this.buildUserPrompt(request.prompt, request.category) });

      const response = await this.client.chat.completions.create({
        model: modelId,
        messages,
        temperature: request.config.temperature ?? defaults.temperature ?? 0.7,
        max_tokens: request.config.maxTokens ?? defaults.maxTokens ?? 1024,
        ...(request.responseFormat ? { response_format: request.responseFormat } : {}),
      });

      const duration = Date.now() - startTime;
      const content = response.choices[0]?.message?.content ?? "";
      const usage = response.usage;

      logger.info("AI completion success", {
        model: modelId,
        duration: `${duration}ms`,
        tokens: usage?.total_tokens,
      });

      return {
        content,
        modelUsed: modelId,
        durationMs: duration,
        usage: usage
          ? {
              promptTokens: usage.prompt_tokens,
              completionTokens: usage.completion_tokens,
              totalTokens: usage.total_tokens,
            }
          : undefined,
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error("AI completion failed", {
        model: modelId,
        duration: `${duration}ms`,
        error: error instanceof Error ? error.message : String(error),
      });

      throw new AIProviderError(
        error instanceof Error ? error.message : "AI provider request failed"
      );
    }
  }
}

// ============================================================
// FILE: src/modules/ai/providers/nvidia.ts
// ============================================================
// PURPOSE: The actual implementation that talks to NVIDIA's AI models (Nemotron, DeepSeek, Llama, Mistral, etc.) via their OpenAI-compatible API.
// HOW IT WORKS: Extends BaseAIProvider. On creation, initializes an OpenAI client with NVIDIA's API key and base URL (from config). The complete() method:
//   1. Maps the short model key (e.g., "gptOss") to the full model ID (e.g., "openai/gpt-oss-20b") using MODEL_IDS from types.ts.
//   2. Gets model-specific defaults (temperature, maxTokens) from MODEL_DEFAULTS.
//   3. Builds the message array: system prompt (from BaseAIProvider) + conversation history + user prompt.
//   4. Calls OpenAI chat.completions.create() with model, messages, temperature, maxTokens.
//   5. Returns standardized response: content, modelUsed, durationMs, token usage (prompt/completion/total).
//   6. Logs success (model, duration, tokens) or failure (model, duration, error).
//   Errors are wrapped in AIProviderError so callers can handle them uniformly.
//   2 live models available: gptOss, nemotron3Ultra (retired IDs removed 2026-09-21).
// INTEGRATION: NVIDIA NIM API (https://integrate.api.nvidia.com/v1); OpenAI SDK; config (src/config/index.ts) for apiKey/baseUrl/models; BaseAIProvider (src/modules/ai/provider.ts) for prompt building; AI types (src/modules/ai/types.ts) for model IDs and defaults. Called via factory (src/modules/ai/factory.ts).
// ============================================================
