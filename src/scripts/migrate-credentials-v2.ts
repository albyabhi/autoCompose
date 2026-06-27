/**
 * Batch migration script: v1 credentials → v2 envelope encryption.
 *
 * Usage:
 *   npx tsx src/scripts/migrate-credentials-v2.ts [--dry-run] [--older-than-days=90]
 *
 * Options:
 *   --dry-run              Print what would be migrated without writing.
 *   --older-than-days=N    Only migrate profiles last updated before N days ago (default: 90).
 *
 * Environment:
 *   MONGODB_URI  — MongoDB connection string (required).
 *   AUTH_SECRET  — At least 32 chars (required).
 */

import { connectDB } from "@/lib/db";
import { Profile } from "@/models/profile";
import { migrateV1ToV2 } from "@/lib/crypto";

interface MigrationResult {
  migrated: number;
  skipped: number;
  failed: number;
  failedIds: string[];
}

async function runMigration(dryRun: boolean, olderThanDays: number): Promise<MigrationResult> {
  await connectDB();

  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - olderThanDays);

  const profiles = await Profile.find({
    "emailCredentials.encryptedAppPassword": { $exists: true, $ne: null },
    "emailCredentials.encryptedDek": { $exists: false },
    updatedAt: { $lt: cutoff },
  })
    .select("_id userId emailCredentials")
    .lean();

  const result: MigrationResult = {
    migrated: 0,
    skipped: 0,
    failed: 0,
    failedIds: [],
  };

  for (const profile of profiles) {
    const userId = profile.userId;
    const encryptedAppPassword = profile.emailCredentials?.encryptedAppPassword;
    if (!encryptedAppPassword) {
      result.skipped++;
      continue;
    }

    if (dryRun) {
      console.log(`[DRY RUN] Would migrate userId=${userId}`);
      result.migrated++;
      continue;
    }

    try {
      const migrated = migrateV1ToV2(encryptedAppPassword, userId);
      await Profile.findOneAndUpdate(
        { _id: profile._id },
        {
          $set: {
            "emailCredentials.encryptedAppPassword": migrated.encryptedData,
            "emailCredentials.encryptedDek": migrated.encryptedDek,
            "emailCredentials.dekVersion": migrated.dekVersion,
          },
        }
      );
      console.log(`Migrated userId=${userId}`);
      result.migrated++;
    } catch (err) {
      console.error(`Failed to migrate userId=${userId}:`, err);
      result.failed++;
      result.failedIds.push(userId);
    }
  }

  return result;
}

// ---------------------------------------------------------------------------
// CLI entry point
// ---------------------------------------------------------------------------
const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const olderThanArg = args.find((a) => a.startsWith("--older-than-days="));
const olderThanDays = olderThanArg ? parseInt(olderThanArg.split("=")[1]!, 10) : 90;

console.log(`Migration started (dryRun=${dryRun}, olderThanDays=${olderThanDays})`);

runMigration(dryRun, olderThanDays)
  .then((result) => {
    console.log("Migration complete:", result);
    if (result.failed > 0) process.exit(1);
  })
  .catch((err) => {
    console.error("Migration script failed:", err);
    process.exit(1);
  });

// ============================================================
// FILE: src/scripts/migrate-credentials-v2.ts
// ============================================================
// PURPOSE: Batch migrates v1 encrypted credentials to v2 envelope encryption.
// HOW IT WORKS: Queries Profile documents that have an encryptedAppPassword but
//   no encryptedDek (i.e. still v1 format) and whose updatedAt is older than
//   --older-than-days. For each, calls migrateV1ToV2() to re-encrypt with a
//   per-user DEK and writes the v2 fields back. --dry-run logs without writing.
// INTEGRATION: Uses crypto.ts migrateV1ToV2, Profile model, connectDB
// ============================================================
