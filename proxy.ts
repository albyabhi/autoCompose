import { auth } from "@/auth";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const publicPaths = ["/login", "/register", "/auth/error"];

export async function proxy(request: NextRequest) {
  const session = await auth();
  const { pathname } = request.nextUrl;

  const isPublic =
    publicPaths.some((p) => pathname.startsWith(p));
  const isApiAuth = pathname.startsWith("/api/auth");
  const isStatic =
    pathname.startsWith("/_next") || pathname.startsWith("/favicon");

  if (isApiAuth || isStatic) {
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
  matcher: ["/((?!api/auth|_next/static|_next/image|favicon.ico).*)"],
};
