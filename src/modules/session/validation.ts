import { z } from "zod";
import { MODEL_IDS_KEYS, DEFAULT_MODEL_ID } from "@/modules/ai/types";
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
  modelId: z.enum(MODEL_IDS_KEYS).default(DEFAULT_MODEL_ID),
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
// PURPOSE: Input validation rules for session operations — ensures users can't create sessions with invalid data.
// HOW IT WORKS: Zod schemas for each session operation:
//   - createSessionSchema: Requires title (1-200 chars), category from 7 email types (defaults to "custom"), optional metadata object.
//   - updateSessionSchema: Partial update — title optional (1-200 if provided), metadata optional.
//   - addMessageSchema: For adding a message to a session — prompt required (1-5000 chars), modelId from registered AI models (defaults to DEFAULT_MODEL_ID), optional temperature (0-2) and maxTokens (64-4096).
//   - listSessionsSchema: Pagination — page (min 1), pageSize (1-100), search string (max 200), isArchived boolean (with string-to-boolean coercion for query params).
//   All schemas export TypeScript types for type-safe service calls.
// INTEGRATION: Used by session API routes (src/app/api/sessions/**/route.ts) before calling session service (src/modules/session/service.ts). Email categories from src/modules/email/categories.ts, AI model IDs from src/modules/ai/types.ts.
// ============================================================
