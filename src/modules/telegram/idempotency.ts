import "server-only";
import { connectDB } from "@/lib/db";
import { TelegramUpdate } from "@/models/telegram-update";

export async function isDuplicateUpdate(updateId: number): Promise<boolean> {
  await connectDB();
  try {
    await TelegramUpdate.create({ updateId });
    return false;
  } catch (error) {
    if (error instanceof Error && /duplicate key/i.test(error.message)) {
      return true;
    }
    if (typeof error === "object" && error !== null && "code" in error) {
      const code = (error as { code?: number }).code;
      if (code === 11000) return true;
    }
    throw error;
  }
}

// ============================================================
// FILE: src/modules/telegram/idempotency.ts
// ============================================================
// PURPOSE: Prevents duplicate processing of Telegram webhook updates.
// HOW IT WORKS: isDuplicateUpdate() attempts to insert the updateId into the
//   TelegramUpdate collection. If the insert succeeds, it's a new update (returns false).
//   If a duplicate key error occurs (MongoDB error 11000), the update was already
//   processed (returns true). TelegramUpdate has a 10-minute TTL index that auto-cleans
//   old records. This prevents duplicate emails/commands when Telegram retries delivery.
// INTEGRATION: TelegramUpdate model, called by webhook handler before processing
// ============================================================
