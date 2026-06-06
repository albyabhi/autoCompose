import mongoose, { Schema, Document } from "mongoose";
import type { EmailCategory } from "./email-template";
import { EMAIL_CATEGORIES } from "@/modules/email/categories";

export interface ISession extends Document {
  title: string;
  category: EmailCategory;
  userId: string;
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
