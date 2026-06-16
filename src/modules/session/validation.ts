import { z } from "zod";
import { MODEL_IDS_KEYS } from "@/modules/ai/types";
import { EMAIL_CATEGORIES } from "@/modules/email/categories";

export const createSessionSchema = z.object({
  title: z
    .string()
    .min(1, "Title is required")
    .max(200, "Title cannot exceed 200 characters"),
  category: z.enum(EMAIL_CATEGORIES).default("custom"),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const updateSessionSchema = z.object({
  title: z
    .string()
    .min(1, "Title is required")
    .max(200, "Title cannot exceed 200 characters")
    .optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const addMessageSchema = z.object({
  prompt: z
    .string()
    .min(1, "Prompt is required")
    .max(5000, "Prompt cannot exceed 5000 characters"),
  modelId: z.enum(MODEL_IDS_KEYS).default("deepseek"),
  temperature: z.number().min(0).max(2).optional(),
  maxTokens: z.number().min(64).max(4096).optional(),
});

export const listSessionsSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().max(200).optional(),
  isArchived: z.preprocess((val) => val === undefined ? undefined : (val === 'true' || val === true), z.boolean().optional()),
});

export type CreateSessionInput = z.infer<typeof createSessionSchema>;
export type UpdateSessionInput = z.infer<typeof updateSessionSchema>;
export type AddMessageInput = z.infer<typeof addMessageSchema>;
export type ListSessionsInput = z.infer<typeof listSessionsSchema>;

// ============================================================
// FILE: src/modules/session/validation.ts
// ============================================================
// PURPOSE: Zod schemas for validating session CRUD and list inputs.
// HOW IT WORKS: createSessionSchema requires title (1-200 chars) and category
//   (defaults to "custom"). updateSessionSchema makes title optional.
//   addMessageSchema validates prompt (1-5000 chars), modelId, and optional
//   temperature/maxTokens. listSessionsSchema handles pagination (page,
//   pageSize 1-100), search, and isArchived with type coercion for query params.
// INTEGRATION: Used by session API routes and service functions
// ============================================================
