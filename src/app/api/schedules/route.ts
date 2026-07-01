import { NextRequest } from "next/server";
import { success, created, failure } from "@/utils/api-response";
import { validate } from "@/utils/validation";
import { requireAuth } from "@/lib/auth/session";
import { createSchedule, listSchedules } from "@/modules/schedule/service";
import { createScheduleSchema, listSchedulesSchema } from "@/modules/schedule/validation";

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth();
    const { searchParams } = new URL(request.url);
    const input = validate(listSchedulesSchema, {
      page: searchParams.get("page") ?? undefined,
      pageSize: searchParams.get("pageSize") ?? undefined,
      status: searchParams.get("status") ?? undefined,
    });
    return success(await listSchedules(user.userId, input));
  } catch (error) {
    return failure(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();
    const body = await request.json();
    const input = validate(createScheduleSchema, body);
    return created(await createSchedule(user.userId, input));
  } catch (error) {
    return failure(error);
  }
}

// ============================================================
// FILE: src/app/api/schedules/route.ts
// ============================================================
// PURPOSE: API endpoints for listing and creating schedules.
// HOW IT WORKS: Authenticates the current user, validates query/body input,
//   and delegates schedule list/create behavior to the schedule service.
// INTEGRATION: Auth session, schedule validation/service, API response helpers.
// ============================================================
