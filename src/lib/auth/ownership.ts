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
