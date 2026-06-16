import "server-only";
import { Context } from "grammy";
import { InlineKeyboardMarkup } from "grammy/types";

export interface ReplyOptions {
  reply_markup?: InlineKeyboardMarkup;
}

export interface EditOptions {
  reply_markup?: InlineKeyboardMarkup;
  chatId?: number | string;
  messageId?: number;
}

export async function replyHtml(
  ctx: Context,
  text: string,
  extra?: ReplyOptions
): Promise<unknown> {
  return ctx.reply(text, { parse_mode: "HTML", ...extra });
}

export async function editHtml(
  ctx: Context,
  text: string,
  extra?: EditOptions
): Promise<unknown> {
  if (extra?.chatId !== undefined && extra.messageId !== undefined) {
    return ctx.api.editMessageText(extra.chatId, extra.messageId, text, {
      parse_mode: "HTML",
      reply_markup: extra.reply_markup,
    });
  }
  return ctx.editMessageText(text, {
    parse_mode: "HTML",
    reply_markup: extra?.reply_markup,
  });
}

export async function answerCb(ctx: Context, text?: string): Promise<void> {
  await ctx.answerCallbackQuery(text ? { text } : undefined);
}

// ============================================================
// FILE: src/modules/telegram/reply.ts
// ============================================================
// PURPOSE: Convenience wrappers for sending/editing HTML-formatted Telegram messages.
// HOW IT WORKS: replyHtml() sends a new message with HTML parse mode and optional
//   inline keyboard. editHtml() edits an existing message, supporting both context-based
//   editing and explicit chatId/messageId pairs. answerCb() acknowledges a callback
//   query with optional toast text. All functions handle grammY's API abstraction.
// INTEGRATION: Used throughout all Telegram handlers for consistent message formatting
// ============================================================
