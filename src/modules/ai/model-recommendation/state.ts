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
// PURPOSE: In-memory cache for the currently recommended fastest write model.
// HOW IT WORKS: Stores a module-level singleton updated by the background benchmark worker.
//   getRecommendedModelState() exposes the latest recommendation to server routes and UI logic.
// INTEGRATION: Used by model recommendation benchmark worker and GenerateForm/UI fallback logic.
// ============================================================
