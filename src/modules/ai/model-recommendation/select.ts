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
// PURPOSE: Pure selection logic for choosing the fastest model recommendation.
// HOW IT WORKS: Filters out candidates below minimum success rate, then selects
//   the best candidate by lowest average duration with deterministic tie-breakers
//   (higher successRate, then lowest p95DurationMs if available).
// INTEGRATION: Used by benchmark runner and background worker to update cached recommendation.
// ============================================================
