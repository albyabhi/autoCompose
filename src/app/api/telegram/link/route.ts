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

// ============================================================
// FILE: src/app/api/telegram/link/route.ts
// ============================================================
// PURPOSE: API endpoint for unlinking a Telegram account (DELETE /api/telegram/link).
// HOW IT WORKS: Authenticates the user, then calls unlinkTelegram() which removes
//   telegram data from the User document, cleans up TelegramState/TelegramUpdate
//   collections, and records an audit entry. Returns { unlinked: true } on success.
// INTEGRATION: Telegram link service, auth session, audit logger
// ============================================================
