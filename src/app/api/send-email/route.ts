import { NextRequest } from "next/server";
import { success, failure } from "@/utils/api-response";
import { validate } from "@/utils/validation";
import { sendEmailSchema } from "@/modules/email/validation";
import { sendEmail } from "@/modules/email/sender";
import { requireAuth } from "@/lib/auth/session";
import { ownedFilter } from "@/lib/auth/ownership";
import { checkRateLimit } from "@/lib/rate-limit";
import { recordAudit } from "@/lib/audit";
import { AppError } from "@/lib/errors";
import { Profile } from "@/models/profile";
import { connectDB } from "@/lib/db";
import { decrypt } from "@/lib/crypto";
import { logger } from "@/lib/logger";

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();

    const ip = request.headers.get("x-forwarded-for") ?? "unknown";
    checkRateLimit(`send-email:${user.userId}`, { maxRequests: 5, windowMs: 60_000 });

    const body = await request.json();
    const input = validate(sendEmailSchema, body);

    await connectDB();
    const profile = await Profile.findOne(ownedFilter(user.userId))
      .select("emailCredentials");

    if (!profile?.emailCredentials?.encryptedAppPassword || !profile.emailCredentials.gmailAddress) {
      return failure(
        new AppError(
          "CREDENTIALS_NOT_CONFIGURED",
          "Email credentials not configured. Add them in Settings.",
          400
        )
      );
    }

    let appPassword: string;
    try {
      appPassword = decrypt(profile.emailCredentials.encryptedAppPassword);
    } catch (decryptError) {
      logger.error("send-email: decrypt failed", {
        userId: user.userId,
        reason: decryptError instanceof Error ? decryptError.message : "unknown",
      });
      return failure(
        new AppError(
          "CREDENTIALS_DECRYPTION_FAILED",
          "Stored credentials cannot be decrypted. Please re-add them in Settings.",
          500
        )
      );
    }

    try {
      await sendEmail({
        to: input.to,
        subject: input.subject,
        body: input.body,
        gmailAddress: profile.emailCredentials.gmailAddress,
        appPassword,
        senderName: user.name,
      });
    } catch (error) {
      const errName = error instanceof Error ? error.name : "unknown";
      const isAuth = errName === "EAUTH";
      await recordAudit({
        action: "email.send_failed",
        entityType: "EmailSend",
        userId: user.userId,
        ip,
        userAgent: request.headers.get("user-agent") ?? undefined,
        metadata: { to: input.to, reason: errName },
      });
      return failure(
        new AppError(
          isAuth ? "CREDENTIALS_INVALID" : "SEND_FAILED",
          isAuth
            ? "Email or app password is invalid. Update them in Settings."
            : "Could not send the email. Please try again.",
          isAuth ? 400 : 502
        )
      );
    }

    await recordAudit({
      action: "email.sent",
      entityType: "EmailSend",
      userId: user.userId,
      ip,
      userAgent: request.headers.get("user-agent") ?? undefined,
      metadata: {
        to: input.to,
        subjectLength: input.subject.length,
        bodyLength: input.body.length,
      },
    });

    return success({ sent: true });
  } catch (error) {
    return failure(error);
  }
}
