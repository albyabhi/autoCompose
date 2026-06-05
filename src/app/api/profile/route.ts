import { NextRequest } from "next/server";
import { success, failure } from "@/utils/api-response";
import { validate } from "@/utils/validation";
import { profileUpdateSchema } from "@/modules/profile/validation";
import { getProfile, updateProfile } from "@/modules/profile/service";
import { requireAuth } from "@/lib/auth/session";

export async function GET() {
  try {
    const user = await requireAuth();

    const profile = await getProfile(user.userId);
    if (!profile) {
      return success({ profile: null });
    }

    return success({ profile });
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
    return success({ profile });
  } catch (error) {
    return failure(error);
  }
}
