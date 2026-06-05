import { z } from "zod";

export const createSessionSchema = z.object({
  title: z
    .string()
    .min(1, "Title is required")
    .max(200, "Title cannot exceed 200 characters"),
  category: z
    .enum([
      "job_application",
      "leave_request",
      "sick_leave",
      "resignation",
      "complaint",
      "meeting_request",
      "custom",
    ])
    .default("custom"),
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
  modelId: z.enum(["deepseek", "nemotron"]).default("deepseek"),
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
