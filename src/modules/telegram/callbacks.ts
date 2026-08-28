import "server-only";
import { Context } from "grammy";
import { CB } from "@/modules/telegram/keyboards";
import {
  startCompose,
  handleCategorySelection,
  handleRegenerate,
  handleMainMenu,
} from "@/modules/telegram/flows/compose";
import {
  handleSendStart,
  handleSendToMe,
  handleSendConfirm,
  handleSendCancel,
} from "@/modules/telegram/flows/send";
import { handleHelp } from "@/modules/telegram/commands";
import { replyHtml, answerCb } from "@/modules/telegram/reply";
import { T } from "@/modules/telegram/text-constants";

export async function handleCallback(ctx: Context): Promise<void> {
  const data = ctx.callbackQuery?.data;
  if (!data) {
    await answerCb(ctx);
    return;
  }

  if (data === CB.compose) {
    await startCompose(ctx);
    return;
  }
  if (data === CB.menu) {
    await handleMainMenu(ctx);
    return;
  }
  if (data === CB.cancel) {
    await handleSendCancel(ctx);
    return;
  }
  if (data === CB.regenerate) {
    await handleRegenerate(ctx);
    return;
  }
  if (data === CB.sendStart) {
    await handleSendStart(ctx);
    return;
  }
  if (data === CB.sendToMe) {
    await handleSendToMe(ctx);
    return;
  }
  if (data === CB.sendConfirm) {
    await handleSendConfirm(ctx);
    return;
  }
  if (data === "tg:menu:help") {
    await answerCb(ctx);
    await handleHelp(ctx);
    return;
  }
  if (data.startsWith(CB.categoryPrefix)) {
    const category = data.slice(CB.categoryPrefix.length);
    await handleCategorySelection(ctx, category);
    return;
  }

  await answerCb(ctx);
  await replyHtml(ctx, T.unknownAction());
}

// ============================================================
// FILE: src/modules/telegram/callbacks.ts
// ============================================================
// PURPOSE: Handles every button press in the Telegram bot — routes inline keyboard callbacks to the right flow handler.
// HOW IT WORKS: When a user taps a button in the Telegram chat, Telegram sends a "callback query" with a data string. This function parses that data and routes:
//   - CB.compose ("tg:compose"): Start composing a new email -> startCompose()
//   - CB.menu ("tg:menu"): Return to main menu -> handleMainMenu()
//   - CB.cancel ("tg:cancel"): Cancel current send flow -> handleSendCancel()
//   - CB.regenerate ("tg:regenerate"): Ask AI to rewrite the email -> handleRegenerate()
//   - CB.sendStart ("tg:send:start"): Begin the send flow (enter recipient) -> handleSendStart()
//   - CB.sendToMe ("tg:send:me"): Send email to own Gmail address -> handleSendToMe()
//   - CB.sendConfirm ("tg:send:confirm"): User confirmed sending -> handleSendConfirm()
//   - "tg:menu:help": Show help -> handleHelp()
//   - CB.categoryPrefix ("tg:cat:"): Category selection (e.g., "tg:cat:job_application") -> handleCategorySelection()
//   Unknown callbacks: Responds with "Unknown action" and removes loading state.
//   Each handler is in compose.ts or send.ts flows. answerCb() acknowledges the button press to Telegram (removes the loading spinner on the button).
// INTEGRATION: Keyboards module (CB constants from src/modules/telegram/keyboards.ts), compose flow (src/modules/telegram/flows/compose.ts), send flow (src/modules/telegram/flows/send.ts), commands (handleHelp), reply helpers (replyHtml, answerCb). Called by webhook.ts.
// ============================================================
