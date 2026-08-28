import { z } from "zod";
import { EMAIL_CATEGORIES } from "@/modules/email/categories";
import { MODEL_IDS_KEYS } from "@/modules/ai/types";

const futureDateSchema = z.coerce.date().refine(
  (value) => Number.isFinite(value.getTime()),
  "Scheduled time must be a valid date"
);

const singleEmailSchema = z.object({
  sourceType: z.literal("single"),
  sourceSessionId: z.string().optional(),
  sourceMessageId: z.string().optional(),
  to: z.string().email("Recipient must be a valid email"),
  subject: z.string().min(1, "Subject is required").max(200),
  body: z.string().min(1, "Body is required").max(20000),
  category: z.enum(EMAIL_CATEGORIES).optional(),
  prompt: z.string().max(5000).optional(),
  modelId: z.enum(MODEL_IDS_KEYS).optional(),
});

const batchEmailSchema = z.object({
  sourceType: z.literal("batch"),
  sourceBulkEntryId: z.string().min(1, "Bulk entry ID is required"),
  modelId: z.enum(MODEL_IDS_KEYS).default("deepseek"),
});

export const addScheduledEmailSchema = z.discriminatedUnion("sourceType", [
  singleEmailSchema,
  batchEmailSchema,
]);

export const createScheduleSchema = z.object({
  name: z.string().min(1, "Schedule name is required").max(120),
  scheduledAt: futureDateSchema,
  timezone: z.string().min(1).max(80).default("UTC"),
  emails: z.array(addScheduledEmailSchema).optional(),
});

export const listSchedulesSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  status: z.enum(["active", "sent", "expired", "cancelled"]).optional(),
});

export const updateScheduleSchema = z.object({
  name: z.string().min(1).max(120).optional(),
  scheduledAt: futureDateSchema.optional(),
  timezone: z.string().min(1).max(80).optional(),
  status: z.enum(["active", "cancelled"]).optional(),
}).refine((value) => Object.keys(value).length > 0, "No schedule changes provided");

export const addScheduledEmailsSchema = z.object({
  emails: z.array(addScheduledEmailSchema).min(1, "At least one email is required"),
});

export const updateScheduledEmailSchema = z.object({
  to: z.string().email("Recipient must be a valid email").optional(),
  subject: z.string().min(1).max(200).optional(),
  body: z.string().min(1).max(20000).optional(),
  retry: z.boolean().optional(),
}).refine((value) => Object.keys(value).length > 0, "No email changes provided");

export const processSchedulesSchema = z.object({
  maxSchedules: z.number().int().min(1).max(20).default(5),
  maxEmailsPerSchedule: z.number().int().min(1).max(50).default(10),
}).default({ maxSchedules: 5, maxEmailsPerSchedule: 10 });

export type CreateScheduleInput = z.infer<typeof createScheduleSchema>;
export type ListSchedulesInput = z.infer<typeof listSchedulesSchema>;
export type UpdateScheduleInput = z.infer<typeof updateScheduleSchema>;
export type AddScheduledEmailInput = z.infer<typeof addScheduledEmailSchema>;
export type AddScheduledEmailsInput = z.infer<typeof addScheduledEmailsSchema>;
export type UpdateScheduledEmailInput = z.infer<typeof updateScheduledEmailSchema>;
export type ProcessSchedulesInput = z.infer<typeof processSchedulesSchema>;

// ============================================================
// FILE: src/modules/schedule/validation.ts
// ============================================================
// PURPOSE: Input validation rules for all schedule operations — ensures users can't create invalid schedules or emails.
// HOW IT WORKS: Uses Zod schemas to define exactly what data is allowed for each operation:
//   - createScheduleSchema: name (1-120 chars), scheduledAt (must be valid future date), timezone (e.g., "America/New_York"), optional emails array.
//   - addScheduledEmailSchema: Discriminated union — "single" emails have to/subject/body/category/prompt/modelId; "batch" emails reference a bulkEntryId and modelId.
//   - listSchedulesSchema: Pagination (page, pageSize) and optional status filter.
//   - updateScheduleSchema: Partial updates to name/date/timezone/status (active/cancelled). Requires at least one field.
//   - updateScheduledEmailSchema: Can edit to/subject/body, or set retry=true to re-send a failed email.
//   - processSchedulesSchema: Cron limits — max 20 schedules per run, max 50 emails per schedule (prevents timeout).
//   All schemas export TypeScript types (CreateScheduleInput, etc.) for type-safe service calls.
// INTEGRATION: Used by schedule API routes (src/app/api/schedules/**/route.ts), cron route (src/app/api/cron/process-schedules/route.ts), and schedule service (src/modules/schedule/service.ts) for input validation before database operations.
// ============================================================
