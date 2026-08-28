import type { ModelBenchmarkMetrics, Confidence } from "./types";

export type RecommendedModelState = {
  recommendedModelKey: string; // UI key; resolves to ModelId when possible
  recommendedModelUsed: string;
  reason: string;
  metrics: ModelBenchmarkMetrics;
  benchmarkedAt: number;
  confidence: Confidence;
};

let cached: RecommendedModelState | null = null;

export function getRecommendedModelState(): RecommendedModelState | null {
  return cached;
}

export function setRecommendedModelState(next: RecommendedModelState): void {
  cached = next;
}

export function clearRecommendedModelState(): void {
  cached = null;
}

// ============================================================
// FILE: src/modules/ai/model-recommendation/state.ts
// ============================================================
// PURPOSE: In-memory cache that holds the current "fastest model" recommendation so the UI can suggest it without re-running benchmarks.
// HOW IT WORKS: Simple module-level variable (cached) that stores a RecommendedModelState object:
//   - recommendedModelKey: Short key like "deepseek" (UI display)
//   - recommendedModelUsed: Full model ID like "deepseek-ai/deepseek-v4-flash"
//   - reason: Human-readable explanation (e.g., "Fastest with 95% success rate over 50 runs")
//   - metrics: The full benchmark metrics (avgDurationMs, successRate, sampleCount, p95DurationMs, lastUpdatedAt)
//   - benchmarkedAt: Unix timestamp of when this recommendation was generated
//   - confidence: high/medium/low based on data quality
//   Functions: getRecommendedModelState() reads the cache, setRecommendedModelState() updates it (called by benchmark worker), clearRecommendedModelState() resets it. This is in-memory only — resets on server restart; the benchmark worker (src/lib/model-benchmark-worker.ts) repopulates it periodically.
// INTEGRATION: Used by benchmark worker (src/lib/model-benchmark-worker.ts), model recommendation API (src/app/api/ai/recommend/route.ts), and GenerateForm component (src/components/generate-form.tsx) for UI fallback. Types from ./types.ts.
// ============================================================
