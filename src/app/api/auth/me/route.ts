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
// PURPOSE: Returns the current user's enriched profile (role, onboarding status, profile completion, avatar) for client-side hooks.
// HOW IT WORKS: GET /api/auth/me:
//   1. Calls getCurrentUser() (src/lib/auth/current-user.ts) which: checks NextAuth session, hydrates user from MongoDB (User + Profile), returns CurrentUser object with userId, name, email, role, onboardingCompleted, profileCompleted, avatar.
//   2. Returns success(200) with {user: CurrentUser} or null if not authenticated.
//   Called by useCurrentUser hook (src/hooks/use-current-user.ts) on initial auth and manual refetch.
// INTEGRATION: Auth current-user module (src/lib/auth/current-user.ts), api-response helpers (success/failure), NextAuth session.
// ============================================================
