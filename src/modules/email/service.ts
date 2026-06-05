import { getAIProvider } from "@/modules/ai/factory";
import { ModelId } from "@/modules/ai/types";
import { EmailTemplate, IEmailTemplate } from "@/models/email-template";
import { Message } from "@/models/message";
import { AuditLog } from "@/models/audit-log";
import { Session } from "@/models/session";
import { connectDB } from "@/lib/db";
import { logger } from "@/lib/logger";
import { getProfile } from "@/modules/profile/service";
import { buildProfileContext } from "@/modules/profile/context-builder";
import { getMessageHistory } from "@/modules/session/service";
import { withUserId } from "@/lib/auth/ownership";

export interface GenerateEmailParams {
  prompt: string;
  category: string;
  modelId: ModelId;
  temperature?: number;
  maxTokens?: number;
  userId?: string;
  sessionId?: string;
  ip?: string;
  userAgent?: string;
}

export interface GenerateEmailResult {
  content: string;
  modelUsed: string;
  id: string;
  sessionId?: string;
}

export async function generateEmail(params: GenerateEmailParams): Promise<GenerateEmailResult> {
  const provider = getAIProvider();

  let sessionIdToUse = params.sessionId;

  logger.info("Generating email", {
    category: params.category,
    modelId: params.modelId,
    sessionId: sessionIdToUse,
  });

  let profileContext;
  let previousMessages;
  if (params.userId) {
    await connectDB();
    const profile = await getProfile(params.userId);
    profileContext = buildProfileContext(profile);

    if (!sessionIdToUse) {
      const count = await Session.countDocuments({ userId: params.userId, category: params.category, isDeleted: false });
      const formattedCategory = params.category.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
      const title = `${formattedCategory} ${count + 1}`;
      
      const newSession = await Session.create({
        title,
        category: params.category,
        userId: params.userId,
        metadata: {},
      });
      sessionIdToUse = newSession._id.toString();
    } else {
      previousMessages = await getMessageHistory(sessionIdToUse, params.userId);
    }
  }

  const response = await provider.complete({
    prompt: params.prompt,
    category: params.category,
    config: {
      modelId: params.modelId,
      temperature: params.temperature,
      maxTokens: params.maxTokens,
    },
    profileContext: profileContext ?? undefined,
    messages: previousMessages,
  });

  await connectDB();

  const template = await EmailTemplate.create(
    withUserId({
      category: params.category as IEmailTemplate["category"],
      prompt: params.prompt,
      generatedEmail: response.content,
      modelUsed: response.modelUsed,
    }, params.userId!)
  );

  if (sessionIdToUse && params.userId) {
    await Message.create([
      {
        sessionId: sessionIdToUse,
        role: "user",
        content: params.prompt,
        metadata: { category: params.category },
      },
      {
        sessionId: sessionIdToUse,
        role: "assistant",
        content: response.content,
        modelUsed: response.modelUsed,
        metadata: { usage: response.usage },
      },
    ]);
  }

  await AuditLog.create({
    action: "email.generated",
    entityType: "EmailTemplate",
    entityId: template._id.toString(),
    metadata: {
      modelUsed: response.modelUsed,
      category: params.category,
      usage: response.usage,
      userId: params.userId,
      sessionId: sessionIdToUse,
      profileInjected: !!profileContext,
    },
    userId: params.userId ?? undefined,
    ip: params.ip,
    userAgent: params.userAgent,
  });

  logger.info("Email generated successfully", {
    id: template._id.toString(),
    model: response.modelUsed,
    profileInjected: !!profileContext,
    sessionId: sessionIdToUse,
  });

  return {
    content: response.content,
    modelUsed: response.modelUsed,
    id: template._id.toString(),
    sessionId: sessionIdToUse,
  };
}
