import "server-only";
import { Context } from "grammy";
import { CB } from "@/modules/telegram/keyboards";
import {
  startCompose,
  handleCategorySelection,
  handleRegenerate,
  handleMainMenu,
} from "@/modules/telegram/flows/compose";
import { handleHelp } from "@/modules/telegram/commands";

export async function handleCallback(ctx: Context): Promise<void> {
  const data = ctx.callbackQuery?.data;
  if (!data) {
    await ctx.answerCallbackQuery();
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
    await ctx.answerCallbackQuery();
    await ctx.reply("Cancelled.");
    return;
  }
  if (data === CB.regenerate) {
    await handleRegenerate(ctx);
    return;
  }
  if (data === "tg:menu:help") {
    await ctx.answerCallbackQuery();
    await handleHelp(ctx);
    return;
  }
  if (data.startsWith(CB.categoryPrefix)) {
    const category = data.slice(CB.categoryPrefix.length);
    await handleCategorySelection(ctx, category);
    return;
  }

  await ctx.answerCallbackQuery();
}
