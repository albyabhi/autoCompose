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
// PURPOSE: Routes inline keyboard button presses to their respective handlers.
// HOW IT WORKS: Parses the callback data string and matches it against predefined
//   CB constants (menu, compose, cancel, regenerate, sendStart, sendToMe, sendConfirm).
//   Category selections use a prefix-based match (tg:cat:*) and extract the category
//   value. Each callback delegates to the appropriate flow handler in compose.ts
//   or send.ts. Unknown callbacks get an "Unknown action" response.
// INTEGRATION: Compose flow, send flow, keyboards (CB constants), reply helper
// ============================================================
