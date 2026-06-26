import { z } from "zod";
import { MODEL_IDS_KEYS } from "@/modules/ai/types";
import { EMAIL_CATEGORIES } from "./categories";

export const generateEmailSchema = z.object({
  prompt: z
    .string()
    .min(10, "Prompt must be at least 10 characters")
    .max(5000, "Prompt cannot exceed 5000 characters"),
  category: z.enum(EMAIL_CATEGORIES).default("custom"),
  modelId: z.enum(MODEL_IDS_KEYS).default("deepseek"),
  temperature: z.number().min(0).max(2).default(0.7),
  maxTokens: z.number().min(64).max(4096).default(1024),
  sessionId: z.string().optional(),
  tone: z.enum(["formal", "semi-formal", "casual"]).optional(),
});

export const sendEmailSchema = z.object({
  to: z.string().email("Recipient must be a valid email"),
  subject: z.string().min(1, "Subject is required").max(200, "Subject cannot exceed 200 characters"),
  body: z.string().min(1, "Body is required").max(20000, "Body cannot exceed 20000 characters"),
});

export type GenerateEmailInput = z.infer<typeof generateEmailSchema>;
export type SendEmailInput = z.infer<typeof sendEmailSchema>;

// ============================================================
// FILE: src/modules/email/validation.ts
// ============================================================
// PURPOSE: Zod schemas for validating email generation and sending inputs.
// HOW IT WORKS: generateEmailSchema validates the prompt (10-5000 chars),
//   category (must be one of 7 types, defaults to "custom"), modelId
//   (must be a valid model key, defaults to "deepseek"), temperature
//   (0-2, default 0.7), maxTokens (64-4096, default 1024), and optional
//   sessionId. sendEmailSchema validates recipient email, subject (1-200
//   chars), and body (1-20000 chars). Types are inferred for use elsewhere.
// INTEGRATION: Used by API routes (generate, send-email) for request validation
// ============================================================
