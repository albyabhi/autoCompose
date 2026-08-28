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

  if (data.contacts !== undefined) {
    update["contacts"] = data.contacts;
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
// PURPOSE: Manages user profiles — personal info, work history, preferences, and encrypted Gmail credentials.
// HOW IT WORKS: Each user has one Profile document. All functions enforce ownership via ownedFilter().
//   - getProfile(userId): Returns the profile or null if not created yet.
//   - createProfile(userId, data): Creates initial profile. Throws if profile already exists.
//   - updateProfile(userId, data): Merges partial updates. Special handling for emailCredentials:
//     * If null provided: removes credentials, logs audit "email.credentials_removed".
//     * If provided: encrypts appPassword with crypto.encryptV2() (envelope encryption), stores encryptedData + encryptedDek + dekVersion, logs audit "email.credentials_saved".
//   - upsertProfile(userId, data): Atomic create-or-update (MongoDB upsert). Used during onboarding.
//   - migrateUserCredentialsToV2(userId): Called lazily when sending email with v1 credentials. Decrypts with old key, re-encrypts with v2 envelope, updates profile. Returns true if migrated.
//   Profile sections: personal (name, title, location), professional (experience, education, skills), preferences (formality, tone), jobApplication (target role, company), contacts, resume (parsed from upload).
// INTEGRATION: Profile model (src/models/profile.ts), crypto.ts (encryptV2, migrateV1ToV2), audit.ts (recordAudit), professional.ts (normalizeProfessionalForSave). Called by: API routes (src/app/api/profile/route.ts), email dispatch (src/modules/email/dispatch.ts), schedule processor, Telegram bot, resume parser.
// ============================================================
