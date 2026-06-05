import { z } from "zod";

export const generateEmailSchema = z.object({
  prompt: z
    .string()
    .min(10, "Prompt must be at least 10 characters")
    .max(5000, "Prompt cannot exceed 5000 characters"),
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
  modelId: z.enum(["deepseek", "nemotron"]).default("deepseek"),
  temperature: z.number().min(0).max(2).default(0.7),
  maxTokens: z.number().min(64).max(4096).default(1024),
  sessionId: z.string().optional(),
});

export type GenerateEmailInput = z.infer<typeof generateEmailSchema>;
