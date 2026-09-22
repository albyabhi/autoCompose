import { NextRequest } from "next/server";
import { success, failure } from "@/utils/api-response";
import { validate } from "@/utils/validation";
import { requireAuth } from "@/lib/auth/session";
import {
  deleteSchedule,
  getSchedule,
  updateSchedule,
} from "@/modules/schedule/service";
import { updateScheduleSchema } from "@/modules/schedule/validation";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();
    const { id } = await params;
    return success(await getSchedule(id, user.userId));
  } catch (error) {
    return failure(error);
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();
    const { id } = await params;
    const input = validate(updateScheduleSchema, await request.json());
    return success(await updateSchedule(id, user.userId, input));
  } catch (error) {
    return failure(error);
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();
    const { id } = await params;
    await deleteSchedule(id, user.userId);
    return success({ deleted: true });
  } catch (error) {
    return failure(error);
  }
}

// ============================================================
// FILE: src/app/api/schedules/[id]/route.ts
// ============================================================
// PURPOSE: API endpoints for reading, editing, and hard-deleting one schedule.
// HOW IT WORKS: Uses async route params, authenticates the user, validates
//   PATCH input, and delegates ownership-enforced operations to the service.
//   DELETE permanently removes the schedule row and all its email items.
// INTEGRATION: Auth session, schedule service/validation, API response helpers.
// ============================================================
