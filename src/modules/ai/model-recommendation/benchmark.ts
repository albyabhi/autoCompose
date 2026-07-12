import OpenAI from "openai";
import { getConfig } from "@/config";
import { logger } from "@/lib/logger";
import { wrapWithTimeout } from "@/lib/timeout";
import { getRecommendedModelState, setRecommendedModelState } from "./state";
import type { BenchmarkConfig, ModelBenchmarkMetrics, ModelCandidate } from "./types";
import { selectFastestModel } from "./select";
import type { ModelId } from "../types";
import { MODEL_IDS } from "../types";

function getDefaultBenchmarkConfig(): BenchmarkConfig {
  return {
    intervalMs: Number.parseInt(process.env.AI_MODEL_BENCHMARK_INTERVAL_MS ?? "600000", 10), // 10m
    modelsPerCycle: Number.parseInt(process.env.AI_MODEL_BENCHMARK_MODELS_PER_CYCLE ?? "8", 10),
    samplesPerModel: Number.parseInt(process.env.AI_MODEL_BENCHMARK_SAMPLES_PER_MODEL ?? "2", 10),
    timeoutMs: Number.parseInt(process.env.AI_MODEL_BENCHMARK_TIMEOUT_MS ?? "20000", 10),
    minimumSuccessRate: Number.parseFloat(process.env.AI_MODEL_BENCHMARK_MIN_SUCCESS_RATE ?? "0.7"),
    includeDiscoveredModels: process.env.AI_MODEL_BENCHMARK_INCLUDE_DISCOVERED_MODELS === "true",
  };
}

function getConfiguredCandidates(): ModelCandidate[] {
  const keys = Object.keys(MODEL_IDS) as ModelId[];
  return keys.map((modelId) => ({
    modelId,
    modelUsed: MODEL_IDS[modelId],
  }));
}

async function tryDiscoverAdditionalModels(openai: OpenAI): Promise<ModelCandidate[]> {
  // Best-effort discovery:
  // OpenAI-compatible APIs sometimes expose GET /models or openai.models.list().
  // NVIDIA NIM may or may not support it. We guard with try/catch and return empty on failure.
  if (process.env.AI_MODEL_BENCHMARK_DISCOVERY_MODE !== "true") {
    return [];
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const anyOpenAI: any = openai;
    if (typeof anyOpenAI.models?.list !== "function") return [];

    const list = await openai.models.list();
    const items = list.data ?? [];
    const candidates: ModelCandidate[] = [];

    for (const m of items) {
      const id: string | undefined = (m as { id?: string }).id;
      if (!id) continue;

      // We only accept ids we can map to the existing UI model keys.
      // If the provider returns raw NVIDIA ids only, we'd need a separate “discovered” modelId abstraction.
      // For now, discovery is only used to improve performance among configured model keys (if it returns aliases).
      // So we match by presence of configured modelUsed strings.
      const configured = getConfiguredCandidates();
      const match = configured.find((c) => c.modelUsed === id);
      if (match) candidates.push(match);
    }

    // Deduplicate
    const byKey = new Map<string, ModelCandidate>();
    for (const c of candidates) byKey.set(c.modelId, c);
    return Array.from(byKey.values());
  } catch (error) {
    logger.info("AI model discovery skipped/failed", {
      error: error instanceof Error ? error.message : String(error),
    });
    return [];
  }
}

function buildBenchmarkPrompt(): { system: string; user: string } {
  // Keep it short and stable: benchmark should measure latency, not output quality.
  return {
    system: "You are a fast email drafting assistant. Return only the email template.",
    user:
      "Write a short, professional email: subject line + body. Category: custom. No markdown.",
  };
}

async function benchmarkOneModel(params: {
  openai: OpenAI;
  model: ModelCandidate;
  samplesPerModel: number;
  timeoutMs: number;
}): Promise<ModelBenchmarkMetrics> {
  const { openai, model, samplesPerModel, timeoutMs } = params;

  let successCount = 0;
  let totalDuration = 0;
  const durations: number[] = [];
  let lastError: string | undefined;

  for (let i = 0; i < samplesPerModel; i++) {
    const start = Date.now();
    try {
      const prompt = buildBenchmarkPrompt();
      const response = await wrapWithTimeout(
        openai.chat.completions.create({
          model: model.modelUsed,
          messages: [
            { role: "system", content: prompt.system },
            { role: "user", content: prompt.user },
          ],
          temperature: 0.2,
          max_tokens: 256,
        }),
        timeoutMs,
        `benchmark:${model.modelId}:${i + 1}`
      );

      const content = response.choices?.[0]?.message?.content ?? "";
      if (typeof content !== "string") {
        throw new Error("Invalid benchmark content");
      }

      const duration = Date.now() - start;
      successCount += 1;
      totalDuration += duration;
      durations.push(duration);
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error);
      logger.debug("Benchmark sample failed", {
        model: model.modelId,
        modelUsed: model.modelUsed,
        sample: i + 1,
        error: lastError,
      });
    }
  }

  const sampleCount = samplesPerModel;
  const successRate = sampleCount > 0 ? successCount / sampleCount : 0;
  const avgDurationMs = successCount > 0 ? totalDuration / successCount : Number.POSITIVE_INFINITY;

  // p95 (best-effort)
  let p95DurationMs: number | undefined;
  if (durations.length >= 2) {
    const sorted = [...durations].sort((a, b) => a - b);
    const idx = Math.floor(0.95 * (sorted.length - 1));
    p95DurationMs = sorted[idx];
  }

  return {
    modelId: model.modelId,
    modelUsed: model.modelUsed,
    sampleCount,
    avgDurationMs,
    p95DurationMs,
    successRate,
    lastUpdatedAt: Date.now(),
    lastError,
  };
}

export async function refreshModelRecommendationOnce(overrideConfig?: Partial<BenchmarkConfig>): Promise<void> {
  const cfg = { ...getDefaultBenchmarkConfig(), ...(overrideConfig ?? {}) };

  const openai = new OpenAI({
    apiKey: getConfig().nvidia.apiKey,
    baseURL: getConfig().nvidia.baseUrl,
  });

  const configured = getConfiguredCandidates();
  let discovered: ModelCandidate[] = [];

  if (cfg.includeDiscoveredModels) {
    discovered = await tryDiscoverAdditionalModels(openai);
  }

  const candidates = discovered.length > 0 ? discovered : configured;

  const slice = candidates.slice(0, Math.max(1, cfg.modelsPerCycle));
  const previous = getRecommendedModelState();

  logger.info("Model recommendation benchmark cycle started", {
    candidates: slice.map((c) => c.modelId),
    samplesPerModel: cfg.samplesPerModel,
    timeoutMs: cfg.timeoutMs,
    minimumSuccessRate: cfg.minimumSuccessRate,
    hasPrevious: !!previous,
  });

  const metrics: ModelBenchmarkMetrics[] = [];
  for (const candidate of slice) {
    // Sequential to limit concurrency and avoid spikes.
    const m = await benchmarkOneModel({
      openai,
      model: candidate,
      samplesPerModel: cfg.samplesPerModel,
      timeoutMs: cfg.timeoutMs,
    });
    metrics.push(m);
  }

  const minimumSuccessRate = cfg.minimumSuccessRate;
  const best = selectFastestModel(metrics, minimumSuccessRate);

  if (!best) {
    logger.info("Model recommendation found no valid candidates; keeping previous recommendation");
    return;
  }

  const reason = `Fastest avg latency among models with successRate >= ${minimumSuccessRate}. Avg: ${best.avgDurationMs.toFixed(
    0
  )}ms, successRate: ${(best.successRate * 100).toFixed(0)}%`;

  const confidence: "low" | "medium" | "high" =
    best.successRate >= 0.9 ? "high" : best.successRate >= 0.7 ? "medium" : "low";

  const next = {
    recommendedModelKey: best.modelId,
    recommendedModelUsed: best.modelUsed,
    reason,
    metrics: best,
    benchmarkedAt: Date.now(),
    confidence,
  };

  setRecommendedModelState(next);
  logger.info("Model recommendation updated", {
    recommendedModelKey: next.recommendedModelKey,
    recommendedModelUsed: next.recommendedModelUsed,
    reason: next.reason,
  });
}

// ============================================================
// FILE: src/modules/ai/model-recommendation/benchmark.ts
// ============================================================
// PURPOSE: Benchmarks candidate NVIDIA NIM models for fast email writing latency.
// HOW IT WORKS: Builds a short stable prompt, then runs N samples per model with
//   a timeout. Computes successRate, avg latency, and best-effort p95. Selects
//   the fastest model using deterministic selection logic. Updates the in-memory
//   recommendation state. Includes guarded “best-effort discovery” that is disabled
//   by default and can be enabled via env flags.
// INTEGRATION: Consumed by the background worker; uses getConfig() for NVIDIA
//   baseUrl/apiKey and OpenAI SDK for OpenAI-compatible NIM endpoints.
// ============================================================
