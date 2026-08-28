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
import { T } from "@/modules/telegram/text-constants";
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
    return T.notLinkedError();
  }
  return T.gmailNotConfigured(settingsUrl);
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
      T.noDraft(),
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
      T.rateLimited(),
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
    T.promptRecipient()
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
      T.noDraft(),
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
      T.rateLimited(),
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
      T.invalidEmail()
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
    await replyHtml(ctx, T.flowLost(), {
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
        T.autoSubjectNotDetected()
      );
      return;
    }
    subject = auto;
  } else if (trimmed.length === 0) {
    await replyHtml(
      ctx,
      T.subjectCannotBeEmpty(auto)
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
    await replyHtml(ctx, T.flowLost(), {
      reply_markup: mainMenuKeyboard(),
    });
    return;
  }

  await answerCb(ctx, "Sending...");
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
      T.sent(to, subject),
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
    T.sendFailed(result.message),
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
  await replyHtml(ctx, T.cancelledFlow(), { reply_markup: mainMenuKeyboard() });
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
  const extractedNote = extracted ? "(auto-detected)" : "";
  await replyHtml(
    ctx,
    T.subjectPrompt(to, auto, extractedNote)
  );
}

async function showConfirm(
  ctx: Context,
  to: string,
  subject: string,
  body: string
): Promise<void> {
  const preview = body.length > 240 ? `${body.slice(0, 240)}...` : body;
  await replyHtml(
    ctx,
    `Confirm send\n\n` +
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
// PURPOSE: The step-by-step conversation flow for sending an email in Telegram — from choosing recipient to confirming and sending.
// HOW IT WORKS: Manages state machine (in TelegramState) for sending a composed draft:
//   1. handleSendStart(): User tapped "Send" on a draft. Checks user is linked and has Gmail credentials configured. Rate limits (10 sends/hour). If prompt had an email address, auto-detected it -> jumps to subject prompt. Otherwise -> asks for recipient email (step="awaiting_recipient").
//   2. handleSendToMe(): User tapped "Send to me". Shortcut that uses their own Gmail address as recipient -> jumps to subject prompt.
//   3. handleRecipientInput(): User typed an email. Validates format. If valid -> step="awaiting_subject", shows subject prompt with auto-detected subject from draft.
//   4. handleSubjectInput(): User typed subject or "/skip" to use auto-detected. Validates not empty. If valid -> step="awaiting_send_confirm", shows confirmation preview with To, Subject, and first 240 chars of body.
//   5. handleSendConfirm(): User confirmed. Calls dispatchSendEmail() (email/dispatch.ts) which decrypts credentials, sends via SMTP, logs audit. On success: shows "Sent!", clears state, returns to menu. On failure: shows error, keeps confirm keyboard for retry.
//   6. handleSendCancel(): User cancelled. Clears state, returns to menu.
//   Helpers: resolveUserAndCreds() verifies linked account + Gmail credentials. resolveUserIdFromContext() looks up user ID from chat ID. promptForSubject*() and showConfirm() format messages.
// INTEGRATION: Email dispatch (src/modules/email/dispatch.ts), state module (src/modules/telegram/state.ts), keyboards (sendConfirmKeyboard, mainMenuKeyboard), rate limiter (src/modules/telegram/ratelimit.ts), content parser (extractSubject, stripSubjectLine), audit logging, User/Profile models. Called by webhook.ts and callbacks.ts.
// [SECURITY] Credentials decrypted in memory only for SMTP send; never logged.
// ============================================================
