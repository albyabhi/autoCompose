import { NextRequest } from "next/server";
import { success, failure } from "@/utils/api-response";
import { getMessages } from "@/modules/message/service";
import { requireAuth } from "@/lib/auth/session";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
    const pageSize = Math.min(100, Math.max(1, parseInt(searchParams.get("pageSize") ?? "50", 10)));

    const result = await getMessages(id, user.userId, page, pageSize);
    return success(result);
  } catch (error) {
    return failure(error);
  }
}
