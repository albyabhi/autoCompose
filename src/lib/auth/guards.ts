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
