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
// PURPOSE: CRUD operations for email generation sessions with pagination and search.
// HOW IT WORKS: Provides createSession(), getSession(), listSessions(),
//   updateSession(), deleteSession() (soft-delete), and toggleArchive().
//   listSessions() supports pagination, text search on title, and archive
//   filtering. It also aggregates message counts per session in a single
//   query for efficient list rendering. getMessageHistory() fetches the
//   most recent N messages (limited by HISTORY_MESSAGE_LIMIT) for AI context.
//   All operations enforce ownership via userId filtering.
// INTEGRATION: Session and Message models, history-budget for message limits
// ============================================================
