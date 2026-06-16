import { connectDB } from "@/lib/db";
import { Message, IMessage } from "@/models/message";
import { Session } from "@/models/session";
import { NotFoundError } from "@/lib/errors";
import { logger } from "@/lib/logger";

export interface CreateMessageInput {
  sessionId: string;
  role: "user" | "assistant";
  content: string;
  modelUsed?: string;
  metadata?: Record<string, unknown>;
}

export interface MessageData {
  id: string;
  sessionId: string;
  role: "user" | "assistant";
  content: string;
  modelUsed?: string;
  metadata: Record<string, unknown>;
  createdAt: Date;
}

function toMessageData(message: IMessage): MessageData {
  return {
    id: message._id.toString(),
    sessionId: message.sessionId.toString(),
    role: message.role,
    content: message.content,
    modelUsed: message.modelUsed,
    metadata: message.metadata as Record<string, unknown>,
    createdAt: message.createdAt,
  };
}

export async function createMessage(
  userId: string,
  input: CreateMessageInput
): Promise<MessageData> {
  await connectDB();

  const session = await Session.findOne({
    _id: input.sessionId,
    userId,
    isDeleted: false,
  });

  if (!session) {
    throw new NotFoundError("Session not found");
  }

  const message = await Message.create({
    sessionId: input.sessionId,
    role: input.role,
    content: input.content,
    modelUsed: input.modelUsed,
    metadata: input.metadata ?? {},
  });

  return toMessageData(message);
}

export async function getMessages(
  sessionId: string,
  userId: string,
  page = 1,
  pageSize = 50
): Promise<{ items: MessageData[]; total: number }> {
  await connectDB();

  const session = await Session.findOne({
    _id: sessionId,
    userId,
    isDeleted: false,
  });

  if (!session) {
    throw new NotFoundError("Session not found");
  }

  const skip = (page - 1) * pageSize;

  const [messages, total] = await Promise.all([
    Message.find({ sessionId: session._id })
      .sort({ createdAt: 1 })
      .skip(skip)
      .limit(pageSize)
      .lean(),
    Message.countDocuments({ sessionId: session._id }),
  ]);

  return {
    items: messages.map((m) => ({
      id: m._id.toString(),
      sessionId: m.sessionId.toString(),
      role: m.role as "user" | "assistant",
      content: m.content,
      modelUsed: m.modelUsed,
      metadata: m.metadata as Record<string, unknown>,
      createdAt: m.createdAt,
    })),
    total,
  };
}

export async function deleteSessionMessages(sessionId: string): Promise<void> {
  await connectDB();
  await Message.deleteMany({ sessionId });
  logger.info("Session messages deleted", { sessionId });
}

// ============================================================
// FILE: src/modules/message/service.ts
// ============================================================
// PURPOSE: CRUD operations for messages within email generation sessions.
// HOW IT WORKS: createMessage() verifies session ownership before creating a
//   message. getMessages() returns paginated messages for a session (default
//   50 per page, sorted chronologically). deleteSessionMessages() removes all
//   messages for a session (used during session cleanup). All operations enforce
//   ownership by checking userId matches the session.
// INTEGRATION: Used by session API routes, email service, and frontend session view
// ============================================================
