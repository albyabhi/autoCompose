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
