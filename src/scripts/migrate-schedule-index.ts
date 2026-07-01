import mongoose from "mongoose";
import { loadEnvConfig } from "@next/env";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type IndexInfo = Record<string, any>;

const sourceBulkEntryIndex = {
  scheduleId: 1,
  sourceBulkEntryId: 1,
} as const;

const sourceBulkEntryIndexOptions = {
  name: "scheduleId_1_sourceBulkEntryId_1",
  unique: true,
  background: true,
  partialFilterExpression: {
    sourceType: "batch",
    sourceBulkEntryId: { $exists: true },
  },
} as const;

const sourceMessageIndex = {
  scheduleId: 1,
  sourceMessageId: 1,
} as const;

function hasKey(index: IndexInfo, key: Record<string, 1>): boolean {
  return Object.entries(key).every(([field, value]) => index.key?.[field] === value);
}

function hasBulkPartialFilter(index: IndexInfo): boolean {
  return (
    index.partialFilterExpression?.sourceType === "batch" &&
    index.partialFilterExpression?.sourceBulkEntryId?.$exists === true
  );
}

function getMongoUri(): string {
  loadEnvConfig(process.cwd());
  const uri = process.env.MONGODB_URI;
  if (!uri?.startsWith("mongodb")) {
    throw new Error("MONGODB_URI must be set to a mongodb:// or mongodb+srv:// connection string.");
  }
  return uri;
}

async function runMigration(dryRun: boolean): Promise<void> {
  await mongoose.connect(getMongoUri(), {
    maxPoolSize: 10,
    minPoolSize: 1,
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000,
  });

  const collection = mongoose.connection.collection("scheduledemails");
  const indexes: IndexInfo[] = await collection.indexes();
  const oldBulkIndex = indexes.find(
    (idx) => hasKey(idx, sourceBulkEntryIndex) && idx.unique === true && !hasBulkPartialFilter(idx)
  );
  const newBulkIndex = indexes.find(
    (idx) => hasKey(idx, sourceBulkEntryIndex) && idx.unique === true && hasBulkPartialFilter(idx)
  );
  const oldMessageIndex = indexes.find(
    (idx) => hasKey(idx, sourceMessageIndex) && idx.unique === true
  );
  const nonUniqueMessageIndex = indexes.find(
    (idx) => hasKey(idx, sourceMessageIndex) && !idx.unique
  );

  if (dryRun) {
    if (oldBulkIndex) {
      console.log("[DRY RUN] Would drop old sourceBulkEntryId index:", oldBulkIndex.name);
    }
    if (!newBulkIndex) {
      console.log("[DRY RUN] Would create partial unique index on { scheduleId: 1, sourceBulkEntryId: 1 }");
    }
    if (oldMessageIndex) {
      console.log("[DRY RUN] Would drop old sourceMessageId unique index:", oldMessageIndex.name);
      if (!nonUniqueMessageIndex) {
        console.log("[DRY RUN] Would create non-unique sparse index on { scheduleId: 1, sourceMessageId: 1 }");
      }
    }
    if (!oldBulkIndex && newBulkIndex && !oldMessageIndex) {
      console.log("[DRY RUN] Scheduled email indexes are already up to date.");
    }
    return;
  }

  if (oldBulkIndex) {
    console.log(`Dropping old sourceBulkEntryId index: "${oldBulkIndex.name}" ...`);
    await collection.dropIndex(oldBulkIndex.name);
    console.log("Old sourceBulkEntryId index dropped.");
  }

  if (!newBulkIndex) {
    console.log("Creating partial unique index on { scheduleId: 1, sourceBulkEntryId: 1 } ...");
    await collection.createIndex(sourceBulkEntryIndex, sourceBulkEntryIndexOptions);
    console.log("Partial unique sourceBulkEntryId index created.");
  }

  if (oldMessageIndex) {
    console.log(`Dropping old sourceMessageId unique index: "${oldMessageIndex.name}" ...`);
    await collection.dropIndex(oldMessageIndex.name);
    console.log("Old sourceMessageId unique index dropped.");
  }

  if (oldMessageIndex && !nonUniqueMessageIndex) {
    console.log("Creating non-unique sparse index on { scheduleId: 1, sourceMessageId: 1 } ...");
    await collection.createIndex(sourceMessageIndex, { sparse: true, background: true });
    console.log("Non-unique sourceMessageId index created.");
  }

  if (!oldBulkIndex && newBulkIndex && !oldMessageIndex) {
    console.log("Scheduled email indexes are already up to date.");
  }
  console.log("Migration complete.");
}

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes("--dry-run");

  try {
    await runMigration(dryRun);
    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error("Migration failed:", error);
    await mongoose.disconnect();
    process.exit(1);
  }
}

main();

// ============================================================
// FILE: src/scripts/migrate-schedule-index.ts
// ============================================================
// PURPOSE: Migrates scheduled email indexes away from unsafe sparse unique constraints.
// HOW IT WORKS: Connects to MongoDB, drops the old compound sparse unique
//   sourceBulkEntryId index when present, and creates a partial unique index
//   that only covers batch rows. It also preserves cleanup for the older
//   unique sourceMessageId index by replacing it with a non-unique sparse index.
// INTEGRATION: Uses Mongoose with MONGODB_URI and the raw scheduledemails collection.
// ============================================================
