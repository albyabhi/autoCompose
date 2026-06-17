import { NextRequest } from "next/server";
import { success, created, failure } from "@/utils/api-response";
import { validate } from "@/utils/validation";
import { createEntriesSchema, listEntriesSchema } from "@/modules/bulk/validation";
import { createEntries, listEntries } from "@/modules/bulk/service";
import { requireAuth } from "@/lib/auth/session";

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();
    const body = await request.json();
    const input = validate(createEntriesSchema, body);

    const result = await createEntries(user.userId, input.sessionId, input.entries);
    return created(result);
  } catch (error) {
    return failure(error);
  }
}

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth();
    const { searchParams } = new URL(request.url);
    const input = validate(listEntriesSchema, {
      sessionId: searchParams.get("sessionId"),
    });

    const result = await listEntries(input.sessionId, user.userId);
    return success(result);
  } catch (error) {
    return failure(error);
  }
}
