import { NextRequest } from "next/server";
import { success, failure } from "@/utils/api-response";
import { clearAllSchedules } from "@/modules/schedule/service";
import { recordAudit } from "@/lib/audit";
import { requireAuth } from "@/lib/auth/session";

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();

    const result = await clearAllSchedules(user.userId);

    recordAudit({
      action: "schedule.bulk_deleted",
      entityType: "Schedule",
      userId: user.userId,
      metadata: {
        clearedSchedules: result.clearedSchedules,
        clearedEmails: result.clearedEmails,
      },
      ip: request.headers.get("x-forwarded-for") ?? undefined,
      userAgent: request.headers.get("user-agent") ?? undefined,
    });

    return success(result);
  } catch (error) {
    return failure(error);
  }
}

// ============================================================
// FILE: src/app/api/schedules/clear/route.ts
// ============================================================
// PURPOSE: Hard-delete every schedule and email item owned by the user.
// HOW IT WORKS: Authenticates the user, delegates to clearAllSchedules
//   (emails first, then schedules, both ownership-scoped), records a
//   schedule.bulk_deleted audit with counts, and returns the envelope.
// INTEGRATION: Auth session, schedule service, audit trail.
// ============================================================
