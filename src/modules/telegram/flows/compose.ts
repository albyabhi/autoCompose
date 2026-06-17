import "server-only";
import { Context } from "grammy";
import { connectDB } from "@/lib/db";
import { User } from "@/models/user";
import { Profile } from "@/models/profile";
import { ModelId, MODEL_LABELS } from "@/modules/ai/types";
import { isEmailCategory, EmailCategory } from "@/modules/email/categories";
import { generateFromTelegram } from "@/modules/telegram/ai-bridge";
import { saveState, loadStateForUser, clearState } from "@/modules/telegram/state";
import { categoryKeyboard, reviewKeyboard, mainMenuKeyboard } from "@/modules/telegram/keyboards";
import { cleanAIContent, extractSubject, stripSubjectLine } from "@/modules/email/content";
import { escapeHtml, describeCategoryLabel, TELEGRAM_MAX_MESSAGE } from "@/modules/telegram/renderer";
import { replyHtml, editHtml, answerCb } from "@/modules/telegram/reply";
import { recordAudit } from "@/lib/audit";
import { logger } from "@/lib/logger";
import { AppError } from "@/lib/errors";

function defaultModelForUser(profile: { preferences?: { preferredModel?: string } } | null): ModelId {
  const raw = profile?.preferences?.preferredModel;
  if (raw && raw in MODEL_LABELS) return raw as ModelId;
  return "deepseek";
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
  await replyHtml(ctx, "Select a category:", { reply_markup: categoryKeyboard() });
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
    `Category: <b>${escapeHtml(describeCategoryLabel(category))}</b>\n\nDescribe what you need (the more detail the better).`
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
    await replyHtml(ctx, "Please provide a little more detail (at least 10 characters).");
    return;
  }
  if (prompt.length > 5000) {
    await replyHtml(ctx, "Prompt is too long. Please shorten it to under 5000 characters.");
    return;
  }

  await connectDB();
  const profile = await Profile.findOne({ userId }).lean();
  const modelId = defaultModelForUser(profile);

  const placeholder = await replyHtml(
    ctx,
    `⏳ Generating with <b>${escapeHtml(MODEL_LABELS[modelId].name)}</b>…`
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

    await saveState(chatId.toString(), userId, {
      step: "idle",
      draftId: result.id,
      draftSnapshot: result.content,
      pendingInput: null,
    });

    const cleaned = cleanAIContent(result.content);
    const subject = extractSubject(cleaned);
    const strippedBody = stripSubjectLine(cleaned);
    const body = strippedBody.length > TELEGRAM_MAX_MESSAGE
      ? `${strippedBody.slice(0, TELEGRAM_MAX_MESSAGE - 80)}\n\n…(truncated, full text saved)`
      : strippedBody;

    if (placeholderMessageId !== undefined) {
      await editHtml(
        ctx,
        `<b>${escapeHtml(describeCategoryLabel(state.category))}</b>\n\n` +
        `📌 <b>Subject:</b> ${escapeHtml(subject)}\n\n${escapeHtml(body)}`,
        { chatId: chatId, messageId: placeholderMessageId, reply_markup: reviewKeyboard() }
      );
    } else {
      await replyHtml(
        ctx,
        `<b>${escapeHtml(describeCategoryLabel(state.category))}</b>\n\n` +
        `📌 <b>Subject:</b> ${escapeHtml(subject)}\n\n${escapeHtml(body)}`,
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
    const failMessage = "⚠️ Generation failed. Please try again or /cancel.";
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

  await answerCb(ctx, "Regenerating…");

  const placeholder = await replyHtml(ctx, "⏳ Regenerating…");
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
      ? `${strippedBody.slice(0, TELEGRAM_MAX_MESSAGE - 80)}\n\n…(truncated)`
      : strippedBody;
    if (placeholderMessageId !== undefined) {
      await editHtml(
        ctx,
        `<b>${escapeHtml(describeCategoryLabel(state.category))}</b>\n\n` +
        `📌 <b>Subject:</b> ${escapeHtml(subject)}\n\n${escapeHtml(body)}`,
        { chatId: chatId, messageId: placeholderMessageId, reply_markup: reviewKeyboard() }
      );
    } else {
      await replyHtml(
        ctx,
        `<b>${escapeHtml(describeCategoryLabel(state.category))}</b>\n\n` +
        `📌 <b>Subject:</b> ${escapeHtml(subject)}\n\n${escapeHtml(body)}`,
        { reply_markup: reviewKeyboard() }
      );
    }
  } catch {
    const failMessage = "⚠️ Regeneration failed.";
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
  const text = "🏠 <b>Main Menu</b>\n\nWhat would you like to do?";
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
// PURPOSE: Implements the multi-step email composition flow via Telegram bot.
// HOW IT WORKS: startCompose() resets state to "selecting_category" and shows the
//   category keyboard. handleCategorySelection() saves the chosen category and prompts
//   for details. handlePromptMessage() validates the prompt (10-5000 chars), loads the
//   user's preferred model, sends a "generating" placeholder, calls generateFromTelegram(),
//   and edits the placeholder with the result + review keyboard. handleRegenerate()
//   re-generates using the same prompt. handleMainMenu() clears state and shows the
//   main menu. resolveUserIdFromContext() looks up the user by their Telegram chatId.
// INTEGRATION: AI bridge, state module, keyboards, content cleaner, audit logger
// ============================================================
