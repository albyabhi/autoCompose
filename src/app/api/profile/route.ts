import { NextRequest } from "next/server";
import { success, failure } from "@/utils/api-response";
import { validate } from "@/utils/validation";
import { profileUpdateSchema } from "@/modules/profile/validation";
import { getProfile, updateProfile } from "@/modules/profile/service";
import { requireAuth } from "@/lib/auth/session";
import { buildAllCategoryReadiness, sanitizeProfile } from "@/modules/profile/context-builder";

export async function GET() {
  try {
    const user = await requireAuth();

    const profile = await getProfile(user.userId);
    if (!profile) {
      return success({ profile: null, readiness: buildAllCategoryReadiness(null) });
    }

    return success({
      profile: sanitizeProfile(profile),
      readiness: buildAllCategoryReadiness(profile),
    });
  } catch (error) {
    return failure(error);
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const user = await requireAuth();

    const body = await request.json();
    const input = validate(profileUpdateSchema, body);

    const profile = await updateProfile(user.userId, input);
    return success({
      profile: sanitizeProfile(profile),
      readiness: buildAllCategoryReadiness(profile),
    });
  } catch (error) {
    return failure(error);
  }
}

// ============================================================
// FILE: src/app/api/profile/route.ts
// ============================================================
// PURPOSE: API endpoint for the user's profile — GET to view, PATCH to update. Returns sanitized data plus readiness status for each email category.
// HOW IT WORKS:
//   - GET /api/profile: requireAuth() for user. getProfile() fetches profile. If none exists, returns {profile: null, readiness: all categories missing}. If exists, sanitizeProfile() strips sensitive fields (rawText, encrypted passwords) and buildAllCategoryReadiness() shows which profile sections are complete vs missing for each of the 7 email categories.
//   - PATCH /api/profile: requireAuth() for user. Validates request body against profileUpdateSchema (all sections optional). updateProfile() merges updates — handles emailCredentials specially (encrypts v2, audits save/remove). Returns sanitized profile + readiness.
//   Both endpoints use sanitizeProfile() so the frontend never receives raw resume text or encrypted credentials.
// INTEGRATION: Profile service (getProfile, updateProfile), context builder (sanitizeProfile, buildAllCategoryReadiness), auth (requireAuth), API response helpers. Called by profile settings page and onboarding flow.
// ============================================================
