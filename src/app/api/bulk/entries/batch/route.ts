import { NextRequest } from "next/server";
import { success, failure } from "@/utils/api-response";
import { validate } from "@/utils/validation";
import { batchUpdateSchema } from "@/modules/bulk/validation";
import { batchUpdateCategory } from "@/modules/bulk/service";
import { requireAuth } from "@/lib/auth/session";

export async function PATCH(request: NextRequest) {
  try {
    const user = await requireAuth();
    const body = await request.json();
    const input = validate(batchUpdateSchema, body);

    const count = await batchUpdateCategory(user.userId, input.sessionId, input.category);
    return success({ updated: count });
  } catch (error) {
    return failure(error);
  }
}
