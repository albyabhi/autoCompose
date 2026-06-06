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
