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
// PURPOSE: Server-only session utilities for checking auth and hydrating user data.
// HOW IT WORKS: getServerSession() is a cached wrapper around NextAuth's auth().
//   requireAuth() checks the session and throws UnauthorizedError if missing,
//   then hydrates the full user from MongoDB (User + Profile documents).
//   hydrateUser() combines user data and profile existence into a CurrentUser
//   object. All functions use React.cache() for per-request deduplication.
// [SECURITY] Server-only - contains authentication logic
// INTEGRATION: NextAuth, User model, Profile model
// ============================================================
