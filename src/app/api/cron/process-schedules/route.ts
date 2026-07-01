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
// PURPOSE: Secret-protected cron endpoint for processing due schedules.
// HOW IT WORKS: Supports Vercel Cron GET requests with Authorization: Bearer
//   CRON_SECRET and manual POST requests with either that header or x-cron-secret.
//   Each tick logs start/finish metadata and delegates resumable item processing.
// [SECURITY] Does not use user auth; protected only by the shared cron secret.
// INTEGRATION: Config, schedule service/validation, API response helpers.
// ============================================================
