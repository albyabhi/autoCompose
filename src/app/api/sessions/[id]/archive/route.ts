import { NextRequest } from "next/server";
import { success, failure } from "@/utils/api-response";
import { toggleArchive } from "@/modules/session/service";
import { recordAudit } from "@/lib/audit";
import { requireAuth } from "@/lib/auth/session";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();
    const { id } = await params;
    const body = await request.json();
    const archived = body.archived === true;

    const result = await toggleArchive(id, user.userId, archived);

    recordAudit({
      action: archived ? "session.archived" : "session.unarchived",
      entityType: "Session",
      entityId: result.id,
      userId: user.userId,
    });

    return success(result);
  } catch (error) {
    return failure(error);
  }
}
