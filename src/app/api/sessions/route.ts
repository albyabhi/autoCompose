import { NextRequest } from "next/server";
import { success, created, failure } from "@/utils/api-response";
import { validate } from "@/utils/validation";
import { createSessionSchema, listSessionsSchema } from "@/modules/session/validation";
import { createSession, listSessions } from "@/modules/session/service";
import { recordAudit } from "@/lib/audit";
import { requireAuth } from "@/lib/auth/session";

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();

    const body = await request.json();
    const input = validate(createSessionSchema, body);

    const result = await createSession(user.userId, input);

    recordAudit({
      action: "session.created",
      entityType: "Session",
      entityId: result.id,
      userId: user.userId,
      metadata: { title: result.title, category: result.category },
      ip: request.headers.get("x-forwarded-for") ?? undefined,
      userAgent: request.headers.get("user-agent") ?? undefined,
    });

    return created(result);
  } catch (error) {
    return failure(error);
  }
}

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth();

    const { searchParams } = new URL(request.url);
    const params = Object.fromEntries(searchParams.entries());
    const input = validate(listSessionsSchema, params);

    const result = await listSessions(user.userId, {
      page: input.page,
      pageSize: input.pageSize,
      search: input.search,
      isArchived: input.isArchived,
    });

    return success(result);
  } catch (error) {
    return failure(error);
  }
}

// ============================================================
// FILE: src/app/api/sessions/route.ts
// ============================================================
// PURPOSE: API endpoint for creating and listing email generation sessions.
// HOW IT WORKS: POST creates a new session with validated title, category, and
//   optional metadata. Records an audit entry. GET returns paginated sessions
//   with optional search and archive filtering. Both enforce ownership via userId.
// INTEGRATION: Session service, session validation, audit logger, auth
// ============================================================
