import { NextRequest } from "next/server";
import { success, failure } from "@/utils/api-response";
import { validate } from "@/utils/validation";
import { requireAuth } from "@/lib/auth/session";
import {
  deleteScheduledEmail,
  updateScheduledEmail,
} from "@/modules/schedule/service";
import { updateScheduledEmailSchema } from "@/modules/schedule/validation";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; emailId: string }> }
) {
  try {
    const user = await requireAuth();
    const { id, emailId } = await params;
    const input = validate(updateScheduledEmailSchema, await request.json());
    return success(await updateScheduledEmail(id, emailId, user.userId, input));
  } catch (error) {
    return failure(error);
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; emailId: string }> }
) {
  try {
    const user = await requireAuth();
    const { id, emailId } = await params;
    await deleteScheduledEmail(id, emailId, user.userId);
    return success({ deleted: true });
  } catch (error) {
    return failure(error);
  }
}

// ============================================================
// FILE: src/app/api/schedules/[id]/emails/[emailId]/route.ts
// ============================================================
// PURPOSE: API endpoints for editing/retrying/removing a scheduled email item.
// HOW IT WORKS: Authenticates the user, validates PATCH input, and blocks sent
//   item mutation in the service while allowing non-sent snapshots to change.
// INTEGRATION: Auth session, schedule service/validation, API response helpers.
// ============================================================
