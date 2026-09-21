import { z } from "zod";
import { EMAIL_CATEGORIES } from "@/modules/email/categories";
import { MODEL_IDS_KEYS, DEFAULT_MODEL_ID } from "@/modules/ai/types";

export const baseEntrySchema = z.object({
  category: z.enum(EMAIL_CATEGORIES).default("custom"),
  prompt: z.string().max(5000, "Prompt cannot exceed 5000 characters").default(""),
  recipient: z.string().max(320, "Recipient too long").default(""),
});

export const createEntrySchema = z.object({
  sessionId: z.string().min(1, "Session ID is required"),
  category: z.enum(EMAIL_CATEGORIES).default("custom"),
  prompt: z.string().max(5000, "Prompt cannot exceed 5000 characters").default(""),
  recipient: z.string().max(320, "Recipient too long").default(""),
});

export const createEntriesSchema = z.object({
  sessionId: z.string().min(1, "Session ID is required"),
  entries: z
    .array(baseEntrySchema)
    .min(1, "At least one entry is required"),
});

export const updateEntrySchema = z.object({
  category: z.enum(EMAIL_CATEGORIES).optional(),
  prompt: z
    .string()
    .min(10, "Prompt must be at least 10 characters")
    .max(5000, "Prompt cannot exceed 5000 characters")
    .optional(),
  recipient: z.string().email("Recipient must be a valid email").optional(),
});

export const generateEntrySchema = z.object({
  entryId: z.string().min(1, "Entry ID is required"),
  modelId: z.enum(MODEL_IDS_KEYS).default(DEFAULT_MODEL_ID),
});

export const sendEntrySchema = z.object({
  entryId: z.string().min(1, "Entry ID is required"),
});

export const batchUpdateSchema = z.object({
  sessionId: z.string().min(1, "Session ID is required"),
  category: z.enum(EMAIL_CATEGORIES),
});

export const listEntriesSchema = z.object({
  sessionId: z.string().min(1, "Session ID is required"),
});

export type CreateEntryInput = z.infer<typeof createEntrySchema>;
export type CreateEntriesInput = z.infer<typeof createEntriesSchema>;
export type UpdateEntryInput = z.infer<typeof updateEntrySchema>;
export type GenerateEntryInput = z.infer<typeof generateEntrySchema>;
export type SendEntryInput = z.infer<typeof sendEntrySchema>;

// ============================================================
// FILE: src/modules/bulk/validation.ts
// ============================================================
// PURPOSE: Input validation schemas for all bulk email operations — ensures users can't create invalid batch entries.
// HOW IT WORKS: Zod schemas for each bulk operation:
//   - baseEntrySchema: Common fields — category (defaults to "custom"), prompt (max 5000 chars), recipient (max 320 chars).
//   - createEntrySchema: Single entry creation — requires sessionId + base fields.
//   - createEntriesSchema: Bulk creation — requires sessionId + array of entries (at least 1).
//   - updateEntrySchema: Partial updates — optional category, prompt (10-5000 chars if provided), recipient (must be valid email if provided). Only allowed on pending/failed entries.
//   - generateEntrySchema: AI generation — requires entryId, optional modelId (defaults to DEFAULT_MODEL_ID).
//   - sendEntrySchema: Sending — requires entryId.
//   - batchUpdateSchema: Change category for all entries in a session — requires sessionId + category.
//   - listEntriesSchema: List entries — requires sessionId.
//   All schemas export TypeScript types (CreateEntryInput, etc.) for type-safe service calls.
// INTEGRATION: Used by batch API routes (src/app/api/batch/**/route.ts) before calling bulk service (src/modules/bulk/service.ts).
// ============================================================
