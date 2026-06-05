import "server-only";
import { redirect } from "next/navigation";
import { cache } from "react";
import { getServerSession } from "@/lib/auth/session";
import { getCurrentUser as getAuthCurrentUser } from "@/lib/auth/current-user";
import { getProfile } from "@/modules/profile/service";
import { buildProfileContext } from "@/modules/profile/context-builder";
import type { ProfileContext } from "@/modules/ai/types";

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

export const getUserProfileContext = cache(async (): Promise<ProfileContext | null> => {
  const session = await getServerSession();
  if (!session?.user?.id) return null;

  try {
    const profile = await getProfile(session.user.id);
    return buildProfileContext(profile);
  } catch {
    return null;
  }
});
