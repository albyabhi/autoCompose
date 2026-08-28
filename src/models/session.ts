import mongoose, { Schema, Document } from "mongoose";
import type { EmailCategory } from "./email-template";
import { EMAIL_CATEGORIES } from "@/modules/email/categories";

export type SessionType = "single" | "batch";

export interface ISession extends Document {
  title: string;
  category: EmailCategory;
  userId: string;
  type: SessionType;
  metadata: Record<string, unknown>;
  isArchived: boolean;
  isDeleted: boolean;
  deletedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const sessionSchema = new Schema<ISession>(
  {
    title: {
      type: String,
      required: [true, "Title is required"],
      maxlength: [200, "Title cannot exceed 200 characters"],
    },
    type: {
      type: String,
      enum: ["single", "batch"],
      default: "single",
    },
    category: {
      type: String,
      enum: EMAIL_CATEGORIES,
      default: "custom",
    },
    userId: {
      type: String,
      required: [true, "User ID is required"],
      index: true,
    },
    metadata: {
      type: Schema.Types.Mixed,
      default: {},
    },
    isArchived: {
      type: Boolean,
      default: false,
      index: true,
    },
    isDeleted: {
      type: Boolean,
      default: false,
      index: true,
    },
    deletedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

sessionSchema.index({ userId: 1, isDeleted: 1, createdAt: -1 });
sessionSchema.index({ userId: 1, isArchived: 1, createdAt: -1 });
sessionSchema.index({ title: "text", "metadata.tags": "text" });

export const Session =
  mongoose.models.Session ??
  mongoose.model<ISession>("Session", sessionSchema);

// ============================================================
// FILE: src/models/session.ts
// ============================================================
// PURPOSE: Represents a conversation thread for email generation — groups related messages (user prompts + AI responses) under one topic.
// HOW IT WORKS: Mongoose schema for the Session collection. Each user can have many sessions. Fields:
//   - title: Human-readable name (e.g., "Job Application 3"). Max 200 chars.
//   - category: One of 7 email types (job_application, leave_request, sick_leave, resignation, complaint, meeting_request, custom). Default "custom".
//   - type: "single" (one-off email) or "batch" (bulk campaign).
//   - userId: Owner — indexed for fast user-scoped queries.
//   - metadata: Flexible object for extra data (tags, etc.).
//   - isArchived: Hidden from default list but not deleted.
//   - isDeleted: Soft delete — hidden from lists, data preserved.
//   - deletedAt: Timestamp when soft-deleted.
//   Indexes: userId+isDeleted+createdAt (main list), userId+isArchived+createdAt (archive list), text index on title+metadata.tags (search).
//   Messages are stored separately in the Message collection with sessionId reference.
// FIELDS: title, category, userId, type, metadata, isArchived, isDeleted, deletedAt, createdAt, updatedAt.
// INTEGRATION: Session service (CRUD), Message model (messages belong to session), email service (creates sessions for new conversations), session list UI, session API routes.
// ============================================================
