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
});

export type GenerateEmailInput = z.infer<typeof generateEmailSchema>;
