import "server-only";
import { Context } from "grammy";
import { connectDB } from "@/lib/db";
import { User } from "@/models/user";
import { Profile } from "@/models/profile";
import { saveState, loadStateForUser, clearState } from "@/modules/telegram/state";
import { sendConfirmKeyboard, mainMenuKeyboard } from "@/modules/telegram/keyboards";
import { extractSubject, stripSubjectLine } from "@/modules/email/content";
import { dispatchSendEmail, validateRecipientEmail } from "@/modules/email/dispatch";
import { TELEGRAM_RATE_KEYS, TELEGRAM_RATE_LIMITS, checkTelegramRateLimit } from "@/modules/telegram/ratelimit";
import { replyHtml, answerCb } from "@/modules/telegram/reply";
import { getConfig } from "@/config";
import { recordAudit } from "@/lib/audit";
import { logger } from "@/lib/logger";

async function resolveUserAndCreds(
  ctx: Context
): Promise<
  | { ok: true; userId: string; gmailAddress: string }
  | { ok: false; reason: "unlinked" | "no_credentials"; settingsUrl: string }
> {
  const chatId = ctx.chat?.id;
  if (!chatId) return { ok: false, reason: "unlinked", settingsUrl: "" };
  await connectDB();
  const user = await User.findOne({
    "telegram.chatId": chatId.toString(),
    "telegram.enabled": true,
  })
    .select("_id")
    .lean();
  if (!user) return { ok: false, reason: "unlinked", settingsUrl: "" };
  const userId = (user as { _id: unknown })._id?.toString() ?? "";
  const profile = await Profile.findOne({ userId })
    .select("emailCredentials")
    .lean();
  if (!profile?.emailCredentials?.encryptedAppPassword || !profile.emailCredentials.gmailAddress) {
    const cfg = getConfig();
    const settingsUrl = `${cfg.app.url.replace(/\/$/, "")}/settings`;
    return { ok: false, reason: "no_credentials", settingsUrl };
  }
  return {
    ok: true,
    userId,
    gmailAddress: profile.emailCredentials.gmailAddress,
  };
}

function settingsErrorMessage(reason: "unlinked" | "no_credentials", settingsUrl: string): string {
  if (reason === "unlinked") {
    return "❌ This chat is not linked. Type /start to link.";
  }
  return `❌ Gmail credentials are not configured.\n\nAdd them in Settings → Email Credentials:\n${settingsUrl}`;
}

export async function handleSendStart(ctx: Context): Promise<void> {
  const chatId = ctx.chat?.id;
  if (!chatId) return;
  const userId = await resolveUserIdFromContext(ctx);
  if (!userId) {
    await answerCb(ctx, "Not linked");
    return;
  }

  const state = await loadStateForUser(chatId.toString(), userId);
  if (!state.draftSnapshot) {
    await answerCb(ctx, "Nothing to send");
    await replyHtml(
      ctx,
      "❌ No draft to send. Use /menu → ✉ Compose Email to create one.",
      { reply_markup: mainMenuKeyboard() }
    );
    return;
  }

  const creds = await resolveUserAndCreds(ctx);
  if (!creds.ok) {
    await answerCb(ctx, creds.reason === "no_credentials" ? "Gmail not configured" : "Not linked");
    await replyHtml(ctx, settingsErrorMessage(creds.reason, creds.settingsUrl), {
      reply_markup: mainMenuKeyboard(),
    });
    return;
  }

  try {
    checkTelegramRateLimit(
      TELEGRAM_RATE_KEYS.send(creds.userId),
      TELEGRAM_RATE_LIMITS.send
    );
  } catch {
    await answerCb(ctx, "Rate limited");
    await replyHtml(
      ctx,
      "⚠️ You've hit the send rate limit (10/hour). Please wait and try again.",
      { reply_markup: mainMenuKeyboard() }
    );
    return;
  }

  await answerCb(ctx, "Send");

  if (state.extractedRecipient) {
    await saveState(chatId.toString(), userId, {
      step: "awaiting_subject",
      pendingSendTo: state.extractedRecipient,
      pendingInput: null,
    });
    await promptForSubjectWithRecipient(ctx, userId, state.extractedRecipient, state.draftSnapshot, true);
    return;
  }

  await saveState(chatId.toString(), userId, {
    step: "awaiting_recipient",
    pendingInput: null,
  });
  await replyHtml(
    ctx,
    "📧 <b>Send Email</b>\n\n" +
      "Who should I send it to?\n\n" +
      "Send the recipient's email address, or /cancel to abort."
  );
}

export async function handleSendToMe(ctx: Context): Promise<void> {
  const chatId = ctx.chat?.id;
  if (!chatId) return;
  const userId = await resolveUserIdFromContext(ctx);
  if (!userId) {
    await answerCb(ctx, "Not linked");
    return;
  }

  const state = await loadStateForUser(chatId.toString(), userId);
  if (!state.draftSnapshot) {
    await answerCb(ctx, "Nothing to send");
    await replyHtml(
      ctx,
      "❌ No draft to send. Use /menu → ✉ Compose Email to create one.",
      { reply_markup: mainMenuKeyboard() }
    );
    return;
  }

  const creds = await resolveUserAndCreds(ctx);
  if (!creds.ok) {
    await answerCb(ctx, creds.reason === "no_credentials" ? "Gmail not configured" : "Not linked");
    await replyHtml(ctx, settingsErrorMessage(creds.reason, creds.settingsUrl), {
      reply_markup: mainMenuKeyboard(),
    });
    return;
  }

  try {
    checkTelegramRateLimit(
      TELEGRAM_RATE_KEYS.send(creds.userId),
      TELEGRAM_RATE_LIMITS.send
    );
  } catch {
    await answerCb(ctx, "Rate limited");
    await replyHtml(
      ctx,
      "⚠️ You've hit the send rate limit (10/hour). Please wait and try again.",
      { reply_markup: mainMenuKeyboard() }
    );
    return;
  }

  await answerCb(ctx, "Send to me");
  await promptForSubject(ctx, userId, creds.gmailAddress);
}

export async function handleRecipientInput(ctx: Context, text: string): Promise<void> {
  const chatId = ctx.chat?.id;
  if (!chatId) return;
  const userId = await resolveUserIdFromContext(ctx);
  if (!userId) return;

  const trimmed = text.trim();
  if (!validateRecipientEmail(trimmed)) {
    await replyHtml(
      ctx,
      "❌ That doesn't look like a valid email address.\n\n" +
        "Try again (e.g. <code>name@example.com</code>), or /cancel to abort."
    );
    return;
  }

  await saveState(chatId.toString(), userId, {
    step: "awaiting_subject",
    pendingSendTo: trimmed,
    pendingInput: null,
  });

  const state = await loadStateForUser(chatId.toString(), userId);
  await promptForSubjectWithRecipient(ctx, userId, trimmed, state.draftSnapshot);
}

export async function handleSubjectInput(ctx: Context, text: string): Promise<void> {
  const chatId = ctx.chat?.id;
  if (!chatId) return;
  const userId = await resolveUserIdFromContext(ctx);
  if (!userId) return;

  const state = await loadStateForUser(chatId.toString(), userId);
  const to = state.pendingSendTo;
  if (!to || !state.draftSnapshot) {
    await saveState(chatId.toString(), userId, { step: "idle" });
    await replyHtml(ctx, "❌ Send flow lost. Please start over with /menu.", {
      reply_markup: mainMenuKeyboard(),
    });
    return;
  }

  const trimmed = text.trim();
  const auto = extractSubject(state.draftSnapshot);
  let subject: string;
  if (trimmed.toLowerCase() === "/skip") {
    if (!auto || auto === "Email from AutoCompose") {
      await replyHtml(
        ctx,
        "❌ Could not detect an auto-generated subject.\n\n" +
          "Please type a custom subject, or /cancel to abort."
      );
      return;
    }
    subject = auto;
  } else if (trimmed.length === 0) {
    await replyHtml(
      ctx,
      "❌ Subject can't be empty.\n\n" +
        `Type a subject, or /skip to use the auto-detected one: <i>${escapeForDisplay(auto)}</i>.`
    );
    return;
  } else {
    subject = trimmed;
  }

  await saveState(chatId.toString(), userId, {
    step: "awaiting_send_confirm",
    pendingSubject: subject,
    pendingInput: null,
  });

  await showConfirm(ctx, to, subject, state.draftSnapshot);
}

export async function handleSendConfirm(ctx: Context): Promise<void> {
  const chatId = ctx.chat?.id;
  if (!chatId) return;
  const userId = await resolveUserIdFromContext(ctx);
  if (!userId) return;

  const state = await loadStateForUser(chatId.toString(), userId);
  const to = state.pendingSendTo;
  const subject = state.pendingSubject;
  const body = state.draftSnapshot;
  if (!to || !subject || !body) {
    logger.warn("handleSendConfirm: missing fields", {
      userId,
      hasTo: !!to,
      hasSubject: !!subject,
      hasBody: !!body,
    });
    await answerCb(ctx, "Missing data");
    await saveState(chatId.toString(), userId, { step: "idle" });
    await replyHtml(ctx, "❌ Send flow lost. Please start over with /menu.", {
      reply_markup: mainMenuKeyboard(),
    });
    return;
  }

  await answerCb(ctx, "Sending…");
  const creds = await resolveUserAndCreds(ctx);
  if (!creds.ok) {
    await replyHtml(ctx, settingsErrorMessage(creds.reason, creds.settingsUrl), {
      reply_markup: mainMenuKeyboard(),
    });
    await clearState(chatId.toString());
    return;
  }

  const result = await dispatchSendEmail({
    userId: creds.userId,
    userName: null,
    to,
    subject,
    body: stripSubjectLine(body),
    ip: "telegram-bot",
    userAgent: "telegram-bot",
  });

  if (result.ok) {
    await recordAudit({
      action: "telegram.email_sent",
      userId: creds.userId,
      metadata: { to, subject, messageId: result.messageId, source: "telegram" },
    });
    await replyHtml(
      ctx,
      `✅ <b>Sent!</b>\n\n` +
        `To: <code>${escapeForDisplay(to)}</code>\n` +
        `Subject: <i>${escapeForDisplay(subject)}</i>`,
      { reply_markup: mainMenuKeyboard() }
    );
    await clearState(chatId.toString());
    return;
  }

  logger.warn("Telegram send failed", {
    userId: creds.userId,
    code: result.code,
    to,
  });
  await replyHtml(
    ctx,
    `❌ <b>Send failed</b>\n\n${escapeForDisplay(result.message)}`,
    { reply_markup: sendConfirmKeyboard() }
  );
}

export async function handleSendCancel(ctx: Context): Promise<void> {
  const chatId = ctx.chat?.id;
  if (!chatId) return;
  const userId = await resolveUserIdFromContext(ctx);
  if (userId) {
    await clearState(chatId.toString());
  }
  await answerCb(ctx, "Cancelled");
  await replyHtml(ctx, "Cancelled.", { reply_markup: mainMenuKeyboard() });
}

async function promptForSubject(
  ctx: Context,
  userId: string,
  gmailAddress: string
): Promise<void> {
  const chatId = ctx.chat?.id;
  if (!chatId) return;
  const state = await loadStateForUser(chatId.toString(), userId);
  await saveState(chatId.toString(), userId, {
    step: "awaiting_subject",
    pendingSendTo: gmailAddress,
    pendingInput: null,
  });
  await promptForSubjectWithRecipient(ctx, userId, gmailAddress, state.draftSnapshot ?? "");
}

async function promptForSubjectWithRecipient(
  ctx: Context,
  _userId: string,
  to: string,
  draft: string | undefined,
  extracted?: boolean
): Promise<void> {
  const auto = draft ? extractSubject(draft) : "Email from AutoCompose";
  const extractedNote = extracted ? " (auto-detected from prompt)" : "";
  await replyHtml(
    ctx,
    `📝 <b>Subject</b>\n\n` +
      `To: <code>${escapeForDisplay(to)}</code>${extractedNote}\n\n` +
      `Type a subject, or /skip to use the auto-detected one:\n` +
      `<i>${escapeForDisplay(auto)}</i>`
  );
}

async function showConfirm(
  ctx: Context,
  to: string,
  subject: string,
  body: string
): Promise<void> {
  const preview = body.length > 240 ? `${body.slice(0, 240)}…` : body;
  await replyHtml(
    ctx,
    `📤 <b>Confirm send</b>\n\n` +
      `To: <code>${escapeForDisplay(to)}</code>\n` +
      `Subject: <i>${escapeForDisplay(subject)}</i>\n\n` +
      `<b>Preview:</b>\n${escapeForDisplay(stripSubjectLine(preview))}`,
    { reply_markup: sendConfirmKeyboard() }
  );
}

function escapeForDisplay(s: string): string {
  return s.replace(/[&<>"]/g, (c) =>
    c === "&" ? "&amp;" : c === "<" ? "&lt;" : c === ">" ? "&gt;" : "&quot;"
  );
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
// FILE: src/modules/telegram/flows/send.ts
// ============================================================
// PURPOSE: Implements the multi-step email sending flow via Telegram bot.
// HOW IT WORKS: handleSendStart() validates credentials and moves to "awaiting_recipient".
//   handleSendToMe() shortcuts to subject prompt using the user's Gmail address.
//   handleRecipientInput() validates the email and moves to "awaiting_subject".
//   handleSubjectInput() accepts custom subject or /skip for auto-detected one, then
//   shows confirmation preview. handleSendConfirm() dispatches the email via
//   dispatchSendEmail(), records audit, and shows success/failure. handleSendCancel()
//   clears state and returns to menu. All steps rate-limit sends to 10/hour.
// [SECURITY] Credentials decrypted transiently for SMTP only
// INTEGRATION: Email dispatch, state module, keyboards, rate limiter, audit logger
// ============================================================
