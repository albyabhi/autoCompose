import { NextRequest } from "next/server";
import { success, failure } from "@/utils/api-response";
import { validate } from "@/utils/validation";
import { updateEntrySchema } from "@/modules/bulk/validation";
import { updateEntry, deleteEntry } from "@/modules/bulk/service";
import { requireAuth } from "@/lib/auth/session";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();
    const { id } = await params;
    const body = await request.json();
    const input = validate(updateEntrySchema, body);

    const result = await updateEntry(id, user.userId, input);
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
    await deleteEntry(id, user.userId);
    return success({ deleted: true });
  } catch (error) {
    return failure(error);
  }
}
