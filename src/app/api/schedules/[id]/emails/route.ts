import { NextRequest } from "next/server";
import { created, failure } from "@/utils/api-response";
import { validate } from "@/utils/validation";
import { requireAuth } from "@/lib/auth/session";
import { addScheduledEmails } from "@/modules/schedule/service";
import { addScheduledEmailsSchema } from "@/modules/schedule/validation";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();
    const { id } = await params;
    const input = validate(addScheduledEmailsSchema, await request.json());
    return created(await addScheduledEmails(id, user.userId, input.emails));
  } catch (error) {
    return failure(error);
  }
}

// ============================================================
// FILE: src/app/api/schedules/[id]/emails/route.ts
// ============================================================
// PURPOSE: API endpoint for adding emails to an existing schedule.
// HOW IT WORKS: Authenticates the user, validates a non-empty list of single
//   snapshots or batch entry sources, and asks the service to create snapshots.
// INTEGRATION: Auth session, schedule service/validation, API response helpers.
// ============================================================
