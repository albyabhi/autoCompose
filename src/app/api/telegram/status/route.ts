import { success, failure } from "@/utils/api-response";
import { requireAuth } from "@/lib/auth/session";
import { getTelegramStatus } from "@/modules/telegram/link-service";
import { getConfig } from "@/config";

export async function GET() {
  try {
    const user = await requireAuth();
    const status = await getTelegramStatus(user.userId);
    const cfg = getConfig();
    return success({
      ...status,
      botEnabled: cfg.telegram.enabled,
      botUsername: cfg.telegram.botUsername,
    });
  } catch (error) {
    return failure(error);
  }
}

// ============================================================
// FILE: src/app/api/telegram/status/route.ts
// ============================================================
// PURPOSE: API endpoint for checking Telegram link status (GET /api/telegram/status).
// HOW IT WORKS: Returns whether Telegram is linked, the linked username, link date,
//   and bot configuration (enabled, username). Used by the settings page to display
//   current Telegram integration status.
// INTEGRATION: Telegram link service, config, auth session
// ============================================================
