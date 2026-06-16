import { getCurrentUser } from "@/lib/auth/current-user";
import { success, failure } from "@/utils/api-response";

export async function GET() {
  try {
    const user = await getCurrentUser();
    return success({ user });
  } catch (error) {
    return failure(error);
  }
}

// ============================================================
// FILE: src/app/api/auth/me/route.ts
// ============================================================
// PURPOSE: API endpoint for fetching the current authenticated user (GET /api/auth/me).
// HOW IT WORKS: Calls getCurrentUser() which checks the session, hydrates the user
//   from MongoDB, and returns a CurrentUser object or null. Returns the user data
//   wrapped in the standard success response format.
// INTEGRATION: Auth current-user module, api-response helpers
// ============================================================
