import type { Model, Document } from "mongoose";
import { NotFoundError } from "@/lib/errors";

export function ownedFilter(userId: string, extra: Record<string, unknown> = {}): Record<string, unknown> {
  return { userId, ...extra };
}

export async function requireOwnership<T extends Document>(
  model: Model<T>,
  id: string,
  userId: string
): Promise<T> {
  const doc = await model.findOne({ _id: id, userId } as Record<string, unknown>);
  if (!doc) {
    throw new NotFoundError("Resource not found");
  }
  return doc;
}

export function assertOwnership(
  entity: { userId?: string } | null,
  userId: string
): void {
  if (!entity || entity.userId !== userId) {
    throw new NotFoundError("Resource not found");
  }
}

export function withUserId<T>(
  data: T & { userId?: string },
  userId: string
): T & { userId: string } {
  return { ...data, userId };
}

// ============================================================
// FILE: src/lib/auth/ownership.ts
// ============================================================
// PURPOSE: Ensures users can only access their own data in the database — the foundation of multi-tenant isolation.
// HOW IT WORKS: Provides four helper functions that every service uses when querying MongoDB:
//   - ownedFilter(userId, extra): Returns a filter object like { userId: "abc", ...extra } that gets added to every database query. This guarantees User A never sees User B's emails, schedules, or profile.
//   - requireOwnership(model, id, userId): Fetches a document by ID but ONLY if it belongs to userId. Throws NotFoundError if missing or owned by someone else (doesn't reveal whether the document exists at all).
//   - assertOwnership(entity, userId): Checks an already-loaded document belongs to the current user. Throws if not.
//   - withUserId(data, userId): Adds userId to a new document before saving it to the database.
//   These are used in every service: email, schedule, profile, session, bulk, Telegram — anywhere data is read or written.
// INTEGRATION: Imported by all service modules (src/modules/*/service.ts) and API routes. The Profile, Session, Schedule, EmailTemplate, BulkEntry, ScheduledEmail, and AuditLog models all have a userId field that these functions filter on.
// ============================================================
