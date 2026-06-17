import { NextRequest } from "next/server";
import { success, failure } from "@/utils/api-response";
import { validate } from "@/utils/validation";
import { sendEntrySchema } from "@/modules/bulk/validation";
import { sendEntry } from "@/modules/bulk/service";
import { requireAuth } from "@/lib/auth/session";

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();
    const body = await request.json();
    const input = validate(sendEntrySchema, body);

    const result = await sendEntry(input.entryId, user.userId, user.name);
    return success(result);
  } catch (error) {
    return failure(error);
  }
}
