import "server-only";
import { generateEmail, GenerateEmailResult } from "@/modules/email/service";
import { EmailCategory } from "@/modules/email/categories";
import { ModelId } from "@/modules/ai/types";
import { checkRateLimit } from "@/lib/rate-limit";
import { recordAudit } from "@/lib/audit";
import { logger } from "@/lib/logger";

export interface TelegramGenerateParams {
  userId: string;
  prompt: string;
  category: EmailCategory;
  modelId: ModelId;
  sessionId?: string;
}

export async function generateFromTelegram(params: TelegramGenerateParams): Promise<GenerateEmailResult> {
  checkRateLimit(`telegram:generate:${params.userId}`, { maxRequests: 20, windowMs: 60 * 60 * 1000 });

  const result = await generateEmail({
    prompt: params.prompt,
    category: params.category,
    modelId: params.modelId,
    userId: params.userId,
    sessionId: params.sessionId,
    userAgent: "telegram-bot",
  });

  await recordAudit({
    action: "telegram.email_generated",
    entityType: "EmailTemplate",
    entityId: result.id,
    userId: params.userId,
    metadata: {
      sessionId: result.sessionId,
      modelUsed: result.modelUsed,
      category: params.category,
      source: "telegram",
    },
  });

  logger.info("Telegram email generated", {
    userId: params.userId,
    templateId: result.id,
    model: result.modelUsed,
  });

  return result;
}

// ============================================================
// FILE: src/modules/telegram/ai-bridge.ts
// ============================================================
// PURPOSE: Connects the Telegram bot to the core email generation engine — applies Telegram-specific limits and logging, then calls the shared generateEmail() service.
// HOW IT WORKS: generateFromTelegram() is a thin wrapper that:
//   1. Rate limits: 20 AI generations per hour per user (prevents abuse via Telegram).
//   2. Calls generateEmail() (src/modules/email/service.ts) with the user's prompt, category, model, userId, and sessionId. Sets userAgent="telegram-bot" so audit logs know the source.
//   3. Records a "telegram.email_generated" audit entry with template ID, model, category, session ID.
//   4. Logs success and returns the result (content, modelUsed, templateId, sessionId, assistantMessageId).
//   This keeps Telegram-specific concerns (rate limits, audit source) separate from the core email generation logic which is shared with web UI, schedules, and bulk.
// INTEGRATION: Email service (generateEmail), rate limiter (src/lib/rate-limit.ts), audit logger (src/lib/audit.ts). Called by compose flow (src/modules/telegram/flows/compose.ts).
// ============================================================
