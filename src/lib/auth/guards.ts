import "server-only";
import { NextRequest } from "next/server";
import { requireAuth } from "./session";
import { failure } from "@/utils/api-response";
import type { CurrentUser } from "./types";

type AuthenticatedHandler = (
  request: NextRequest,
  user: CurrentUser,
  params?: Record<string, string>
) => Promise<Response>;

type OptionalAuthHandler = (
  request: NextRequest,
  user: CurrentUser | null,
  params?: Record<string, string>
) => Promise<Response>;

export function withAuth(handler: AuthenticatedHandler) {
  return async (request: NextRequest, context: { params: Promise<Record<string, string>> }) => {
    try {
      const user = await requireAuth();
      const params = context?.params ? await context.params : undefined;
      return handler(request, user, params);
    } catch (error) {
      return failure(error);
    }
  };
}

export function withOptionalAuth(handler: OptionalAuthHandler) {
  return async (request: NextRequest, context: { params: Promise<Record<string, string>> }) => {
    try {
      const { auth } = await import("@/auth");
      const session = await auth();
      const user: CurrentUser | null = session?.user?.id
        ? { userId: session.user.id, name: "", email: "", role: "", onboardingCompleted: false, profileCompleted: false }
        : null;
      const params = context?.params ? await context.params : undefined;
      return handler(request, user, params);
    } catch (error) {
      return failure(error);
    }
  };
}

// ============================================================
// FILE: src/lib/auth/guards.ts
// ============================================================
// PURPOSE: Wrapper functions that add authentication to API route handlers — the "easy mode" for protected endpoints.
// HOW IT WORKS: Two higher-order functions that wrap Next.js App Router handlers:
//   - withAuth(handler): Requires authentication. Calls requireAuth() (throws UnauthorizedError if no session). If auth succeeds, calls your handler with (request, user, params). If auth fails, returns failure(error) response automatically. Extracts route params from Next.js context.
//   - withOptionalAuth(handler): Authentication optional. Tries to get session; if found, passes minimal CurrentUser; if not, passes null. Never throws for missing auth.
//   Both wrap errors in failure() for consistent responses. Used instead of manually calling requireAuth() in every route.
//   Type signatures ensure handlers receive CurrentUser and params correctly.
// [SECURITY] Server-only - enforces authentication on API routes
// INTEGRATION: Next.js App Router (NextRequest, context.params), requireAuth (src/lib/auth/session.ts), api-response (failure). Used by API routes that need auth (e.g., /api/sessions, /api/profile).
// ============================================================
