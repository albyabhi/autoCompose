import "server-only";
import { scryptSync } from "crypto";
import { createCipheriv, createDecipheriv, randomBytes } from "crypto";
import { connectDB } from "@/lib/db";
import { Profile } from "@/models/profile";
import { logger } from "@/lib/logger";

// ---------------------------------------------------------------------------
// types
// ---------------------------------------------------------------------------
const DEK_IV_BYTES = 12;
const DEK_TAG_BYTES = 16;
const KEK_SALT_SUFFIX = "kek-salt-v1";

export interface RotationResult {
  rotatedUsers: number;
  failedUsers: string[];
  skippedUsers: number;
}

export interface KeyStatusReport {
  totalCredentials: number;
  v1Count: number;
  v2Count: number;
  latestDekVersion: number;
}

// ---------------------------------------------------------------------------
// low-level helpers (mirrored from crypto.ts for server-only isolation)
// ---------------------------------------------------------------------------
function isHex(value: string, expectedBytes: number): boolean {
  if (value.length !== expectedBytes * 2) return false;
  return /^[0-9a-f]+$/i.test(value);
}

function encryptRaw(plain: string, key: Buffer): string {
  const iv = randomBytes(DEK_IV_BYTES);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const ct = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [iv.toString("hex"), tag.toString("hex"), ct.toString("hex")].join(":");
}

function decryptRaw(stored: string, key: Buffer): string {
  const parts = stored.split(":");
  if (parts.length !== 3) throw new Error("decryptRaw: malformed ciphertext");
  const [ivHex, tagHex, ctHex] = parts as [string, string, string];
  if (!isHex(ivHex, DEK_IV_BYTES)) throw new Error("decryptRaw: invalid iv");
  if (!isHex(tagHex, DEK_TAG_BYTES)) throw new Error("decryptRaw: invalid auth tag");
  if (ctHex.length === 0 || !/^[0-9a-f]+$/i.test(ctHex)) {
    throw new Error("decryptRaw: invalid ciphertext");
  }
  const decipher = createDecipheriv("aes-256-gcm", key, Buffer.from(ivHex, "hex"));
  decipher.setAuthTag(Buffer.from(tagHex, "hex"));
  return Buffer.concat([
    decipher.update(Buffer.from(ctHex, "hex")),
    decipher.final(),
  ]).toString("utf8");
}

function deriveKEK(authSecret: string, userId: string): Buffer {
  return scryptSync(authSecret, userId + KEK_SALT_SUFFIX, 32);
}

// ---------------------------------------------------------------------------
// rotateUserDEK — re-encrypt a single user's DEK with a new KEK
// ---------------------------------------------------------------------------
async function rotateUserDEK(
  profile: { userId: string; emailCredentials?: { encryptedDek?: string; dekVersion?: number } },
  oldAuthSecret: string,
  newAuthSecret: string
): Promise<boolean> {
  const creds = profile.emailCredentials;
  if (!creds?.encryptedDek || typeof creds.dekVersion !== "number") return false;

  const userId = profile.userId;
  const oldKEK = deriveKEK(oldAuthSecret, userId);
  const newKEK = deriveKEK(newAuthSecret, userId);

  const dekHex = decryptRaw(creds.encryptedDek, oldKEK);
  const newEncryptedDek = encryptRaw(dekHex, newKEK);

  await Profile.findOneAndUpdate(
    { userId },
    {
      $set: {
        "emailCredentials.encryptedDek": newEncryptedDek,
        "emailCredentials.dekVersion": creds.dekVersion + 1,
      },
    }
  );

  return true;
}

// ---------------------------------------------------------------------------
// rotateKEK — batch re-encrypt all user DEKs with a new KEK
// ---------------------------------------------------------------------------

/**
 * Rotate the Key Encryption Key for all users.
 * Decrypts each DEK with the old KEK (derived from oldAuthSecret),
 * re-encrypts with the new KEK (derived from newAuthSecret), and updates Profile.
 *
 * Usage:
 *   1. Generate new AUTH_SECRET (32+ chars).
 *   2. Run this function with old and new secrets.
 *   3. Deploy new AUTH_SECRET to production.
 *   4. Old secret can be archived.
 */
export async function rotateKEK(
  oldAuthSecret: string,
  newAuthSecret: string
): Promise<RotationResult> {
  if (oldAuthSecret.length < 32) {
    throw new Error("rotateKEK: oldAuthSecret must be at least 32 characters");
  }
  if (newAuthSecret.length < 32) {
    throw new Error("rotateKEK: newAuthSecret must be at least 32 characters");
  }
  if (oldAuthSecret === newAuthSecret) {
    throw new Error("rotateKEK: old and new secrets must differ");
  }

  await connectDB();

  const profiles = await Profile.find({
    "emailCredentials.encryptedDek": { $exists: true, $ne: null },
  })
    .select("userId emailCredentials")
    .lean();

  const result: RotationResult = {
    rotatedUsers: 0,
    failedUsers: [],
    skippedUsers: 0,
  };

  for (const profile of profiles) {
    try {
      const rotated = await rotateUserDEK(profile, oldAuthSecret, newAuthSecret);
      if (rotated) {
        result.rotatedUsers++;
        logger.info("KEK rotation: user rotated", { userId: profile.userId });
      } else {
        result.skippedUsers++;
      }
    } catch (err) {
      logger.error("KEK rotation: user failed", {
        userId: profile.userId,
        reason: err instanceof Error ? err.message : "unknown",
      });
      result.failedUsers.push(profile.userId);
    }
  }

  logger.info("KEK rotation complete", result);
  return result;
}

// ---------------------------------------------------------------------------
// getKeyStatus — report on credential encryption state
// ---------------------------------------------------------------------------
export async function getKeyStatus(): Promise<KeyStatusReport> {
  await connectDB();

  const totalCredentials = await Profile.countDocuments({
    "emailCredentials.encryptedAppPassword": { $exists: true, $ne: null },
  });

  const v2Count = await Profile.countDocuments({
    "emailCredentials.encryptedDek": { $exists: true, $ne: null },
  });

  const v1Count = totalCredentials - v2Count;

  const latestVersionDoc = await Profile.findOne({
    "emailCredentials.dekVersion": { $exists: true },
  })
    .sort({ "emailCredentials.dekVersion": -1 })
    .select("emailCredentials.dekVersion")
    .lean();

  return {
    totalCredentials,
    v1Count,
    v2Count,
    latestDekVersion: latestVersionDoc?.emailCredentials?.dekVersion ?? 0,
  };
}

// ============================================================
// FILE: src/lib/key-rotation.ts
// ============================================================
// PURPOSE: Rotates the master encryption key (KEK) once per year so that even if an old AUTH_SECRET is compromised, it can't decrypt current user credentials.
// HOW IT WORKS: The envelope encryption system (crypto.ts) derives each user's KEK from AUTH_SECRET + userId. If AUTH_SECRET ever needs to change (annual rotation or suspected leak), this module re-encrypts every user's DEK without ever seeing their actual password:
//   1. rotateKEK(oldSecret, newSecret): Finds all users with v2 credentials, decrypts each DEK using the OLD secret, re-encrypts it with the NEW secret, saves the updated encryptedDek and increments dekVersion. Runs in a loop, logs progress, continues on individual failures.
//   2. getKeyStatus(): Reports how many users are on v1 (legacy) vs v2 (envelope) encryption, and the highest dekVersion in use.
//   3. rotateUserDEK(): Internal helper for a single user.
//   This is designed to be run as a one-time admin script (src/scripts/migrate-credentials-v2.ts) during a maintenance window. Both old and new secrets must be provided explicitly — neither is read from config.
// [SECURITY] Server-only. Requires both secrets at runtime. Old secret never stored. Run annually or after any AUTH_SECRET exposure.
// INTEGRATION: Uses Profile model (src/models/profile.ts) to read/write encryptedDek and dekVersion; connectDB (src/lib/db.ts); mirrors low-level crypto helpers from crypto.ts for server-only isolation; called by migration script (src/scripts/migrate-credentials-v2.ts).
// ============================================================
