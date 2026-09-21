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
// PURPOSE: Stores every AI-generated email as a permanent record — the user's generation history.
// HOW IT WORKS: Mongoose schema for the EmailTemplate collection. Created by email service after each generation. Fields:
//   - category: Email type (job_application, leave_request, etc.).
//   - prompt: User's original instructions (max 5000 chars).
//   - generatedEmail: Full AI response (subject + body).
//   - modelUsed: Which AI model generated it (e.g., "openai/gpt-oss-20b").
//   - userId: Owner (optional for legacy, indexed for user history).
//   - metadata: Flexible extra data.
//   Indexes: createdAt (recent first), userId+createdAt (user's history).
//   This is separate from Session/Message — it's a flat history of all generations across all sessions.
// FIELDS: category, prompt, generatedEmail, modelUsed, userId, metadata, createdAt, updatedAt.
// INTEGRATION: Email service (stores results), audit logging (references templateId), potential future "regenerate from history" feature.
// ============================================================
