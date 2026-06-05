import { NextRequest } from "next/server";
import { success, failure } from "@/utils/api-response";
import { validate } from "@/utils/validation";
import { updateSessionSchema } from "@/modules/session/validation";
import { getSession, updateSession, deleteSession } from "@/modules/session/service";
import { recordAudit } from "@/lib/audit";
import { requireAuth } from "@/lib/auth/session";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();
    const { id } = await params;
    const result = await getSession(id, user.userId);
    return success(result);
  } catch (error) {
    return failure(error);
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();
    const { id } = await params;
    const body = await request.json();
    const input = validate(updateSessionSchema, body);

    const result = await updateSession(id, user.userId, input);

    recordAudit({
      action: "session.updated",
      entityType: "Session",
      entityId: result.id,
      userId: user.userId,
      metadata: { title: result.title },
    });

    return success(result);
  } catch (error) {
    return failure(error);
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();
    const { id } = await params;
    await deleteSession(id, user.userId);

    recordAudit({
      action: "session.deleted",
      entityType: "Session",
      entityId: id,
      userId: user.userId,
    });

    return success({ deleted: true });
  } catch (error) {
    return failure(error);
  }
}
