export async function wrapWithTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  label: string
): Promise<T> {
  if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) {
    return promise;
  }

  let timeoutId: ReturnType<typeof setTimeout> | undefined;

  const timeoutPromise = new Promise<T>((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(new Error(`${label} timed out after ${timeoutMs}ms`));
    }, timeoutMs);
  });

  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }
}

// ============================================================
// FILE: src/lib/timeout.ts
// ============================================================
// PURPOSE: Provides a Promise timeout utility.
// HOW IT WORKS: Wraps a given promise with a timer; whichever settles first
//   (promise completion vs timeout) resolves/rejects the wrapper.
// INTEGRATION: Used by model benchmarking to prevent slow/hung model calls
//   from stalling the background worker.
// ============================================================
