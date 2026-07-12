import type { ModelId } from "../types";

export type ModelBenchmarkMetrics = {
  modelId: ModelId;
  modelUsed: string;
  sampleCount: number;
  avgDurationMs: number;
  p95DurationMs?: number;
  successRate: number;
  lastUpdatedAt: number;
  lastError?: string;
};

export type BenchmarkConfig = {
  intervalMs: number;
  modelsPerCycle: number;
  samplesPerModel: number;
  timeoutMs: number;
  minimumSuccessRate: number;
  includeDiscoveredModels: boolean;
};

export type Confidence = "low" | "medium" | "high";

export type ModelCandidate = {
  modelId: ModelId;
  modelUsed: string;
};

export const DEFAULT_CONFIDENCE_THRESHOLDS = {
  high: { minSamples: 6, minSuccessRate: 0.9 },
  medium: { minSamples: 3, minSuccessRate: 0.7 },
} as const;

// ============================================================
// FILE: src/modules/ai/model-recommendation/types.ts
// ============================================================
// PURPOSE: Shared TypeScript types and defaults for model benchmarking.
// HOW IT WORKS: Declares the metric shape returned from benchmark runs,
//   the worker configuration parameters, and confidence threshold helpers.
// INTEGRATION: Consumed by benchmark/selection and background worker modules.
// ============================================================
