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

// ============================================================
// FILE: src/app/api/sessions/[id]/archive/route.ts
// ============================================================
// PURPOSE: API endpoint for archiving/unarchiving a session (PATCH /api/sessions/:id/archive).
// HOW IT WORKS: Reads the "archived" boolean from the request body, calls
//   toggleArchive() to update the session's isArchived flag, and records
//   an audit entry (session.archived or session.unarchived). Enforces ownership.
// INTEGRATION: Session service, audit logger, auth
// ============================================================
