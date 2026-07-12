# Implementation Plan

[Overview]
Implement a server-side background “model benchmark” loop that continuously measures NVIDIA NIM write-model performance, selects the fastest reliable model, and exposes it as a “Recommended (Fastest)” option in the existing model selector without persisting to the database.

This codebase currently hardcodes model routing through `MODEL_IDS`/`MODEL_LABELS` (8 options) and uses `NvidiaNIMProvider` to call NVIDIA NIM via an OpenAI-compatible SDK. Model selection is chosen in the UI (`GenerateForm` + `ModelSelector`) and passed through `POST /api/generate` → `generateEmail()` → `provider.complete()`. The main reliability issue described is variability in latency across models.

To solve this, the app will:
1) Run a Node-only background worker (similar to `startScheduleWorker`) that periodically benchmarks candidate models.
2) Cache the “currently recommended” fastest model in-memory (process-local) with a timestamp, error rate, and last measured latency.
3) Update UI behavior so that when the user hasn’t manually overridden the model, the system uses the cached recommended model (presented as a distinct dropdown choice).
4) Keep the cache in application state only (no new DB collections / schema changes). Optionally, a lightweight JSON file cache can be considered later if needed, but the primary goal is “cache or state”.

[Types]
Add a small set of new TypeScript types for benchmark results and cached recommendation.

- `FastWriteModelId`: string union of known configured model keys (same as existing `ModelId`), plus an optional “discovered” model key if model discovery is implemented.
- `ModelBenchmarkMetrics`:
  - `modelId: ModelId`
  - `modelUsed: string` (upstream NVIDIA model identifier)
  - `sampleCount: number`
  - `avgDurationMs: number`
  - `p95DurationMs: number` (optional; computed if enough samples)
  - `successRate: number` (0..1)
  - `lastUpdatedAt: number` (epoch ms)
  - `lastError?: string`
- `RecommendedModelState`:
  - `recommendedModelId: ModelId`
  - `recommendedModelUsed: string`
  - `reason: string` (e.g., “lowest avg latency over last N samples”)
  - `metrics: ModelBenchmarkMetrics`
  - `benchmarkedAt: number`
  - `confidence: "low" | "medium" | "high"` based on sampleCount and successRate
- `BenchmarkConfig`:
  - `intervalMs: number`
  - `modelsPerCycle: number`
  - `samplesPerModel: number`
  - `timeoutMs: number`
  - `minimumSuccessRate: number`
  - `includeConfiguredModelsOnly: boolean`

Validation rules:
- If a model’s successRate is below `minimumSuccessRate`, exclude it from recommendation.
- If no model meets minimumSuccessRate, fall back to the existing UI default model key `deepseek`.

[Files]
Modify and create backend modules for benchmarking/caching, plus small changes to UI components to surface the recommendation.

New files:
- `src/modules/ai/model-recommendation/state.ts`
  - Holds the in-memory singleton `RecommendedModelState` + getters/setters.
- `src/modules/ai/model-recommendation/benchmark.ts`
  - Implements benchmarking logic: runs timed completion calls across candidate models.
- `src/modules/ai/model-recommendation/nvidia-discovery.ts`
  - Best-effort model discovery from NVIDIA provider (optional/guarded).
- `src/lib/timeout.ts`
  - Utility to enforce a timeout around `provider.complete()` calls (if not already present).
- `src/lib/model-benchmark-worker.ts`
  - Node background loop (timer + overlap protection) that periodically refreshes recommendation.
- `src/app/api/ai/recommendation/route.ts`
  - (Optional but recommended) `GET` endpoint to let the client fetch the current recommended model state.

Existing files to be modified:
- `src/instrumentation.ts`
  - Start the new model benchmark worker (node-only).
- `src/components/model-selector.tsx`
  - Add a “Recommended (Fastest)” option.
- `src/components/generate-form.tsx`
  - Use recommendation when user has not touched model selector (current logic uses profile preferredModel).
  - When “Recommended” is selected, set `modelId` behavior to use the cached recommended model at submit time.
- `src/modules/ai/types.ts`
  - Add a constant key/value for “recommended” selection if we encode it in UI as a separate value (could be handled purely in UI without changing MODEL_IDS).
- `src/modules/ai/factory.ts` or `src/modules/ai/providers/nvidia.ts` (only if needed)
  - Benchmark may call provider methods directly; no mandatory changes expected.

Configuration file updates:
- `src/config/index.ts`
  - Add env vars (optional) to control benchmark behavior (defaults safe):
    - `AI_MODEL_BENCHMARK_ENABLED` (default true)
    - `AI_MODEL_BENCHMARK_INTERVAL_MS` (default 10 minutes)
    - `AI_MODEL_BENCHMARK_SAMPLES_PER_MODEL` (default 2)
    - `AI_MODEL_BENCHMARK_TIMEOUT_MS` (default 20_000)
    - `AI_MODEL_BENCHMARK_MODELS_PER_CYCLE` (default 8)
    - `AI_MODEL_BENCHMARK_INCLUDE_DISCOVERED_MODELS` (default false)
  - If avoiding config changes is preferred, read directly from `process.env` inside the benchmark module.

[Functions]
Add/modify these functions.

New functions:
- `getRecommendedModelState(): RecommendedModelState | null`
  - `src/modules/ai/model-recommendation/state.ts`
- `setRecommendedModelState(next: RecommendedModelState): void`
- `refreshBenchmarkOnce(config: BenchmarkConfig): Promise<void>`
  - `src/modules/ai/model-recommendation/benchmark.ts`
- `benchmarkModel(modelId: ModelId, samples: number, timeoutMs: number): Promise<ModelBenchmarkMetrics>`
- `selectFastestModel(candidates: ModelBenchmarkMetrics[]): ModelBenchmarkMetrics`
- `discoverNvidiaAvailableModels(): Promise<string[]>` (optional)
  - returns upstream identifiers or maps to known ModelId keys
- `startModelBenchmarkWorker(): void`
  - `src/lib/model-benchmark-worker.ts`
  - Node-only; overlap protection similar to schedule-worker
- `wrapWithTimeout<T>(promise: Promise<T>, timeoutMs: number, label: string): Promise<T>`
  - `src/lib/timeout.ts`

Modified functions:
- `startScheduleWorker` unchanged; `src/instrumentation.ts` will call `startModelBenchmarkWorker()` in addition to schedule worker.
- `GenerateForm.handleSubmit`
  - If UI selection indicates “Recommended”, replace `effectiveModelId` at submit time using cached recommended model id.
  - Keep existing user-touch override behavior.
- `ModelSelector`
  - Add “Recommended (Fastest)” option.
  - Ensure `onChange` still receives a `ModelId`-compatible value or handle “recommended” selection via UI-only state.

Removed functions:
- None.

[Classes]
No classes required; use functions and module-level state singletons.

[Dependencies]
No new npm dependencies required.
- Use existing OpenAI-compatible SDK already imported in `NvidiaNIMProvider`.
- Use existing logging (`@/lib/logger`).
- Use existing `getAIProvider()` factory where possible.

[Testing]
Add unit tests for selection logic and timeout handling.
- `src/modules/ai/model-recommendation/__tests__/selection.test.ts`
  - Test `selectFastestModel()` excludes low success-rate candidates.
  - Test tie-breaking rules (lower avgDuration, then higher successRate).
- `src/modules/ai/model-recommendation/__tests__/timeout.test.ts`
  - Test `wrapWithTimeout()` rejects on timeout.
- Integration tests (optional, mocked provider):
  - Mock `NvidiaNIMProvider.complete()` to simulate latency differences and ensure `refreshBenchmarkOnce()` updates state to the fastest.

Run:
- `npm run test` (vitest)
- `npx tsc --noEmit` for type safety

[Implementation Order]
1. Create state + selection/benchmark modules (no worker yet), with deterministic unit tests for recommendation logic.
2. Add the Node background worker + start it from `src/instrumentation.ts` with safe defaults and overlap protection.
3. Update UI model selector:
   - Add “Recommended (Fastest)” option.
   - Update `GenerateForm` to use cached recommendation when the user hasn’t explicitly chosen a model.
4. Add (optional) API route for client fetching recommendation if needed; otherwise UI reads cached value via a lightweight global or uses existing profile fetching plus server action.
5. Run lint/tests/typecheck and verify the recommended model overrides default only when user has not touched selection.

task_progress Items:
- [ ] Step 1: Inspect existing AI/model selection flow and current provider call path (done)
- [ ] Step 2: Implement benchmark state + selection/metrics logic (planned)
- [ ] Step 3: Implement background worker loop with timeout/overlap protection (planned)
- [ ] Step 4: Wire UI to show “Recommended (Fastest)” and use it when not manually overridden (planned)
</content>
