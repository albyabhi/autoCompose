import { z } from "zod";
import { EMAIL_CATEGORIES } from "@/modules/email/categories";
import { MODEL_IDS_KEYS } from "@/modules/ai/types";

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
  modelId: z.enum(MODEL_IDS_KEYS).default("deepseek"),
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
