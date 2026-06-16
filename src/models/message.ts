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
// PURPOSE: Mongoose schema for individual messages within an email generation session.
// HOW IT WORKS: Each message has a role (user or assistant), content text,
//   optional modelUsed field, and metadata. Messages are linked to a session
//   via sessionId. The compound index on sessionId+createdAt enables efficient
//   chronological retrieval for conversation history display.
// FIELDS: sessionId (ref to Session), role, content, modelUsed, metadata
// INTEGRATION: Used by message service for CRUD, loaded by session view for display
// ============================================================
