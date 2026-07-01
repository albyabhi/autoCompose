import { logger } from "@/lib/logger";
import { processDueSchedules } from "@/modules/schedule/service";

type ScheduleWorkerState = {
  started: boolean;
  running: boolean;
  interval?: ReturnType<typeof setInterval>;
  initial?: ReturnType<typeof setTimeout>;
};

declare global {
  var __autocomposeScheduleWorker: ScheduleWorkerState | undefined;
}

const DEFAULT_INTERVAL_MS = 60_000;
const DEFAULT_INITIAL_DELAY_MS = 1_000;
const DEFAULT_MAX_SCHEDULES = 5;
const DEFAULT_MAX_EMAILS_PER_SCHEDULE = 10;

function getWorkerState(): ScheduleWorkerState {
  globalThis.__autocomposeScheduleWorker ??= {
    started: false,
    running: false,
  };
  return globalThis.__autocomposeScheduleWorker;
}

function readPositiveInt(value: string | undefined, fallback: number): number {
  if (!value) return fallback;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function unrefTimer(timer: ReturnType<typeof setInterval> | ReturnType<typeof setTimeout>): void {
  if (typeof timer === "object" && timer !== null && "unref" in timer) {
    (timer as { unref: () => void }).unref();
  }
}

async function tick(state: ScheduleWorkerState): Promise<void> {
  if (state.running) {
    logger.debug("Schedule worker tick skipped because a previous tick is still running");
    return;
  }

  state.running = true;
  try {
    const result = await processDueSchedules({
      maxSchedules: readPositiveInt(process.env.SCHEDULE_WORKER_MAX_SCHEDULES, DEFAULT_MAX_SCHEDULES),
      maxEmailsPerSchedule: readPositiveInt(
        process.env.SCHEDULE_WORKER_MAX_EMAILS_PER_SCHEDULE,
        DEFAULT_MAX_EMAILS_PER_SCHEDULE
      ),
    });

    const logMeta = {
      schedulesChecked: result.schedulesChecked,
      itemsProcessed: result.itemsProcessed,
      sent: result.sent,
      failed: result.failed,
      generated: result.generated,
    };

    if (result.itemsProcessed > 0 || result.failed > 0) {
      logger.info("Schedule worker processed due schedules", logMeta);
    } else {
      logger.debug("Schedule worker tick completed", logMeta);
    }
  } catch (error) {
    logger.error("Schedule worker tick failed", {
      message: error instanceof Error ? error.message : "Unknown error",
    });
  } finally {
    state.running = false;
  }
}

export function startScheduleWorker(): void {
  if (process.env.SCHEDULE_BACKGROUND_WORKER === "false") {
    logger.info("Schedule background worker disabled by SCHEDULE_BACKGROUND_WORKER=false");
    return;
  }

  if (process.env.VERCEL === "1") {
    logger.info("Schedule background worker skipped on Vercel; use Vercel Cron instead");
    return;
  }

  const state = getWorkerState();
  if (state.started) return;

  const intervalMs = Math.max(
    5_000,
    readPositiveInt(process.env.SCHEDULE_WORKER_INTERVAL_MS, DEFAULT_INTERVAL_MS)
  );
  const initialDelayMs = readPositiveInt(
    process.env.SCHEDULE_WORKER_INITIAL_DELAY_MS,
    DEFAULT_INITIAL_DELAY_MS
  );

  state.started = true;
  state.initial = setTimeout(() => {
    void tick(state);
  }, initialDelayMs);
  state.interval = setInterval(() => {
    void tick(state);
  }, intervalMs);

  unrefTimer(state.initial);
  unrefTimer(state.interval);

  logger.info("Schedule background worker started", {
    intervalMs,
    initialDelayMs,
  });
}

// ============================================================
// FILE: src/lib/schedule-worker.ts
// ============================================================
// PURPOSE: Starts the in-process background worker that sends due schedules.
// HOW IT WORKS: Keeps one timer per Node server instance, waits briefly after
//   startup, then calls the existing due-schedule processor on a fixed interval.
//   An in-memory running flag prevents overlapping ticks inside the same process,
//   and Vercel deployments rely on the cron route instead of process timers.
// INTEGRATION: Loaded from Next.js instrumentation and delegates to the schedule
//   service, which performs DB-backed atomic item claiming before sending.
// ============================================================
