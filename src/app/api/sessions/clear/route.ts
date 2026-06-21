import { NextRequest } from "next/server";
import { success, failure } from "@/utils/api-response";
import { clearAllSessions } from "@/modules/session/service";
import { recordAudit } from "@/lib/audit";
import { requireAuth } from "@/lib/auth/session";

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();

    const result = await clearAllSessions(user.userId);

    recordAudit({
      action: "session.bulk_deleted",
      entityType: "Session",
      userId: user.userId,
      metadata: { clearedCount: result.clearedCount },
      ip: request.headers.get("x-forwarded-for") ?? undefined,
      userAgent: request.headers.get("user-agent") ?? undefined,
    });

    return success(result);
  } catch (error) {
    return failure(error);
  }
}
