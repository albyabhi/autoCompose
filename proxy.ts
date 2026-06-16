import { auth } from "@/auth";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const publicPaths = ["/login", "/register", "/auth/error"];
const publicApiPaths = ["/api/telegram/webhook", "/api/telegram/health"];

export async function proxy(request: NextRequest) {
  const session = await auth();
  const { pathname } = request.nextUrl;

  const isPublic =
    publicPaths.some((p) => pathname.startsWith(p));
  const isApiAuth = pathname.startsWith("/api/auth");
  const isApiPublic = publicApiPaths.some((p) => pathname === p || pathname.startsWith(p + "/"));
  const isStatic =
    pathname.startsWith("/_next") || pathname.startsWith("/favicon");

  if (isApiAuth || isApiPublic || isStatic) {
    return NextResponse.next();
  }

  if (!session?.user && !isPublic) {
    const loginUrl = new URL("/login", request.nextUrl.origin);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (session?.user && pathname === "/login") {
    return NextResponse.redirect(new URL("/dashboard", request.nextUrl.origin));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api/auth|api/telegram/webhook|api/telegram/health|_next/static|_next/image|favicon.ico).*)"],
};

// ============================================================
// FILE: proxy.ts (Next.js Middleware)
// ============================================================
// PURPOSE: Route-level authentication guard that protects all non-public routes.
// HOW IT WORKS: Checks the NextAuth session for each request. Public paths
//   (login, register, auth/error) and public API paths (telegram webhook/health)
//   are allowed through without auth. API auth routes and static assets are
//   also exempted. Unauthenticated users on protected routes are redirected
//   to /login with a callbackUrl. Authenticated users on /login are redirected
//   to /dashboard. The matcher excludes api/auth, telegram webhook/health,
//   and static assets from middleware processing.
// [SECURITY] First line of defense - ensures all routes require authentication
// INTEGRATION: NextAuth session, Next.js middleware system
// ============================================================
