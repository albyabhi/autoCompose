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
