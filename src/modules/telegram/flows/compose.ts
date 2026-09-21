import "server-only";
import { Context } from "grammy";
import { connectDB } from "@/lib/db";
import { User } from "@/models/user";
import { Profile } from "@/models/profile";
import { ModelId, MODEL_LABELS, DEFAULT_MODEL_ID } from "@/modules/ai/types";
import { isEmailCategory, EmailCategory } from "@/modules/email/categories";
import { generateFromTelegram } from "@/modules/telegram/ai-bridge";
import { saveState, loadStateForUser, clearState } from "@/modules/telegram/state";
import { categoryKeyboard, reviewKeyboard, mainMenuKeyboard } from "@/modules/telegram/keyboards";
import { cleanAIContent, extractSubject, stripSubjectLine, extractEmailFromText } from "@/modules/email/content";
import { describeCategoryLabel, TELEGRAM_MAX_MESSAGE } from "@/modules/telegram/renderer";
import { replyHtml, editHtml, answerCb } from "@/modules/telegram/reply";
import { T } from "@/modules/telegram/text-constants";
import { recordAudit } from "@/lib/audit";
import { logger } from "@/lib/logger";
import { AppError } from "@/lib/errors";

function defaultModelForUser(profile: { preferences?: { preferredModel?: string } } | null): ModelId {
  const raw = profile?.preferences?.preferredModel;
  if (raw && raw in MODEL_LABELS) return raw as ModelId;
  return DEFAULT_MODEL_ID;
}

export async function startCompose(ctx: Context): Promise<void> {
  const chatId = ctx.chat?.id;
  if (!chatId) return;
  const userId = await resolveUserIdFromContext(ctx);
  if (!userId) return;

  await saveState(chatId.toString(), userId, {
    step: "selecting_category",
    category: null,
    draftId: null,
    draftSnapshot: null,
    pendingInput: null,
  });
  await replyHtml(ctx, T.selectCategory(), { reply_markup: categoryKeyboard() });
}

export async function handleCategorySelection(ctx: Context, category: string): Promise<void> {
  const chatId = ctx.chat?.id;
  if (!chatId) return;
  if (!isEmailCategory(category)) {
    await answerCb(ctx, "Unknown category");
    return;
  }
  const userId = await resolveUserIdFromContext(ctx);
  if (!userId) return;

  await saveState(chatId.toString(), userId, {
    step: "awaiting_prompt",
    category,
  });
  await answerCb(ctx);
  await editHtml(
    ctx,
    T.promptInstructions(describeCategoryLabel(category))
  );
}

export async function handlePromptMessage(ctx: Context, prompt: string): Promise<void> {
  const chatId = ctx.chat?.id;
  if (!chatId) return;
  const userId = await resolveUserIdFromContext(ctx);
  if (!userId) return;

  const state = await loadStateForUser(chatId.toString(), userId);
  if (state.step !== "awaiting_prompt" || !state.category) {
    return;
  }
  if (!isEmailCategory(state.category)) {
    await saveState(chatId.toString(), userId, { step: "idle" });
    return;
  }
  if (prompt.length < 10) {
    await replyHtml(ctx, T.promptTooShort());
    return;
  }
  if (prompt.length > 5000) {
    await replyHtml(ctx, T.promptTooLong());
    return;
  }

  await connectDB();
  const profile = await Profile.findOne({ userId }).lean();
  const modelId = defaultModelForUser(profile);

  const placeholder = await replyHtml(
    ctx,
    T.generating(MODEL_LABELS[modelId].name)
  );
  const placeholderMessageId =
    typeof placeholder === "object" && placeholder !== null && "message_id" in placeholder
      ? (placeholder as { message_id: number }).message_id
      : undefined;

  try {
    const result = await generateFromTelegram({
      userId,
      prompt,
      category: state.category as EmailCategory,
      modelId,
    });

    const extracted = extractEmailFromText(prompt);

    await saveState(chatId.toString(), userId, {
      step: "idle",
      draftId: result.id,
      draftSnapshot: result.content,
      pendingInput: null,
      extractedRecipient: extracted ?? undefined,
    });

    const cleaned = cleanAIContent(result.content);
    const subject = extractSubject(cleaned);
    const strippedBody = stripSubjectLine(cleaned);
    const body = strippedBody.length > TELEGRAM_MAX_MESSAGE
      ? `${strippedBody.slice(0, TELEGRAM_MAX_MESSAGE - 80)}\n\n${T.truncated()}`
      : strippedBody;

    const recipientLine = extracted
      ? `\n${T.recipientLine(extracted)}`
      : "";

    if (placeholderMessageId !== undefined) {
      await editHtml(
        ctx,
        T.draftResult(describeCategoryLabel(state.category), subject, body) + recipientLine,
        { chatId: chatId, messageId: placeholderMessageId, reply_markup: reviewKeyboard() }
      );
    } else {
      await replyHtml(
        ctx,
        T.draftResult(describeCategoryLabel(state.category), subject, body) + recipientLine,
        { reply_markup: reviewKeyboard() }
      );
    }
  } catch (error) {
    const errCode = error instanceof AppError ? error.code : "INTERNAL_ERROR";
    const reason = error instanceof Error ? error.message : "unknown";
    logger.error("Telegram generate failed", { userId, reason, errCode });
    await recordAudit({
      action: "telegram.email_send_failed",
      userId,
      metadata: { reason: errCode, source: "telegram.generate" },
    });
    const failMessage = T.generationFailed();
    if (placeholderMessageId !== undefined) {
      try {
        await editHtml(ctx, failMessage, { chatId: chatId, messageId: placeholderMessageId });
      } catch {
        await replyHtml(ctx, failMessage);
      }
    } else {
      await replyHtml(ctx, failMessage);
    }
    await saveState(chatId.toString(), userId, { step: "idle", pendingInput: null });
  }
}

export async function handleRegenerate(ctx: Context): Promise<void> {
  const chatId = ctx.chat?.id;
  if (!chatId) return;
  const userId = await resolveUserIdFromContext(ctx);
  if (!userId) return;

  const state = await loadStateForUser(chatId.toString(), userId);
  if (!state.draftSnapshot || !state.category) {
    await answerCb(ctx, "Nothing to regenerate.");
    return;
  }
  if (!isEmailCategory(state.category)) {
    await answerCb(ctx, "Unknown category");
    return;
  }

  await answerCb(ctx, "Regenerating...");

  const placeholder = await replyHtml(ctx, T.regenerating());
  const placeholderMessageId =
    typeof placeholder === "object" && placeholder !== null && "message_id" in placeholder
      ? (placeholder as { message_id: number }).message_id
      : undefined;
  await connectDB();
  const profile = await Profile.findOne({ userId }).lean();
  const modelId = defaultModelForUser(profile);

  try {
    const result = await generateFromTelegram({
      userId,
      prompt: state.draftSnapshot,
      category: state.category as EmailCategory,
      modelId,
    });
    await saveState(chatId.toString(), userId, {
      draftId: result.id,
      draftSnapshot: result.content,
    });
    const cleaned = cleanAIContent(result.content);
    const subject = extractSubject(cleaned);
    const strippedBody = stripSubjectLine(cleaned);
    const body = strippedBody.length > TELEGRAM_MAX_MESSAGE
      ? `${strippedBody.slice(0, TELEGRAM_MAX_MESSAGE - 80)}\n\n${T.truncated()}`
      : strippedBody;
    if (placeholderMessageId !== undefined) {
      await editHtml(
        ctx,
        T.draftResult(describeCategoryLabel(state.category), subject, body),
        { chatId: chatId, messageId: placeholderMessageId, reply_markup: reviewKeyboard() }
      );
    } else {
      await replyHtml(
        ctx,
        T.draftResult(describeCategoryLabel(state.category), subject, body),
        { reply_markup: reviewKeyboard() }
      );
    }
  } catch {
    const failMessage = T.generationFailed();
    if (placeholderMessageId !== undefined) {
      try {
        await editHtml(ctx, failMessage, { chatId: chatId, messageId: placeholderMessageId });
      } catch {
        await replyHtml(ctx, failMessage);
      }
    } else {
      await replyHtml(ctx, failMessage);
    }
  }
}

export async function handleMainMenu(ctx: Context): Promise<void> {
  const chatId = ctx.chat?.id;
  if (!chatId) return;
  const userId = await resolveUserIdFromContext(ctx);
  if (!userId) return;
  await clearState(chatId.toString());
  const text = T.mainMenu();
  if (ctx.callbackQuery) {
    await answerCb(ctx);
    try {
      await editHtml(ctx, text, { reply_markup: mainMenuKeyboard() });
    } catch {
      await replyHtml(ctx, text, { reply_markup: mainMenuKeyboard() });
    }
  } else {
    await replyHtml(ctx, text, { reply_markup: mainMenuKeyboard() });
  }
}

async function resolveUserIdFromContext(ctx: Context): Promise<string | null> {
  const chatId = ctx.chat?.id;
  if (!chatId) return null;
  await connectDB();
  const user = await User.findOne({
    "telegram.chatId": chatId.toString(),
    "telegram.enabled": true,
  })
    .select("_id")
    .lean();
  if (!user) return null;
  return (user as { _id: unknown })._id?.toString() ?? null;
}

// ============================================================
// FILE: src/modules/telegram/flows/compose.ts
// ============================================================
// PURPOSE: The step-by-step conversation flow for writing emails in Telegram — from picking a category to reviewing the AI-generated draft.
// HOW IT WORKS: Manages a state machine stored per-user (in TelegramState collection):
//   1. startCompose(): Entry point. Clears any old state, sets step="selecting_category", shows category keyboard (7 email types).
//   2. handleCategorySelection(): User picked a category. Validates it, sets step="awaiting_prompt", tells user what details to include for that category.
//   3. handlePromptMessage(): User typed their prompt. Validates length (10-5000 chars). Gets user's profile for preferred AI model. Sends "Generating with [Model]..." placeholder message. Calls generateFromTelegram() (ai-bridge.ts) which calls the email generation service. On success: extracts subject/body, detects recipient email in prompt, saves draft ID + content in state, edits placeholder with formatted draft + review keyboard (Send, Regenerate, Cancel). On error: logs audit, shows error message.
//   4. handleRegenerate(): User tapped "Regenerate". Uses the saved draftSnapshot (original prompt) to generate a fresh version with the same category/model. Updates state with new draft.
//   5. handleMainMenu(): Returns to main menu, clears all composition state.
//   6. resolveUserIdFromContext(): Helper that looks up the AutoCompose user ID from the Telegram chat ID (links chat to account).
//   State transitions: selecting_category -> awaiting_prompt -> idle (with draft saved) -> (regenerate stays in idle) -> send flow or cancel.
// INTEGRATION: ai-bridge.ts (generateFromTelegram), state module (saveState/loadState/clearState), keyboards (categoryKeyboard, reviewKeyboard, mainMenuKeyboard), content parser (cleanAIContent, extractSubject, stripSubjectLine, extractEmailFromText), renderer (describeCategoryLabel), reply helpers, audit logging, User/Profile models. Called by webhook.ts and callbacks.ts.
// ============================================================
