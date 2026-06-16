import { NextRequest } from "next/server";
import { success, failure } from "@/utils/api-response";
import { requireAuth } from "@/lib/auth/session";
import { generateLoginCode, revokeLoginCode } from "@/modules/telegram/link-service";
import { getConfig } from "@/config";

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();
    const ip = request.headers.get("x-forwarded-for") ?? "unknown";
    const result = await generateLoginCode(user.userId, ip);
    const cfg = getConfig();
    return success({
      code: result.code,
      expiresAt: result.expiresAt.toISOString(),
      deepLink: result.deepLink,
      botUsername: cfg.telegram.botUsername,
      botEnabled: cfg.telegram.enabled,
    });
  } catch (error) {
    return failure(error);
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const user = await requireAuth();
    const ip = request.headers.get("x-forwarded-for") ?? "unknown";
    await revokeLoginCode(user.userId, ip);
    return success({ revoked: true });
  } catch (error) {
    return failure(error);
  }
}

// ============================================================
// FILE: src/app/api/telegram/login-code/route.ts
// ============================================================
// PURPOSE: API endpoints for generating and revoking Telegram login codes.
// HOW IT WORKS: POST generates a random 8-char code, bcrypt-hashes it, stores
//   it on the User with a 10-minute expiry, and returns the plaintext code +
//   deep link URL. DELETE revokes an active code by clearing the hash/expiry.
//   Both rate-limit to 5 generations per hour. The code is shown once in the UI.
// [SECURITY] Codes are bcrypt-hashed; plaintext returned only once
// INTEGRATION: Telegram link service, auth session, config
// ============================================================
