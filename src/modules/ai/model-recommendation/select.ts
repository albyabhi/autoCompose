import type { ModelBenchmarkMetrics } from "./types";
import { DEFAULT_CONFIDENCE_THRESHOLDS, type Confidence } from "./types";

function confidenceFrom(metrics: ModelBenchmarkMetrics, thresholds: typeof DEFAULT_CONFIDENCE_THRESHOLDS): Confidence {
  const high = metrics.sampleCount >= thresholds.high.minSamples && metrics.successRate >= thresholds.high.minSuccessRate;
  if (high) return "high";

  const medium =
    metrics.sampleCount >= thresholds.medium.minSamples && metrics.successRate >= thresholds.medium.minSuccessRate;
  if (medium) return "medium";

  return "low";
}

export function selectFastestModel(candidates: ModelBenchmarkMetrics[], minimumSuccessRate: number): ModelBenchmarkMetrics | null {
  const valid = candidates.filter((c) => c.successRate >= minimumSuccessRate && c.sampleCount > 0);
  if (valid.length === 0) return null;

  // Sort: lowest avgDurationMs first; tie-breaker: higher successRate; tie-breaker: lowest p95 if available; tie-breaker: latest update
  const sorted = [...valid].sort((a, b) => {
    if (a.avgDurationMs !== b.avgDurationMs) return a.avgDurationMs - b.avgDurationMs;
    if (a.successRate !== b.successRate) return b.successRate - a.successRate;
    const aP95 = a.p95DurationMs ?? Number.POSITIVE_INFINITY;
    const bP95 = b.p95DurationMs ?? Number.POSITIVE_INFINITY;
    if (aP95 !== bP95) return aP95 - bP95;
    return b.lastUpdatedAt - a.lastUpdatedAt;
  });

  return sorted[0];
}

export function inferConfidence(metrics: ModelBenchmarkMetrics): Confidence {
  return confidenceFrom(metrics, DEFAULT_CONFIDENCE_THRESHOLDS);
}

// ============================================================
// FILE: src/modules/ai/model-recommendation/select.ts
// ============================================================
// PURPOSE: Pure logic for picking the best AI model based on real-world performance benchmarks — no external dependencies, just data in, recommendation out.
// HOW IT WORKS: Two exported functions:
//   - selectFastestModel(candidates, minimumSuccessRate): Takes an array of ModelBenchmarkMetrics (each has avgDurationMs, successRate, sampleCount, p95DurationMs, lastUpdatedAt). Filters out models with successRate below the threshold or zero samples. Sorts remaining by: 1) lowest average duration (fastest), 2) highest success rate (most reliable), 3) lowest p95 (most consistent), 4) most recently updated. Returns the top model or null if none qualify.
//   - inferConfidence(metrics): Determines confidence level (high/medium/low) based on sample count and success rate thresholds. High = enough samples + high success; Medium = some samples + decent success; Low = insufficient data.
//   Pure functions — no side effects, easy to test.
// INTEGRATION: Used by benchmark worker (src/lib/model-benchmark-worker.ts) and model recommendation API to update the cached recommendation (src/modules/ai/model-recommendation/state.ts). Types from ./types.ts.
// ============================================================
