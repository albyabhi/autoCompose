import "server-only";
import { connectDB } from "@/lib/db";
import { Profile } from "@/models/profile";
import { User } from "@/models/user";
import { decrypt } from "@/lib/crypto";
import { sendEmail } from "@/modules/email/sender";
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
  try {
    appPassword = decrypt(profile.emailCredentials.encryptedAppPassword);
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
// PURPOSE: High-level email sending orchestrator with validation, auth, and audit.
// HOW IT WORKS: dispatchSendEmail() validates the recipient email, subject length,
//   and body length. Applies rate limiting if configured. Fetches the user's
//   encrypted Gmail credentials from their Profile, decrypts the app password
//   using crypto.ts, and calls sender.ts to send via SMTP. Records audit entries
//   for both success (email.sent) and failure (email.send_failed). Returns a
//   typed result discriminated by ok:true/false with specific error codes.
// [SECURITY] Decrypts credentials in memory only, never persists plaintext
// INTEGRATION: Profile model (encrypted credentials), crypto.ts, sender.ts,
//   rate limiter, audit logger. Used by Telegram send flow and API route.
// ============================================================
