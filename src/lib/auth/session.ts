import "server-only";
import { auth } from "@/auth";
import { cache } from "react";
import { UnauthorizedError } from "@/lib/errors";
import { connectDB } from "@/lib/db";
import { User } from "@/models/user";
import { Profile } from "@/models/profile";
import type { CurrentUser } from "./types";

export const getServerSession = cache(async () => {
  return await auth();
});

export const requireAuth = cache(async (): Promise<CurrentUser> => {
  const session = await auth();
  if (!session?.user?.id) {
    throw new UnauthorizedError("Authentication required");
  }
  return await hydrateUser(session.user.id);
});

async function hydrateUser(userId: string): Promise<CurrentUser> {
  await connectDB();
  const user = await User.findById(userId).lean();
  if (!user) {
    throw new UnauthorizedError("User not found");
  }

  const profile = await Profile.findOne({ userId }).lean();

  return {
    userId: user._id.toString(),
    name: user.name,
    email: user.email,
    role: user.role,
    onboardingCompleted: user.onboardingCompleted,
    profileCompleted: !!profile,
    avatar: user.avatar,
  };
}

// ============================================================
// FILE: src/lib/auth/session.ts
// ============================================================
// PURPOSE: Verifies the user is logged in and loads their complete profile data for use in server-side code (API routes, server components).
// HOW IT WORKS: Wraps NextAuth (the authentication library) with React's cache() so the session is only fetched once per request, even if multiple functions call it.
//   - getServerSession(): Returns the raw NextAuth session (may be null if not logged in). Used when you need to check auth optionally.
//   - requireAuth(): Calls getServerSession(), throws UnauthorizedError if no session, then calls hydrateUser() to fetch the full user record from MongoDB (User collection) and check if they have a Profile. Returns a CurrentUser object with: userId, name, email, role, onboardingCompleted, profileCompleted (boolean), avatar.
//   - hydrateUser(): Internal helper that queries the User and Profile collections.
//   This runs on the server only — never in the browser. Every API route that needs the current user calls requireAuth() at the start.
// INTEGRATION: Uses NextAuth (src/auth.ts) for session cookies/JWT; User model (src/models/user.ts) and Profile model (src/models/profile.ts) for database lookups; CurrentUser type from src/lib/auth/types.ts; called by all protected API routes (src/app/api/**/route.ts) and server components.
// ============================================================
