import "server-only";
import { redirect } from "next/navigation";
import { cache } from "react";
import { getServerSession } from "@/lib/auth/session";
import { getCurrentUser as getAuthCurrentUser } from "@/lib/auth/current-user";
import { getProfile } from "@/modules/profile/service";
import { buildProfileContext } from "@/modules/profile/context-builder";
import type { ProfileContext } from "@/modules/ai/types";
import type { EmailCategory } from "@/modules/email/categories";

export const getSession = getServerSession;

export const verifySession = cache(async () => {
  const session = await getServerSession();

  if (!session?.user?.id) {
    redirect("/login");
  }

  return {
    userId: session.user.id,
    role: session.user.role as string,
    isAuth: true,
  };
});

export const getCurrentUser = getAuthCurrentUser;

export const getUserProfileContext = cache(async (category: EmailCategory = "custom", prompt = ""): Promise<ProfileContext | null> => {
  const session = await getServerSession();
  if (!session?.user?.id) return null;

  try {
    const profile = await getProfile(session.user.id);
    return buildProfileContext(profile, category, prompt);
  } catch {
    return null;
  }
});

// ============================================================
// FILE: src/lib/dal.ts
// ============================================================
// PURPOSE: Server-only Data Access Layer providing cached, auth-aware data functions.
// HOW IT WORKS: Wraps NextAuth session checks with React.cache() for request
//   deduplication. verifySession() checks auth and redirects to /login if
//   unauthenticated. getCurrentUser() retrieves the full user document.
//   getUserProfileContext() fetches the user's profile and builds an AI-ready
//   context object based on the email category. All functions are cached per
//   request to avoid redundant DB calls.
// [SECURITY] Server-only module - never expose to client bundle
// INTEGRATION: NextAuth sessions, Profile module, Context builder
// ============================================================
