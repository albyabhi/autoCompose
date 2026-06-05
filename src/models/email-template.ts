import mongoose, { Schema, Document } from "mongoose";

export type EmailCategory =
  | "job_application"
  | "leave_request"
  | "sick_leave"
  | "resignation"
  | "complaint"
  | "meeting_request"
  | "custom";

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
      enum: [
        "job_application",
        "leave_request",
        "sick_leave",
        "resignation",
        "complaint",
        "meeting_request",
        "custom",
      ],
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
