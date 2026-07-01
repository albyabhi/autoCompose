import { success, failure } from "@/utils/api-response";
import { requireAuth } from "@/lib/auth/session";
import { listActiveSchedules } from "@/modules/schedule/service";

export async function GET() {
  try {
    const user = await requireAuth();
    return success(await listActiveSchedules(user.userId));
  } catch (error) {
    return failure(error);
  }
}

// ============================================================
// FILE: src/app/api/schedules/active/route.ts
// ============================================================
// PURPOSE: API endpoint for active future schedules used by picker dialogs.
// HOW IT WORKS: Requires the current user and returns only schedules that are
//   active and still in the future, with filtering enforced server-side.
// INTEGRATION: Auth session, schedule service, API response helpers.
// ============================================================
