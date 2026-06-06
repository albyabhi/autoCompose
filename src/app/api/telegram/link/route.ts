import { NextRequest } from "next/server";
import { success, failure } from "@/utils/api-response";
import { requireAuth } from "@/lib/auth/session";
import { unlinkTelegram } from "@/modules/telegram/link-service";

export async function DELETE(request: NextRequest) {
  try {
    const user = await requireAuth();
    const ip = request.headers.get("x-forwarded-for") ?? "unknown";
    await unlinkTelegram(user.userId, ip);
    return success({ unlinked: true });
  } catch (error) {
    return failure(error);
  }
}
