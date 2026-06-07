import "server-only";
import { Context } from "grammy";
import { connectDB } from "@/lib/db";
import { User } from "@/models/user";
import { TelegramState } from "@/models/telegram-state";
import { recordAudit } from "@/lib/audit";
import { isDuplicateUpdate } from "@/modules/telegram/idempotency";
import { loadStateForUser } from "@/modules/telegram/state";
import { handleCallback } from "@/modules/telegram/callbacks";
import {
  handleStart,
  handleMenu,
  handleCancel,
  handleHelp,
  handleStatus,
  handleComposeCommand,
} from "@/modules/telegram/commands";
import { handlePromptMessage } from "@/modules/telegram/flows/compose";
import {
  handleRecipientInput,
  handleSubjectInput,
} from "@/modules/telegram/flows/send";
import { TELEGRAM_RATE_KEYS, TELEGRAM_RATE_LIMITS, checkTelegramRateLimit } from "@/modules/telegram/ratelimit";
import { mainMenuKeyboard } from "@/modules/telegram/keyboards";
import { replyHtml } from "@/modules/telegram/reply";

export interface HandleUpdateResult {
  status: "ok" | "duplicate" | "ignored" | "rate_limited" | "rejected";
  reason?: string;
}

export async function handleUpdate(ctx: Context): Promise<HandleUpdateResult> {
  const updateId = ctx.update.update_id;
  if (typeof updateId === "number") {
    const isDup = await isDuplicateUpdate(updateId);
    if (isDup) {
      return { status: "duplicate" };
    }
  }

  if (ctx.callbackQuery) {
    await handleCallback(ctx);
    return { status: "ok" };
  }

  const chatId = ctx.chat?.id;
  if (!chatId) {
    return { status: "ignored", reason: "no_chat_id" };
  }
  const chatIdStr = chatId.toString();

  if (ctx.message) {
    await recordAudit({
      action: "telegram.message_received",
      metadata: { chatId: chatIdStr, hasText: !!ctx.message.text },
    });
  }

  if (ctx.message?.text?.startsWith("/start")) {
    await recordAudit({ action: "telegram.command_executed", metadata: { command: "start" } });
    await handleStart(ctx);
    return { status: "ok" };
  }
  if (ctx.message?.text === "/menu") {
    await recordAudit({ action: "telegram.command_executed", metadata: { command: "menu" } });
    await handleMenu(ctx);
    return { status: "ok" };
  }
  if (ctx.message?.text === "/cancel") {
    await recordAudit({ action: "telegram.command_executed", metadata: { command: "cancel" } });
    await handleCancel(ctx);
    return { status: "ok" };
  }
  if (ctx.message?.text === "/help") {
    await recordAudit({ action: "telegram.command_executed", metadata: { command: "help" } });
    await handleHelp(ctx);
    return { status: "ok" };
  }
  if (ctx.message?.text === "/status") {
    await recordAudit({ action: "telegram.command_executed", metadata: { command: "status" } });
    await handleStatus(ctx);
    return { status: "ok" };
  }
  if (ctx.message?.text === "/compose") {
    await recordAudit({ action: "telegram.command_executed", metadata: { command: "compose" } });
    await handleComposeCommand(ctx);
    return { status: "ok" };
  }

  await connectDB();
  const user = await User.findOne({
    "telegram.chatId": chatIdStr,
    "telegram.enabled": true,
  })
    .select("_id telegram")
    .lean();

  if (!user) {
    await replyHtml(
      ctx,
      "❌ This chat is not linked to an AutoCompose account.\n\nType /start to begin linking.",
      { reply_markup: mainMenuKeyboard() }
    );
    return { status: "ignored", reason: "unlinked" };
  }

  const userId = (user as { _id: unknown })._id?.toString() ?? "";
  const state = await loadStateForUser(chatIdStr, userId);

  if (ctx.message?.text && !ctx.message.text.startsWith("/")) {
    if (state.step === "awaiting_prompt") {
      try {
        checkTelegramRateLimit(
          TELEGRAM_RATE_KEYS.loginCodeAttempt(chatIdStr),
          TELEGRAM_RATE_LIMITS.loginCodeAttempt
        );
      } catch {
        return { status: "rate_limited", reason: "abuse_brake" };
      }
      await handlePromptMessage(ctx, ctx.message.text);
      return { status: "ok" };
    }
    if (state.step === "awaiting_recipient") {
      await handleRecipientInput(ctx, ctx.message.text);
      return { status: "ok" };
    }
    if (state.step === "awaiting_subject") {
      await handleSubjectInput(ctx, ctx.message.text);
      return { status: "ok" };
    }
    if (state.step === "awaiting_send_confirm") {
      await replyHtml(
        ctx,
        "Please use the buttons above to confirm or cancel the send, or type /cancel to abort."
      );
      return { status: "ok" };
    }
    await replyHtml(ctx, "Please use /menu to choose an action.", {
      reply_markup: mainMenuKeyboard(),
    });
    return { status: "ok" };
  }

  if (ctx.message && !ctx.message.text) {
    await replyHtml(ctx, "Please send text. Type /menu to choose an action.");
    return { status: "ok" };
  }

  return { status: "ok" };
}

export async function clearAllTelegramState(chatId: string): Promise<void> {
  await connectDB();
  await TelegramState.deleteMany({ chatId });
}
