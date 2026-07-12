import { logger } from "@/lib/logger";
import { refreshModelRecommendationOnce } from "@/modules/ai/model-recommendation/benchmark";

type ModelBenchmarkWorkerState = {
  started: boolean;
  running: boolean;
  interval?: ReturnType<typeof setInterval>;
  initial?: ReturnType<typeof setTimeout>;
};

declare global {
  var __autocomposeModelBenchmarkWorker: ModelBenchmarkWorkerState | undefined;
}

const DEFAULT_INTERVAL_MS = 10 * 60_000; // 10 minutes
const DEFAULT_INITIAL_DELAY_MS = 5_000;

function getWorkerState(): ModelBenchmarkWorkerState {
  globalThis.__autocomposeModelBenchmarkWorker ??= {
    started: false,
    running: false,
  };
  return globalThis.__autocomposeModelBenchmarkWorker;
}

async function tick(state: ModelBenchmarkWorkerState): Promise<void> {
  if (state.running) {
    logger.debug("Model benchmark worker tick skipped (previous tick still running)");
    return;
  }

  state.running = true;
  try {
    await refreshModelRecommendationOnce();
    logger.info("Model benchmark worker tick completed");
  } catch (error) {
    logger.error("Model benchmark worker tick failed", {
      message: error instanceof Error ? error.message : "Unknown error",
    });
  } finally {
    state.running = false;
  }
}

export function startModelBenchmarkWorker(): void {
  const state = getWorkerState();
  if (state.started) return;

  if (process.env.AI_MODEL_BENCHMARK_ENABLED === "false") {
    logger.info("Model benchmark worker disabled by AI_MODEL_BENCHMARK_ENABLED=false");
    return;
  }

  const intervalMs = Math.max(
    60_000,
    Number.parseInt(process.env.AI_MODEL_BENCHMARK_INTERVAL_MS ?? String(DEFAULT_INTERVAL_MS), 10)
  );
  const initialDelayMs = Number.parseInt(
    process.env.AI_MODEL_BENCHMARK_INITIAL_DELAY_MS ?? String(DEFAULT_INITIAL_DELAY_MS),
    10
  );

  state.started = true;
  state.initial = setTimeout(() => {
    void tick(state);
  }, initialDelayMs);

  state.interval = setInterval(() => {
    void tick(state);
  }, intervalMs);

  if (typeof (state.initial as unknown as { unref?: () => void }).unref === "function") {
    state.initial.unref?.();
  }
  if (typeof (state.interval as unknown as { unref?: () => void }).unref === "function") {
    state.interval.unref?.();
  }

  logger.info("Model benchmark worker started", {
    intervalMs,
    initialDelayMs,
  });
}

// ============================================================
// FILE: src/lib/model-benchmark-worker.ts
// ============================================================
// PURPOSE: Node-only background worker for benchmarking AI models and updating
//   the in-memory “recommended fastest model” state.
// HOW IT WORKS: Starts one timer per Node process, waits briefly after startup,
//   then periodically calls `refreshModelRecommendationOnce()`. An in-memory
//   `running` flag prevents overlapping benchmark cycles.
// INTEGRATION: Started from `src/instrumentation.ts` during server startup.
// ============================================================
