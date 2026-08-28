import mongoose, { Schema, Document, Types } from "mongoose";
import { EMAIL_CATEGORIES, type EmailCategory } from "@/modules/email/categories";
import { MODEL_IDS_KEYS, type ModelId } from "@/modules/ai/types";

export type ScheduledEmailSourceType = "single" | "batch";
export type ScheduledEmailDeliveryState =
  | "awaiting_content"
  | "ready"
  | "sending"
  | "sent"
  | "failed";

export interface IScheduledEmail extends Document {
  scheduleId: Types.ObjectId;
  userId: string;
  sourceType: ScheduledEmailSourceType;
  sourceSessionId?: Types.ObjectId;
  sourceMessageId?: Types.ObjectId;
  sourceBulkEntryId?: Types.ObjectId;
  to: string;
  subject?: string;
  body?: string;
  category?: EmailCategory;
  prompt?: string;
  modelId?: ModelId;
  deliveryState: ScheduledEmailDeliveryState;
  claimedAt?: Date;
  sentAt?: Date;
  errorCode?: string;
  errorMessage?: string;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

const scheduledEmailSchema = new Schema<IScheduledEmail>(
  {
    scheduleId: {
      type: Schema.Types.ObjectId,
      ref: "Schedule",
      required: [true, "Schedule ID is required"],
      index: true,
    },
    userId: {
      type: String,
      required: [true, "User ID is required"],
      index: true,
    },
    sourceType: {
      type: String,
      enum: ["single", "batch"],
      required: [true, "Source type is required"],
    },
    sourceSessionId: { type: Schema.Types.ObjectId, ref: "Session" },
    sourceMessageId: { type: Schema.Types.ObjectId, ref: "Message" },
    sourceBulkEntryId: { type: Schema.Types.ObjectId, ref: "BulkEntry" },
    to: {
      type: String,
      required: [true, "Recipient is required"],
      maxlength: [320, "Recipient is too long"],
    },
    subject: { type: String, maxlength: [200, "Subject cannot exceed 200 characters"] },
    body: { type: String, maxlength: [20000, "Body cannot exceed 20000 characters"] },
    category: { type: String, enum: EMAIL_CATEGORIES },
    prompt: { type: String, maxlength: [5000, "Prompt cannot exceed 5000 characters"] },
    modelId: { type: String, enum: MODEL_IDS_KEYS },
    deliveryState: {
      type: String,
      enum: ["awaiting_content", "ready", "sending", "sent", "failed"],
      default: "ready",
      index: true,
    },
    claimedAt: { type: Date },
    sentAt: { type: Date },
    errorCode: { type: String },
    errorMessage: { type: String },
    sortOrder: { type: Number, default: 0 },
  },
  { timestamps: true }
);

scheduledEmailSchema.index({ scheduleId: 1, sortOrder: 1 });
scheduledEmailSchema.index({ userId: 1, deliveryState: 1 });
scheduledEmailSchema.index(
  { scheduleId: 1, sourceBulkEntryId: 1 },
  {
    unique: true,
    partialFilterExpression: {
      sourceType: "batch",
      sourceBulkEntryId: { $exists: true },
    },
  }
);
scheduledEmailSchema.index(
  { scheduleId: 1, sourceMessageId: 1 },
  { sparse: true }
);

export const ScheduledEmail =
  mongoose.models.ScheduledEmail ??
  mongoose.model<IScheduledEmail>("ScheduledEmail", scheduledEmailSchema);

// Sync indexes to drop old unique sparse indexes that treated missing fields as duplicate keys.
if (process.env.NODE_ENV !== "production") {
  ScheduledEmail.syncIndexes().catch((error) =>
    console.error("[scheduled-email] syncIndexes failed:", error)
  );
}

// ============================================================
// FILE: src/models/scheduled-email.ts
// ============================================================
// PURPOSE: One email within a scheduled campaign — a durable snapshot that can be generated later by the cron job and sent exactly once.
// HOW IT WORKS: Mongoose schema for the ScheduledEmail collection. Each belongs to one Schedule (scheduleId) and one user (userId).
//   SOURCE TRACEABILITY: sourceType ("single" = composed individually, "batch" = from bulk entry) + sourceSessionId / sourceMessageId / sourceBulkEntryId link back to the original composition.
//   CONTENT: to (recipient, required), subject, body (both optional until generated), category, prompt, modelId (for AI generation if needed).
//   DELIVERY STATE MACHINE: "awaiting_content" (needs AI generation) -> "ready" (has subject+body) -> "sending" (claimed by cron, prevents duplicates) -> "sent" (success) OR "failed" (errorCode, errorMessage). claimedAt timestamps the claim.
//   sortOrder: Display/send order within the schedule.
//   Unique index on scheduleId+sourceBulkEntryId (for batch deduplication). Sparse index on scheduleId+sourceMessageId (for single deduplication).
//   Indexes: scheduleId+sortOrder (ordered fetch), userId+deliveryState (user queries), unique compound for batch deduplication.
// FIELDS: scheduleId, userId, sourceType, sourceSessionId, sourceMessageId, sourceBulkEntryId, to, subject, body, category, prompt, modelId, deliveryState, claimedAt, sentAt, errorCode, errorMessage, sortOrder, createdAt, updatedAt.
// INTEGRATION: Schedule service (CRUD, cron processor), Schedule model (parent), BulkEntry/Session/Message models (source references), cron route.
// ============================================================
