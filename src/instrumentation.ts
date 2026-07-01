export async function register() {
  if (process.env.NEXT_RUNTIME !== "edge") {
    const { startScheduleWorker } = await import("./lib/schedule-worker");
    startScheduleWorker();
  }
}

// ============================================================
// FILE: src/instrumentation.ts
// ============================================================
// PURPOSE: Runs Node-only startup side effects for the Next.js server.
// HOW IT WORKS: Next.js calls register once when a server instance starts. Any
//   non-edge runtime lazily imports and starts the local schedule worker, while
//   Vercel production deployments use Vercel Cron instead of timers.
// INTEGRATION: Next.js instrumentation convention and schedule-worker module.
// ============================================================
