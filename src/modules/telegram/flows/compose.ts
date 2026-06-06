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
import { escapeHtml, describeCategoryLabel, TELEGRAM_MAX_MESSAGE } from "@/modules/telegram/renderer";
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
  await ctx.reply("Select a category:", { reply_markup: categoryKeyboard() });
}

export async function handleCategorySelection(ctx: Context, category: string): Promise<void> {
  const chatId = ctx.chat?.id;
  if (!chatId) return;
  if (!isEmailCategory(category)) {
    await ctx.answerCallbackQuery({ text: "Unknown category" });
    return;
  }
  const userId = await resolveUserIdFromContext(ctx);
  if (!userId) return;

  await saveState(chatId.toString(), userId, {
    step: "awaiting_prompt",
    category,
  });
  await ctx.answerCallbackQuery();
  await ctx.editMessageText(
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
    await ctx.reply("Please provide a little more detail (at least 10 characters).");
    return;
  }
  if (prompt.length > 5000) {
    await ctx.reply("Prompt is too long. Please shorten it to under 5000 characters.");
    return;
  }

  await connectDB();
  const profile = await Profile.findOne({ userId }).lean();
  const modelId = defaultModelForUser(profile);

  const placeholder = await ctx.reply(
    `⏳ Generating with <b>${escapeHtml(MODEL_LABELS[modelId].name)}</b>…`
  );

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

    const body = result.content.length > TELEGRAM_MAX_MESSAGE
      ? `${result.content.slice(0, TELEGRAM_MAX_MESSAGE - 80)}\n\n…(truncated, full text saved)`
      : result.content;
    await ctx.api.editMessageText(
      chatId,
      placeholder.message_id,
      `<b>${escapeHtml(describeCategoryLabel(state.category))}</b>\n\n${escapeHtml(body)}`,
      { reply_markup: reviewKeyboard() }
    );
  } catch (error) {
    const errCode = error instanceof AppError ? error.code : "INTERNAL_ERROR";
    const reason = error instanceof Error ? error.message : "unknown";
    logger.error("Telegram generate failed", { userId, reason, errCode });
    await recordAudit({
      action: "telegram.email_send_failed",
      userId,
      metadata: { reason: errCode, source: "telegram.generate" },
    });
    try {
      await ctx.api.editMessageText(
        chatId,
        placeholder.message_id,
        "⚠️ Generation failed. Please try again or /cancel."
      );
    } catch {
      await ctx.reply("⚠️ Generation failed. Please try again or /cancel.");
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
    await ctx.answerCallbackQuery({ text: "Nothing to regenerate." });
    return;
  }
  if (!isEmailCategory(state.category)) {
    await ctx.answerCallbackQuery({ text: "Unknown category" });
    return;
  }

  await ctx.answerCallbackQuery({ text: "Regenerating…" });

  const placeholder = await ctx.reply("⏳ Regenerating…");
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
    const body = result.content.length > TELEGRAM_MAX_MESSAGE
      ? `${result.content.slice(0, TELEGRAM_MAX_MESSAGE - 80)}\n\n…(truncated)`
      : result.content;
    await ctx.api.editMessageText(
      chatId,
      placeholder.message_id,
      `<b>${escapeHtml(describeCategoryLabel(state.category))}</b>\n\n${escapeHtml(body)}`,
      { reply_markup: reviewKeyboard() }
    );
  } catch {
    try {
      await ctx.api.editMessageText(chatId, placeholder.message_id, "⚠️ Regeneration failed.");
    } catch {
      await ctx.reply("⚠️ Regeneration failed.");
    }
  }
}

export async function handleMainMenu(ctx: Context): Promise<void> {
  const chatId = ctx.chat?.id;
  if (!chatId) return;
  const userId = await resolveUserIdFromContext(ctx);
  if (!userId) return;
  await clearState(chatId.toString());
  if (ctx.callbackQuery) {
    await ctx.answerCallbackQuery();
    try {
      await ctx.editMessageText("🏠 <b>Main Menu</b>\n\nWhat would you like to do?", {
        reply_markup: mainMenuKeyboard(),
      });
    } catch {
      await ctx.reply("🏠 <b>Main Menu</b>\n\nWhat would you like to do?", {
        reply_markup: mainMenuKeyboard(),
      });
    }
  } else {
    await ctx.reply("🏠 <b>Main Menu</b>\n\nWhat would you like to do?", {
      reply_markup: mainMenuKeyboard(),
    });
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
