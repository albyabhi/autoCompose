import { NextRequest } from "next/server";
import { success, failure } from "@/utils/api-response";
import { requireAuth } from "@/lib/auth/session";
import { logger } from "@/lib/logger";
import { getSchedule, processUserScheduleNow } from "@/modules/schedule/service";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();
    const { id } = await params;
    logger.info("Schedule page trigger started", { scheduleId: id, userId: user.userId });
    const result = await processUserScheduleNow(id, user.userId);
    const schedule = await getSchedule(id, user.userId);
    logger.info("Schedule page trigger finished", {
      scheduleId: id,
      userId: user.userId,
      itemsProcessed: result.itemsProcessed,
      sent: result.sent,
      failed: result.failed,
      generated: result.generated,
      status: schedule.status,
    });
    return success({ result, schedule });
  } catch (error) {
    return failure(error);
  }
}

// ============================================================
// FILE: src/app/api/schedules/[id]/process/route.ts
// ============================================================
// PURPOSE: Authenticated page-trigger endpoint for processing one due schedule.
// HOW IT WORKS: Requires the signed-in user, re-checks ownership/status/due time
//   in the schedule service, processes at most one pending item, and returns the
//   refreshed schedule detail for UI cache updates.
// INTEGRATION: Auth session, schedule service, logger, API response helpers.
// ============================================================
