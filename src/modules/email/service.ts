import { getAIProvider } from "@/modules/ai/factory";
import { ModelId, FormalityLevel } from "@/modules/ai/types";
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
import { boundConversationHistory } from "@/modules/session/history-budget";
import { resolveGenerationCategory, type EmailCategory } from "./categories";

export interface GenerateEmailParams {
  prompt: string;
  category: EmailCategory;
  modelId: ModelId;
  temperature?: number;
  maxTokens?: number;
  userId?: string;
  sessionId?: string;
  ip?: string;
  userAgent?: string;
  tone?: FormalityLevel;
}

export interface GenerateEmailResult {
  content: string;
  modelUsed: string;
  id: string;
  sessionId?: string;
  assistantMessageId?: string;
}

export async function generateEmail(params: GenerateEmailParams): Promise<GenerateEmailResult> {
  const provider = getAIProvider();

  let sessionIdToUse = params.sessionId;
  let category = params.category;

  logger.info("Generating email", {
    category,
    modelId: params.modelId,
    sessionId: sessionIdToUse,
  });

  let profileContext;
  let previousMessages: { role: "user" | "assistant"; content: string }[] = [];
  let historyCharacterCount = 0;
  if (params.userId) {
    await connectDB();

    if (sessionIdToUse) {
      const session = await Session.findOne({
        _id: sessionIdToUse,
        userId: params.userId,
        isDeleted: false,
      }).select("category").lean();
      if (!session) {
        const { NotFoundError } = await import("@/lib/errors");
        throw new NotFoundError("Session not found");
      }
      category = resolveGenerationCategory(category, session.category);
    }

    const profile = await getProfile(params.userId);
    profileContext = buildProfileContext(profile, category, params.prompt, undefined, params.tone);

    if (!sessionIdToUse) {
      const count = await Session.countDocuments({ userId: params.userId, category, isDeleted: false });
      const formattedCategory = category.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
      const title = `${formattedCategory} ${count + 1}`;
      
      const newSession = await Session.create({
        title,
        category,
        userId: params.userId,
        metadata: {},
      });
      sessionIdToUse = newSession._id.toString();
    } else {
      const boundedHistory = boundConversationHistory(await getMessageHistory(sessionIdToUse, params.userId));
      previousMessages = boundedHistory.messages;
      historyCharacterCount = boundedHistory.characterCount;
    }
  }

  const response = await provider.complete({
    prompt: params.prompt,
    category,
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
      category: category as IEmailTemplate["category"],
      prompt: params.prompt,
      generatedEmail: response.content,
      modelUsed: response.modelUsed,
    }, params.userId!)
  );

  let assistantMessageId: string | undefined;
  if (sessionIdToUse && params.userId) {
    const messages = await Message.create([
      {
        sessionId: sessionIdToUse,
        role: "user",
        content: params.prompt,
        metadata: { category },
      },
      {
        sessionId: sessionIdToUse,
        role: "assistant",
        content: response.content,
        modelUsed: response.modelUsed,
        metadata: { usage: response.usage },
      },
    ]);
    assistantMessageId = messages[1]?._id.toString();
  }

  await AuditLog.create({
    action: "email.generated",
    entityType: "EmailTemplate",
    entityId: template._id.toString(),
    metadata: {
      modelUsed: response.modelUsed,
      category,
      usage: response.usage,
      providerDurationMs: response.durationMs,
      userId: params.userId,
      sessionId: sessionIdToUse,
      profileInjected: !!profileContext,
      profileSections: profileContext?.selectedSections ?? [],
      profileCharacters: profileContext?.characterCount ?? 0,
      historyMessages: previousMessages?.length ?? 0,
      historyCharacters: historyCharacterCount,
    },
    userId: params.userId ?? undefined,
    ip: params.ip,
    userAgent: params.userAgent,
  });

  logger.info("Email generated successfully", {
    id: template._id.toString(),
    model: response.modelUsed,
    profileInjected: !!profileContext,
    profileSections: profileContext?.selectedSections ?? [],
    profileCharacters: profileContext?.characterCount ?? 0,
    historyMessages: previousMessages?.length ?? 0,
    historyCharacters: historyCharacterCount,
    providerDurationMs: response.durationMs,
    sessionId: sessionIdToUse,
  });

  return {
    content: response.content,
    modelUsed: response.modelUsed,
    id: template._id.toString(),
    sessionId: sessionIdToUse,
    assistantMessageId,
  };
}

// ============================================================
// FILE: src/modules/email/service.ts
// ============================================================
// PURPOSE: The main engine that turns a user's prompt into a polished, personalized email using AI.
// HOW IT WORKS: generateEmail() orchestrates the entire flow in one function:
//   1. Category resolution: If the request is part of an existing conversation (session), the session's category overrides the request category.
//   2. Profile context: Loads the user's profile and builds AI context using only the sections relevant to the email category (e.g., job_application uses personal + professional + resume; sick_leave uses only personal + professional).
//   3. Conversation history: For existing sessions, loads the last 8 messages (max 6000 characters) so the AI remembers context. For new sessions, creates one with an auto-generated title like "Job Application 3".
//   4. AI generation: Calls the AI provider (NVIDIA NIM via factory) with system prompt + history + user prompt + profile context.
//   5. Persistence: Saves the generated email as an EmailTemplate record, saves both user prompt and AI response as Message records linked to the session.
//   6. Audit logging: Records a detailed audit entry with model used, category, token usage, profile sections injected, history size.
//   Returns the email content, model used, template ID, session ID, and assistant message ID.
// INTEGRATION: AI provider factory (src/modules/ai/factory.ts), Profile model + context builder (src/modules/profile/), Session/Message/EmailTemplate models, history budget (src/modules/session/history-budget.ts), audit logging (src/lib/audit.ts), ownership filter (src/lib/auth/ownership.ts), categories (src/modules/email/categories.ts).
// ============================================================
