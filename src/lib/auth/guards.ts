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
// PURPOSE: Higher-order functions that wrap API route handlers with auth checks.
// HOW IT WORKS: withAuth() calls requireAuth() before the handler; if auth
//   fails, it returns a structured error response. The handler receives the
//   authenticated CurrentUser. withOptionalAuth() works similarly but passes
//   null instead of throwing when unauthenticated. Both extract route params
//   from the Next.js context and pass them to the handler.
// [SECURITY] Server-only - enforces authentication on API routes
// INTEGRATION: Next.js API routes, requireAuth, api-response utilities
// ============================================================
