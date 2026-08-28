import { NextRequest } from "next/server";
import { success, failure } from "@/utils/api-response";
import { validate } from "@/utils/validation";
import { getConfig } from "@/config";
import { UnauthorizedError } from "@/lib/errors";
import { logger } from "@/lib/logger";
import { processDueSchedules } from "@/modules/schedule/service";
import { processSchedulesSchema } from "@/modules/schedule/validation";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function assertCronAuthorized(request: NextRequest) {
  const cronSecret = getConfig().app.cronSecret;
  const authorization = request.headers.get("authorization");
  const legacySecret = request.headers.get("x-cron-secret");

  if (
    !cronSecret ||
    (authorization !== `Bearer ${cronSecret}` && legacySecret !== cronSecret)
  ) {
    throw new UnauthorizedError("Invalid cron secret.");
  }
}

async function processCronTick(input: unknown, source: "vercel-cron" | "manual-post") {
  const validated = validate(processSchedulesSchema, input);
  logger.info("Schedule cron tick started", {
    source,
    maxSchedules: validated.maxSchedules,
    maxEmailsPerSchedule: validated.maxEmailsPerSchedule,
  });

  const result = await processDueSchedules(validated);
  logger.info("Schedule cron tick finished", {
    source,
    schedulesChecked: result.schedulesChecked,
    itemsProcessed: result.itemsProcessed,
    sent: result.sent,
    failed: result.failed,
    generated: result.generated,
  });

  return result;
}

export async function GET(request: NextRequest) {
  try {
    assertCronAuthorized(request);
    return success(await processCronTick({
      maxSchedules: 5,
      maxEmailsPerSchedule: 1,
    }, "vercel-cron"));
  } catch (error) {
    return failure(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    assertCronAuthorized(request);
    const body = await request.json().catch(() => ({}));
    return success(await processCronTick(body, "manual-post"));
  } catch (error) {
    return failure(error);
  }
}

// ============================================================
// FILE: src/app/api/cron/process-schedules/route.ts
// ============================================================
// PURPOSE: The automated cron endpoint that runs on a schedule (e.g., every minute) to find due email campaigns and send their emails.
// HOW IT WORKS: Two entry points, both protected by CRON_SECRET (not user auth):
//   - GET /api/cron/process-schedules: Called by Vercel Cron (or any scheduler) with Authorization: Bearer CRON_SECRET header. Uses conservative defaults: maxSchedules=5, maxEmailsPerSchedule=1 (one email per schedule per tick).
//   - POST /api/cron/process-schedules: Manual trigger (e.g., for testing) with JSON body {maxSchedules, maxEmailsPerSchedule}. Also accepts x-cron-secret header.
//   Both verify the secret via assertCronAuthorized() which checks Authorization: Bearer <secret> or x-cron-secret header.
//   processCronTick() validates input against processSchedulesSchema, logs start, calls processDueSchedules() (schedule service), logs finish with counts (schedulesChecked, itemsProcessed, sent, failed, generated), returns result.
//   Security: No user session — only the shared CRON_SECRET protects it. Runs in Node.js runtime (not Edge) for MongoDB access.
// INTEGRATION: Config (CRON_SECRET), schedule service (processDueSchedules), schedule validation (processSchedulesSchema), logger, API response helpers.
// ============================================================
