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
    const sort = searchParams.get("sort") === "desc" ? "desc" : "asc";

    const result = await getMessages(id, user.userId, page, pageSize, sort);
    return success(result);
  } catch (error) {
    return failure(error);
  }
}

// ============================================================
// FILE: src/app/api/sessions/[id]/messages/route.ts
// ============================================================
// PURPOSE: API endpoint for fetching paginated messages within a session.
// HOW IT WORKS: Validates page/pageSize from query params (page >= 1, pageSize 1-100,
//   default 50), then calls getMessages() with ownership enforcement. Returns
//   paginated message items and total count.
// INTEGRATION: Message service, auth session
// ============================================================
