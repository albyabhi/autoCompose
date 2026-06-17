import { NextRequest } from "next/server";
import { success, failure } from "@/utils/api-response";
import { validate } from "@/utils/validation";
import { generateEntrySchema } from "@/modules/bulk/validation";
import { generateEntry } from "@/modules/bulk/service";
import { checkRateLimit } from "@/lib/rate-limit";
import { requireAuth } from "@/lib/auth/session";

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();
    checkRateLimit(`generate:${user.userId}`);

    const body = await request.json();
    const input = validate(generateEntrySchema, body);

    const result = await generateEntry(input.entryId, user.userId, input.modelId);
    return success(result);
  } catch (error) {
    return failure(error);
  }
}
