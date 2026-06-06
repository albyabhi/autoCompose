import { connectDB } from "@/lib/db";
import { Profile, IProfile } from "@/models/profile";
import { NotFoundError } from "@/lib/errors";
import { logger } from "@/lib/logger";
import { ownedFilter } from "@/lib/auth/ownership";
import type { ProfileUpdateInput, ProfileCreateInput } from "./validation";
import { normalizeProfessionalForSave } from "./professional";

export async function getProfile(userId: string): Promise<IProfile | null> {
  await connectDB();
  const profile = await Profile.findOne(ownedFilter(userId)).lean();
  return profile ? JSON.parse(JSON.stringify(profile)) : null;
}

export async function createProfile(
  userId: string,
  data: ProfileCreateInput
): Promise<IProfile> {
  await connectDB();
  const existing = await Profile.findOne(ownedFilter(userId));
  if (existing) {
    throw new NotFoundError("Profile already exists");
  }

  const profile = await Profile.create({
    userId,
    personal: data.personal,
    professional: data.professional ? normalizeProfessionalForSave(data.professional) : {},
    preferences: data.preferences ?? { formalityLevel: "semi-formal", preferredTone: "professional" },
    jobApplication: data.jobApplication ?? {},
  });

  logger.info("Profile created", { userId });
  return JSON.parse(JSON.stringify(profile));
}

export async function updateProfile(
  userId: string,
  data: ProfileUpdateInput
): Promise<IProfile> {
  await connectDB();
  const existing = await Profile.findOne({ userId });
  if (!existing) {
    return createProfile(userId, {
      personal: data.personal ?? { fullName: "" },
      professional: data.professional,
      preferences: data.preferences,
      jobApplication: data.jobApplication,
    });
  }

  const update: Record<string, unknown> = {};
  if (data.personal) update["personal"] = { ...existing.toObject().personal, ...data.personal };
  if (data.professional) update["professional"] = normalizeProfessionalForSave(data.professional);
  if (data.preferences) update["preferences"] = { ...existing.toObject().preferences, ...data.preferences };
  if (data.jobApplication) update["jobApplication"] = { ...existing.toObject().jobApplication, ...data.jobApplication };

  const profile = await Profile.findOneAndUpdate(
    ownedFilter(userId),
    { $set: update },
    { returnDocument: "after", runValidators: true }
  );

  if (!profile) {
    throw new NotFoundError("Profile not found after update");
  }

  logger.info("Profile updated", { userId });
  return JSON.parse(JSON.stringify(profile));
}

export async function upsertProfile(
  userId: string,
  data: ProfileUpdateInput
): Promise<IProfile> {
  await connectDB();
  const profile = await Profile.findOneAndUpdate(
    ownedFilter(userId),
    {
      $set: {
        ...(data.personal && { personal: data.personal }),
        ...(data.professional && { professional: normalizeProfessionalForSave(data.professional) }),
        ...(data.preferences && { preferences: data.preferences }),
        ...(data.jobApplication && { jobApplication: data.jobApplication }),
      },
    },
    {
      returnDocument: "after",
      upsert: true,
      runValidators: true,
      setDefaultsOnInsert: true,
    }
  );

  logger.info("Profile upserted", { userId });
  return JSON.parse(JSON.stringify(profile));
}
