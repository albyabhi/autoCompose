import mongoose, { Schema, Document, Types } from "mongoose";

export type MessageRole = "user" | "assistant";

export interface IMessage extends Document {
  sessionId: Types.ObjectId;
  role: MessageRole;
  content: string;
  modelUsed?: string;
  metadata: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

const messageSchema = new Schema<IMessage>(
  {
    sessionId: {
      type: Schema.Types.ObjectId,
      ref: "Session",
      required: [true, "Session ID is required"],
      index: true,
    },
    role: {
      type: String,
      enum: ["user", "assistant"],
      required: [true, "Role is required"],
    },
    content: {
      type: String,
      required: [true, "Content is required"],
    },
    modelUsed: {
      type: String,
    },
    metadata: {
      type: Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
  }
);

messageSchema.index({ sessionId: 1, createdAt: 1 });

export const Message =
  mongoose.models.Message ??
  mongoose.model<IMessage>("Message", messageSchema);

// ============================================================
// FILE: src/models/message.ts
// ============================================================
// PURPOSE: Individual chat messages within a session — the conversation history between user and AI.
// HOW IT WORKS: Mongoose schema for the Message collection. Each message belongs to one Session (sessionId). Fields:
//   - sessionId: Reference to Session (indexed).
//   - role: "user" (the prompt) or "assistant" (AI response).
//   - content: Full text of the message.
//   - modelUsed: Which AI model generated this response (only for assistant messages).
//   - metadata: Flexible — for assistant messages, stores usage (tokens, duration).
//   Index: sessionId+createdAt for chronological retrieval (used by getMessageHistory in session service).
//   Messages are created in pairs: user prompt + assistant response.
// FIELDS: sessionId, role, content, modelUsed, metadata, createdAt, updatedAt.
// INTEGRATION: Session service (getMessageHistory for AI context), email service (creates message pairs), session view UI (displays conversation), message API routes.
// ============================================================
