import { connectDB } from "@/lib/db";
import { Session, ISession } from "@/models/session";
import { Message } from "@/models/message";
import { NotFoundError } from "@/lib/errors";
import { logger } from "@/lib/logger";
import type { SessionData, PaginatedResult, SessionListOptions } from "./types";
import type { CreateSessionInput, UpdateSessionInput } from "./validation";
import { HISTORY_MESSAGE_LIMIT } from "./history-budget";

function toSessionData(session: ISession): SessionData {
  return {
    id: session._id.toString(),
    title: session.title,
    category: session.category,
    type: (session.type as "single" | "batch") ?? "single",
    userId: session.userId,
    metadata: session.metadata as Record<string, unknown>,
    isArchived: session.isArchived,
    createdAt: session.createdAt,
    updatedAt: session.updatedAt,
  };
}

export async function createSession(
  userId: string,
  input: CreateSessionInput
): Promise<SessionData> {
  await connectDB();

  const session = await Session.create({
    title: input.title,
    category: input.category,
    userId,
    metadata: input.metadata ?? {},
  });

  logger.info("Session created", { sessionId: session._id.toString(), userId });
  return toSessionData(session);
}

export async function getSession(
  sessionId: string,
  userId: string
): Promise<SessionData & { messages: unknown[] }> {
  await connectDB();

  const session = await Session.findOne({
    _id: sessionId,
    userId,
    isDeleted: false,
  });

  if (!session) {
    throw new NotFoundError("Session not found");
  }

  const messages = await Message.find({ sessionId: session._id })
    .sort({ createdAt: 1 })
    .lean();

  return {
    ...toSessionData(session),
    messages: messages.map((m) => ({
      id: m._id.toString(),
      sessionId: m.sessionId.toString(),
      role: m.role,
      content: m.content,
      modelUsed: m.modelUsed,
      metadata: m.metadata,
      createdAt: m.createdAt,
    })),
  };
}

export async function listSessions(
  userId: string,
  options: SessionListOptions = {}
): Promise<PaginatedResult<SessionData>> {
  await connectDB();

  const { page = 1, pageSize = 20, search, isArchived } = options;
  const skip = (page - 1) * pageSize;

  const filter: Record<string, unknown> = {
    userId,
    isDeleted: false,
  };

  if (typeof isArchived === "boolean") {
    filter.isArchived = isArchived;
  }

  if (search) {
    filter.title = { $regex: search, $options: "i" };
  }

  const [sessions, total] = await Promise.all([
    Session.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(pageSize)
      .lean(),
    Session.countDocuments(filter),
  ]);

  const sessionIds = sessions.map((s) => s._id);

  const messageCounts = await Message.aggregate([
    { $match: { sessionId: { $in: sessionIds } } },
    { $group: { _id: "$sessionId", count: { $sum: 1 }, lastCreated: { $max: "$createdAt" } } },
  ]);

  const countMap = new Map(
    messageCounts.map((m) => [m._id.toString(), { count: m.count, lastCreated: m.lastCreated }])
  );

  const items: SessionData[] = sessions.map((s) => ({
    id: s._id.toString(),
    title: s.title,
    category: s.category,
    type: (s.type as "single" | "batch") ?? "single",
    userId: s.userId,
    metadata: s.metadata as Record<string, unknown>,
    isArchived: s.isArchived,
    messageCount: countMap.get(s._id.toString())?.count ?? 0,
    lastMessageAt: countMap.get(s._id.toString())?.lastCreated,
    createdAt: s.createdAt,
    updatedAt: s.updatedAt,
  }));

  return {
    items,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  };
}

export async function updateSession(
  sessionId: string,
  userId: string,
  input: UpdateSessionInput
): Promise<SessionData> {
  await connectDB();

  const update: Record<string, unknown> = {};
  if (input.title) update.title = input.title;
  if (input.metadata) update.metadata = input.metadata;

  const session = await Session.findOneAndUpdate(
    { _id: sessionId, userId, isDeleted: false },
    { $set: update },
    { returnDocument: "after", runValidators: true }
  );

  if (!session) {
    throw new NotFoundError("Session not found");
  }

  logger.info("Session updated", { sessionId, userId });
  return toSessionData(session);
}

export async function deleteSession(
  sessionId: string,
  userId: string
): Promise<void> {
  await connectDB();

  const session = await Session.findOneAndUpdate(
    { _id: sessionId, userId, isDeleted: false },
    { $set: { isDeleted: true, deletedAt: new Date() } },
    { returnDocument: "after" }
  );

  if (!session) {
    throw new NotFoundError("Session not found");
  }

  logger.info("Session soft-deleted", { sessionId, userId });
}

export async function clearAllSessions(
  userId: string
): Promise<{ clearedCount: number }> {
  await connectDB();

  const result = await Session.updateMany(
    { userId, isDeleted: false },
    { $set: { isDeleted: true, deletedAt: new Date() } }
  );

  logger.info("All sessions cleared", { userId, clearedCount: result.modifiedCount });
  return { clearedCount: result.modifiedCount };
}

export async function toggleArchive(
  sessionId: string,
  userId: string,
  archived: boolean
): Promise<SessionData> {
  await connectDB();

  const session = await Session.findOneAndUpdate(
    { _id: sessionId, userId, isDeleted: false },
    { $set: { isArchived: archived } },
    { returnDocument: "after" }
  );

  if (!session) {
    throw new NotFoundError("Session not found");
  }

  logger.info(`Session ${archived ? "archived" : "unarchived"}`, { sessionId, userId });
  return toSessionData(session);
}

export async function getMessageHistory(
  sessionId: string,
  userId: string
): Promise<{ role: "user" | "assistant"; content: string }[]> {
  await connectDB();

  const session = await Session.findOne({
    _id: sessionId,
    userId,
    isDeleted: false,
  });

  if (!session) {
    throw new NotFoundError("Session not found");
  }

  const messages = await Message.find({ sessionId: session._id })
    .sort({ createdAt: -1 })
    .limit(HISTORY_MESSAGE_LIMIT)
    .select("role content")
    .lean();

  return messages.reverse().map((m) => ({
    role: m.role as "user" | "assistant",
    content: m.content,
  }));
}

// ============================================================
// FILE: src/modules/session/service.ts
// ============================================================
// PURPOSE: Manages conversation sessions — each session is a thread of emails on one topic (job application, leave request, etc.).
// HOW IT WORKS: Each user owns multiple Sessions. All operations filter by userId for isolation.
//   - createSession(userId, {title, category}): Creates a new session with title (e.g., "Job Application 3") and category. Returns SessionData.
//   - getSession(sessionId, userId): Returns session + all its messages (chronological) with message details (id, role, content, modelUsed, metadata).
//   - listSessions(userId, {page, pageSize, search, isArchived}): Paginated list with optional text search on title and archive filter. Efficiently aggregates message counts and last message timestamps per session in one query.
//   - updateSession(): Updates title and/or metadata.
//   - deleteSession(): Soft delete — sets isDeleted=true, deletedAt=now. Preserves data but hides from lists.
//   - clearAllSessions(): Soft-deletes all user's sessions at once.
//   - toggleArchive(): Archives/unarchives a session (hidden from default list but not deleted).
//   - getMessageHistory(): Returns last 8 messages (HISTORY_MESSAGE_LIMIT) for AI context, ordered oldest-first. Used by email service for multi-turn conversations.
//   All queries use { userId, isDeleted: false } to enforce ownership.
// INTEGRATION: Session/Message models (src/models/session.ts, src/models/message.ts); history-budget.ts (HISTORY_MESSAGE_LIMIT); auth ownership (ownedFilter); audit logging (implicit via email service). Called by session API routes (src/app/api/sessions/**/route.ts), email service (src/modules/email/service.ts), and UI hooks (src/features/sessions/hooks/use-sessions.ts).
// ============================================================
