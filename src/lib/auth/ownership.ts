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
// PURPOSE: Utilities for enforcing resource ownership in database queries.
// HOW IT WORKS: ownedFilter() creates a MongoDB filter that includes userId,
//   ensuring queries only return the user's own data. requireOwnership()
//   fetches a document by ID + userId, throwing NotFoundError if not found
//   (hides existence from other users). assertOwnership() validates an
//   existing entity belongs to the user. withUserId() injects userId into
//   data objects before database insertion.
// INTEGRATION: Used by service modules for data isolation between users
// ============================================================
