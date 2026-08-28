import "server-only";
import { Context } from "grammy";
import { connectDB } from "@/lib/db";
import { User } from "@/models/user";
import { Profile } from "@/models/profile";
import { recordAudit } from "@/lib/audit";
import { getConfig } from "@/config";
import { clearState } from "@/modules/telegram/state";
import { mainMenuKeyboard } from "@/modules/telegram/keyboards";
import { handleMainMenu, startCompose } from "@/modules/telegram/flows/compose";
import { replyHtml } from "@/modules/telegram/reply";
import { T } from "@/modules/telegram/text-constants";
import bcrypt from "bcryptjs";

export async function handleStart(ctx: Context): Promise<void> {
  const chatId = ctx.chat?.id;
  const fromUsername = ctx.from?.username;
  const rawText = ctx.message?.text?.trim() ?? "";
  let payload = ctx.match?.toString().trim() ?? "";
  if (!payload && /^[\/!]start\b/i.test(rawText)) {
    payload = rawText.replace(/^[\/!]start\b/i, "").trim();
  }

  await connectDB();

  if (payload) {
    const user = await User.findOne({ "telegram.chatId": chatId?.toString() })
      .select("_id telegram telegramLoginCode telegramLoginCodeExpiresAt")
      .lean();
    if (user && user.telegram?.enabled) {
      await replyHtml(ctx, T.alreadyLinked());
      await handleMainMenu(ctx);
      return;
    }
    const matched = await consumeLoginCode(payload, chatId?.toString() ?? "", fromUsername);
    if (matched) {
      await recordAudit({
        action: "telegram.linked",
        userId: matched.userId,
        metadata: { chatId: chatId?.toString(), username: fromUsername },
      });
      await replyHtml(
        ctx,
        T.accountLinked(),
        { reply_markup: mainMenuKeyboard() }
      );
      return;
    }
    await recordAudit({
      action: "telegram.login_code_attempt",
      metadata: { chatId: chatId?.toString(), reason: "invalid_or_expired" },
    });
    const cfg = getConfig();
    const settingsUrl = `${cfg.app.url.replace(/\/$/, "")}/settings`;
    await replyHtml(
      ctx,
      T.invalidCode(settingsUrl)
    );
    return;
  }

  const user = await User.findOne({
    "telegram.chatId": chatId?.toString(),
    "telegram.enabled": true,
  }).lean();
  if (user) {
    await replyHtml(
      ctx,
      T.welcomeBack(),
      { reply_markup: mainMenuKeyboard() }
    );
    return;
  }

  const cfg = getConfig();
  const settingsUrl = `${cfg.app.url.replace(/\/$/, "")}/settings`;
  const help = cfg.telegram.botUsername
    ? T.welcomeInstructionsDeepLink()
    : T.welcomeInstructionsManual();
  await replyHtml(
    ctx,
    T.welcomeNew(help, settingsUrl)
  );
}

async function consumeLoginCode(
  code: string,
  chatId: string,
  username?: string
): Promise<{ userId: string } | null> {
  if (!/^[0-9a-z]{8}$/i.test(code)) return null;
  await connectDB();
  const candidates = await User.find({
    telegramLoginCode: { $exists: true, $ne: null },
    telegramLoginCodeExpiresAt: { $gt: new Date() },
  })
    .select("_id telegram telegramLoginCode telegramLoginCodeExpiresAt")
    .lean();

  for (const candidate of candidates) {
    const hash = candidate.telegramLoginCode;
    if (!hash) continue;
    let matches = false;
    try {
      matches = await bcrypt.compare(code, hash);
    } catch {
      matches = false;
    }
    if (matches) {
      const expiresAt = candidate.telegramLoginCodeExpiresAt;
      if (!expiresAt || expiresAt.getTime() < Date.now()) continue;
      await User.updateOne(
        { _id: candidate._id },
        {
          $set: {
            "telegram.chatId": chatId,
            "telegram.username": username ?? null,
            "telegram.linkedAt": new Date(),
            "telegram.enabled": true,
          },
          $unset: { telegramLoginCode: 1, telegramLoginCodeExpiresAt: 1 },
        }
      );
      return { userId: candidate._id.toString() };
    }
  }
  return null;
}

export async function handleMenu(ctx: Context): Promise<void> {
  await handleMainMenu(ctx);
}

export async function handleCancel(ctx: Context): Promise<void> {
  const chatId = ctx.chat?.id;
  if (chatId) await clearState(chatId.toString());
  await replyHtml(ctx, T.cancelled(), { reply_markup: mainMenuKeyboard() });
}

export async function handleHelp(ctx: Context): Promise<void> {
  await replyHtml(
    ctx,
    T.help()
  );
}

export async function handleStatus(ctx: Context): Promise<void> {
  const chatId = ctx.chat?.id;
  if (!chatId) return;
  await connectDB();
  const user = await User.findOne({ "telegram.chatId": chatId.toString() })
    .select("_id email telegram")
    .lean();
  if (!user) {
    await replyHtml(ctx, T.notLinked());
    return;
  }
  const profile = await Profile.findOne({ userId: user._id.toString() })
    .select("preferences emailCredentials")
    .lean();
  const modelId = profile?.preferences?.preferredModel ?? "deepseek";
  const gmailConfigured = !!profile?.emailCredentials?.encryptedAppPassword;
  const linkedAt = user.telegram?.linkedAt;
  const linkedAtStr = linkedAt ? linkedAt.toISOString().slice(0, 10) : "\u2014";
  await replyHtml(
    ctx,
    T.status(linkedAtStr, modelId, gmailConfigured)
  );
}

export async function handleComposeCommand(ctx: Context): Promise<void> {
  await startCompose(ctx);
}

// ============================================================
// FILE: src/modules/telegram/commands.ts
// ============================================================
// PURPOSE: Handles the Telegram bot's slash commands — the main user-facing entry points in the chat.
// HOW IT WORKS:
//   - handleStart(): The /start command. If invoked with a payload (e.g., /start ABC12345), treats it as a login code: validates the 8-char code against bcrypt hashes stored in User documents, links the Telegram chat to that AutoCompose account on success. Without payload: shows welcome message with instructions to link account via web settings.
//   - handleMenu(): The /menu command. Shows the main menu keyboard (Compose, Schedule, Batch, Settings).
//   - handleCancel(): The /cancel command. Clears any active conversation flow state, shows menu.
//   - handleHelp(): The /help command. Shows available commands and brief descriptions.
//   - handleStatus(): The /status command. Shows account link date, default AI model, whether Gmail is configured.
//   - consumeLoginCode(): Internal helper. Finds all users with non-expired login codes, bcrypt-compares the provided code, on match: updates user with chatId, username, linkedAt, enabled=true, clears the code. Used only by handleStart.
// INTEGRATION: User model (telegram fields, login codes), Profile model (preferences, emailCredentials), state module (clearState), compose flow (handleMainMenu), keyboards (mainMenuKeyboard), text-constants (T), bcryptjs for secure code comparison, audit logging. Called by webhook.ts.
// ============================================================
