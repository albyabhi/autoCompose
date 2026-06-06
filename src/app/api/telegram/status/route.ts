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
