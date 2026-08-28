import "server-only";
import { connectDB } from "@/lib/db";
import { Profile } from "@/models/profile";
import { User } from "@/models/user";
import { decryptV1, decryptV2, type EncryptedV2 } from "@/lib/crypto";
import { migrateUserCredentialsToV2 } from "@/modules/profile/service";
import { sendEmail, type NodemailerAttachment } from "@/modules/email/sender";
import { checkRateLimit } from "@/lib/rate-limit";
import { recordAudit } from "@/lib/audit";
import { logger } from "@/lib/logger";

export type DispatchSendEmailCode =
  | "VALIDATION_ERROR"
  | "RATE_LIMIT"
  | "CREDENTIALS_NOT_CONFIGURED"
  | "CREDENTIALS_INVALID"
  | "CREDENTIALS_DECRYPTION_FAILED"
  | "SEND_FAILED"
  | "USER_NOT_FOUND";

export interface DispatchSendEmailInput {
  userId: string;
  userName?: string | null;
  to: string;
  subject: string;
  body: string;
  ip?: string;
  userAgent?: string;
  rateLimitKey?: string;
  rateLimit?: { maxRequests: number; windowMs: number };
  attachments?: NodemailerAttachment[];
}

export type DispatchSendEmailResult =
  | { ok: true; messageId: string }
  | { ok: false; code: DispatchSendEmailCode; message: string; status: number };

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateRecipientEmail(value: string): boolean {
  return EMAIL_REGEX.test(value.trim());
}

export async function dispatchSendEmail(
  input: DispatchSendEmailInput
): Promise<DispatchSendEmailResult> {
  if (!validateRecipientEmail(input.to)) {
    return {
      ok: false,
      code: "VALIDATION_ERROR",
      message: "Recipient must be a valid email address.",
      status: 400,
    };
  }
  const subject = input.subject.trim();
  if (subject.length === 0 || subject.length > 200) {
    return {
      ok: false,
      code: "VALIDATION_ERROR",
      message: "Subject must be 1-200 characters.",
      status: 400,
    };
  }
  const body = input.body;
  if (body.length === 0 || body.length > 20000) {
    return {
      ok: false,
      code: "VALIDATION_ERROR",
      message: "Body must be 1-20000 characters.",
      status: 400,
    };
  }

  if (input.rateLimitKey && input.rateLimit) {
    try {
      checkRateLimit(input.rateLimitKey, input.rateLimit);
    } catch {
      return {
        ok: false,
        code: "RATE_LIMIT",
        message: "Too many send attempts. Please wait and try again.",
        status: 429,
      };
    }
  }

  await connectDB();

  const user = await User.findById(input.userId).select("_id email name").lean();
  if (!user) {
    return {
      ok: false,
      code: "USER_NOT_FOUND",
      message: "User not found.",
      status: 404,
    };
  }

  const profile = await Profile.findOne({ userId: input.userId })
    .select("emailCredentials")
    .lean();

  if (!profile?.emailCredentials?.encryptedAppPassword || !profile.emailCredentials.gmailAddress) {
    return {
      ok: false,
      code: "CREDENTIALS_NOT_CONFIGURED",
      message: "Email credentials not configured. Add them in Settings.",
      status: 400,
    };
  }

  let appPassword: string;
  let needsMigration = false;
  try {
    const creds = profile.emailCredentials!;
    if (creds.encryptedDek && typeof creds.dekVersion === "number") {
      const payload: EncryptedV2 = {
        version: "v2",
        encryptedDek: creds.encryptedDek,
        encryptedData: creds.encryptedAppPassword!,
        dekVersion: creds.dekVersion,
      };
      appPassword = decryptV2(payload, input.userId);
    } else if (creds.encryptedAppPassword) {
      appPassword = decryptV1(creds.encryptedAppPassword);
      needsMigration = true;
    } else {
      return {
        ok: false,
        code: "CREDENTIALS_NOT_CONFIGURED",
        message: "Email credentials not configured. Add them in Settings.",
        status: 400,
      };
    }
  } catch (decryptError) {
    logger.error("dispatchSendEmail: decrypt failed", {
      userId: input.userId,
      reason: decryptError instanceof Error ? decryptError.message : "unknown",
    });
    return {
      ok: false,
      code: "CREDENTIALS_DECRYPTION_FAILED",
      message: "Stored credentials cannot be decrypted. Please re-add them in Settings.",
      status: 500,
    };
  }

  const senderName = input.userName ?? (user as { name?: string | null }).name ?? null;

  try {
    const { messageId } = await sendEmail({
      to: input.to.trim(),
      subject,
      body,
      gmailAddress: profile.emailCredentials.gmailAddress,
      appPassword,
      senderName: senderName ?? undefined,
      attachments: input.attachments,
    });
    await recordAudit({
      action: "email.sent",
      entityType: "EmailSend",
      userId: input.userId,
      ip: input.ip,
      userAgent: input.userAgent,
      metadata: {
        to: input.to.trim(),
        subjectLength: subject.length,
        bodyLength: body.length,
        source: "telegram",
      },
    });
    if (needsMigration) {
      void migrateUserCredentialsToV2(input.userId);
    }
    return { ok: true, messageId };
  } catch (error) {
    const errName = error instanceof Error ? error.name : "unknown";
    const isAuth = errName === "EAUTH";
    await recordAudit({
      action: "email.send_failed",
      entityType: "EmailSend",
      userId: input.userId,
      ip: input.ip,
      userAgent: input.userAgent,
      metadata: { to: input.to.trim(), reason: errName, source: "telegram" },
    });
    return {
      ok: false,
      code: isAuth ? "CREDENTIALS_INVALID" : "SEND_FAILED",
      message: isAuth
        ? "Email or app password is invalid. Update them in Settings."
        : "Could not send the email. Please try again.",
      status: isAuth ? 400 : 502,
    };
  }
}

// ============================================================
// FILE: src/modules/email/dispatch.ts
// ============================================================
// PURPOSE: The complete "send email" workflow — validates input, checks rate limits, decrypts user's Gmail credentials, sends via SMTP, and logs everything.
// HOW IT WORKS: dispatchSendEmail() is the single entry point for sending emails from anywhere in the app (web UI, Telegram bot, scheduled sends, bulk sends):
//   1. Validation: Checks recipient is a valid email, subject 1-200 chars, body 1-20000 chars.
//   2. Rate limiting: Optional per-user rate limit (default 5 emails/minute) to protect Gmail reputation.
//   3. Credential lookup: Fetches user's Profile to find their Gmail address and encrypted app password.
//   4. Decryption: Detects v1 (legacy) vs v2 (envelope) format. v2: decrypts DEK with user-specific KEK, then decrypts password with DEK. v1: decrypts with global key. If v1, flags for lazy migration.
//   5. Send: Calls sender.ts with decrypted password. On success, logs audit "email.sent". If v1 was used, triggers background migration to v2.
//   6. Error handling: Distinguishes auth failures (bad password -> "CREDENTIALS_INVALID", user must re-enter) from network/send failures ("SEND_FAILED", retryable).
//   Returns a discriminated union: {ok: true, messageId} or {ok: false, code, message, status}.
// [SECURITY] Server-only. Decrypts credentials in memory only — never logs or persists plaintext. v2 envelope encryption isolates blast radius.
// INTEGRATION: Profile model (credentials), crypto.ts (decryptV1/V2), profile/service.ts (migrateUserCredentialsToV2), sender.ts (SMTP), rate-limit.ts (checkRateLimit), audit.ts (recordAudit). Called by: API route (src/app/api/send-email/route.ts), Telegram send flow (src/modules/telegram/flows/send.ts), bulk send (src/modules/bulk/service.ts), schedule processor (src/modules/schedule/service.ts).
// ============================================================
