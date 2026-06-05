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
