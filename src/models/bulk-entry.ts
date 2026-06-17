import mongoose, { Schema, Document } from "mongoose";
import { EMAIL_CATEGORIES, type EmailCategory } from "@/modules/email/categories";

export type BulkEntryStatus =
  | "pending"
  | "generating"
  | "generated"
  | "failed"
  | "sending"
  | "sent";

export interface IBulkEntry extends Document {
  sessionId: mongoose.Types.ObjectId;
  userId: string;
  category: EmailCategory;
  prompt: string;
  recipient: string;
  status: BulkEntryStatus;
  generatedContent?: string;
  subject?: string;
  modelUsed?: string;
  errorMessage?: string;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

const bulkEntrySchema = new Schema<IBulkEntry>(
  {
    sessionId: {
      type: Schema.Types.ObjectId,
      ref: "Session",
      required: [true, "Session ID is required"],
      index: true,
    },
    userId: {
      type: String,
      required: [true, "User ID is required"],
      index: true,
    },
    category: {
      type: String,
      enum: EMAIL_CATEGORIES,
      required: [true, "Category is required"],
      default: "custom",
    },
    prompt: {
      type: String,
      default: "",
      maxlength: [5000, "Prompt cannot exceed 5000 characters"],
    },
    recipient: {
      type: String,
      default: "",
    },
    status: {
      type: String,
      enum: ["pending", "generating", "generated", "failed", "sending", "sent"],
      default: "pending",
    },
    generatedContent: { type: String },
    subject: { type: String },
    modelUsed: { type: String },
    errorMessage: { type: String },
    sortOrder: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

bulkEntrySchema.index({ sessionId: 1, sortOrder: 1 });
bulkEntrySchema.index({ userId: 1, status: 1 });

export const BulkEntry =
  mongoose.models.BulkEntry ??
  mongoose.model<IBulkEntry>("BulkEntry", bulkEntrySchema);
