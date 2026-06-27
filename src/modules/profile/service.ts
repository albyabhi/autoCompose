import { connectDB } from "@/lib/db";
import { Profile, IProfile } from "@/models/profile";
import { NotFoundError } from "@/lib/errors";
import { logger } from "@/lib/logger";
import { ownedFilter } from "@/lib/auth/ownership";
import { encryptV2, migrateV1ToV2 } from "@/lib/crypto";
import { recordAudit } from "@/lib/audit";
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

  let credentialsAction: "saved" | "removed" | null = null;
  if (data.emailCredentials !== undefined) {
    if (data.emailCredentials === null) {
      update["emailCredentials"] = null;
      credentialsAction = "removed";
    } else {
      const encrypted = encryptV2(data.emailCredentials.appPassword, userId);
      update["emailCredentials"] = {
        gmailAddress: data.emailCredentials.gmailAddress,
        encryptedAppPassword: encrypted.encryptedData,
        encryptedDek: encrypted.encryptedDek,
        dekVersion: encrypted.dekVersion,
      };
      credentialsAction = "saved";
    }
  }

  const profile = await Profile.findOneAndUpdate(
    ownedFilter(userId),
    { $set: update },
    { returnDocument: "after", runValidators: true }
  );

  if (!profile) {
    throw new NotFoundError("Profile not found after update");
  }

  logger.info("Profile updated", { userId });
  if (credentialsAction === "saved") {
    void recordAudit({
      action: "email.credentials_saved",
      entityType: "Profile",
      entityId: userId,
      userId,
    });
  } else if (credentialsAction === "removed") {
    void recordAudit({
      action: "email.credentials_removed",
      entityType: "Profile",
      entityId: userId,
      userId,
    });
  }
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

/**
 * Migrate a user's v1 encrypted credentials to v2 envelope encryption.
 * Returns true if migration occurred, false if already v2 or no credentials exist.
 */
export async function migrateUserCredentialsToV2(userId: string): Promise<boolean> {
  await connectDB();
  const profile = await Profile.findOne(ownedFilter(userId)).lean();
  if (!profile?.emailCredentials?.encryptedAppPassword) return false;
  if (profile.emailCredentials.encryptedDek) return false;

  const v1Ciphertext = profile.emailCredentials.encryptedAppPassword;
  const migrated = migrateV1ToV2(v1Ciphertext, userId);

  await Profile.findOneAndUpdate(ownedFilter(userId), {
    $set: {
      "emailCredentials.encryptedAppPassword": migrated.encryptedData,
      "emailCredentials.encryptedDek": migrated.encryptedDek,
      "emailCredentials.dekVersion": migrated.dekVersion,
    },
  });

  logger.info("Migrated user credentials to v2", { userId });
  void recordAudit({
    action: "email.credentials_migrated_to_v2",
    entityType: "Profile",
    entityId: userId,
    userId,
  });
  return true;
}

// ============================================================
// FILE: src/modules/profile/service.ts
// ============================================================
// PURPOSE: CRUD operations for user profiles with envelope encryption credential management.
// HOW IT WORKS: getProfile() returns the user's profile or null. createProfile()
//   creates a new profile (throws if one exists). updateProfile() merges partial
//   updates into existing sections and handles emailCredentials specially - encrypting
//   the app password via v2 envelope encryption (per-user DEK) before storage and
//   recording audit entries for save/remove. upsertProfile() does a MongoDB upsert
//   for atomic create-or-update. migrateUserCredentialsToV2() transitions v1 legacy
//   ciphertexts to v2 on demand (lazy migration). All operations use ownedFilter()
//   to enforce ownership.
// INTEGRATION: Profile model, crypto.ts (encryptV2, migrateV1ToV2), audit.ts,
//   professional.ts
// ============================================================
