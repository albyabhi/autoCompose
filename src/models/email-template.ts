import mongoose, { Schema, Document } from "mongoose";
import { EMAIL_CATEGORIES, type EmailCategory } from "@/modules/email/categories";
export type { EmailCategory } from "@/modules/email/categories";

export interface IEmailTemplate extends Document {
  category: EmailCategory;
  prompt: string;
  generatedEmail: string;
  modelUsed: string;
  userId?: string;
  metadata: Record<string, string>;
  createdAt: Date;
  updatedAt: Date;
}

const emailTemplateSchema = new Schema<IEmailTemplate>(
  {
    category: {
      type: String,
      enum: EMAIL_CATEGORIES,
      required: [true, "Category is required"],
      index: true,
    },
    prompt: {
      type: String,
      required: [true, "Prompt is required"],
      maxlength: [5000, "Prompt cannot exceed 5000 characters"],
    },
    generatedEmail: {
      type: String,
      required: [true, "Generated email is required"],
    },
    modelUsed: {
      type: String,
      required: [true, "Model used is required"],
    },
    userId: {
      type: String,
      index: true,
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

emailTemplateSchema.index({ createdAt: -1 });
emailTemplateSchema.index({ userId: 1, createdAt: -1 });

export const EmailTemplate =
  mongoose.models.EmailTemplate ??
  mongoose.model<IEmailTemplate>("EmailTemplate", emailTemplateSchema);

// ============================================================
// FILE: src/models/email-template.ts
// ============================================================
// PURPOSE: Mongoose schema for storing generated email templates/history.
// HOW IT WORKS: Records each generated email with its category, original prompt,
//   generated content, model used, and optional userId. Provides an audit trail
//   of all email generations. Indexes on createdAt and userId+createdAt support
//   retrieval of recent templates and user-specific history.
// FIELDS: category, prompt, generatedEmail, modelUsed, userId, metadata
// INTEGRATION: Used by email service to store generation results
// ============================================================
