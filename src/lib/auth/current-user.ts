import "server-only";
import { auth } from "@/auth";
import { cache } from "react";
import { connectDB } from "@/lib/db";
import { User } from "@/models/user";
import { Profile } from "@/models/profile";
import type { CurrentUser } from "./types";

export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const session = await auth();
  if (!session?.user?.id) return null;

  try {
    await connectDB();
    const user = await User.findById(session.user.id).lean();
    if (!user) return null;

    const profile = await Profile.findOne({ userId: session.user.id }).lean();

    return {
      userId: user._id.toString(),
      name: user.name,
      email: user.email,
      role: user.role,
      onboardingCompleted: user.onboardingCompleted,
      profileCompleted: !!profile,
      avatar: user.avatar,
    };
  } catch {
    return null;
  }
});
