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
      await ctx.reply("✅ Your Telegram is already linked.");
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
      await ctx.reply(
        "✅ <b>Account linked successfully.</b>\n\nType /menu to get started.",
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
    await ctx.reply(
      `❌ This code is invalid or has expired.\n\nGenerate a new one at: ${settingsUrl}`
    );
    return;
  }

  const user = await User.findOne({
    "telegram.chatId": chatId?.toString(),
    "telegram.enabled": true,
  }).lean();
  if (user) {
    await ctx.reply(
      "👋 Welcome back to AutoCompose.\n\nType /menu to get started.",
      { reply_markup: mainMenuKeyboard() }
    );
    return;
  }

  const cfg = getConfig();
  const settingsUrl = `${cfg.app.url.replace(/\/$/, "")}/settings`;
  const help = cfg.telegram.botUsername
    ? `1. Open Settings → Telegram Integration.\n2. Click <b>Generate login code</b>.\n3. Tap the deep link or paste the code here.`
    : `1. Open Settings → Telegram Integration.\n2. Click <b>Generate login code</b>.\n3. Send the code here.`;
  await ctx.reply(
    `👋 <b>Welcome to AutoCompose.</b>\n\n${help}\n\n🌐 Open Settings: ${settingsUrl}`
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
  await ctx.reply("Cancelled.", { reply_markup: mainMenuKeyboard() });
}

export async function handleHelp(ctx: Context): Promise<void> {
  await ctx.reply(
    "🤖 <b>AutoCompose Bot</b>\n\n" +
      "/start — link or show menu\n" +
      "/menu — main menu\n" +
      "/cancel — abort current flow\n" +
      "/status — show account info\n" +
      "/help — this help\n\n" +
      "Use the inline buttons to navigate."
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
    await ctx.reply("Not linked. Use /start to begin.");
    return;
  }
  const profile = await Profile.findOne({ userId: user._id.toString() })
    .select("preferences emailCredentials")
    .lean();
  const modelId = profile?.preferences?.preferredModel ?? "deepseek";
  const gmailConfigured = !!profile?.emailCredentials?.encryptedAppPassword;
  const linkedAt = user.telegram?.linkedAt;
  const linkedAtStr = linkedAt ? linkedAt.toISOString().slice(0, 10) : "—";
  await ctx.reply(
    `📊 <b>Status</b>\n\n` +
      `Linked: <code>${escapeHtml(linkedAtStr)}</code>\n` +
      `Default model: <code>${escapeHtml(modelId)}</code>\n` +
      `Gmail: ${gmailConfigured ? "✅ configured" : "❌ not configured"}`
  );
}

export async function handleComposeCommand(ctx: Context): Promise<void> {
  await startCompose(ctx);
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"]/g, (c) =>
    c === "&" ? "&amp;" : c === "<" ? "&lt;" : c === ">" ? "&gt;" : "&quot;"
  );
}
