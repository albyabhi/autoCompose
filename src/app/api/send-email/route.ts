import { NextRequest } from "next/server";
import { success, failure } from "@/utils/api-response";
import { validate } from "@/utils/validation";
import { sendEmailSchema } from "@/modules/email/validation";
import { dispatchSendEmail } from "@/modules/email/dispatch";
import { requireAuth } from "@/lib/auth/session";
import { AppError } from "@/lib/errors";
import { parseFormDataFiles } from "@/utils/attachments";

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();
    const ip = request.headers.get("x-forwarded-for") ?? "unknown";
    const contentType = request.headers.get("content-type") ?? "";

    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      const to = formData.get("to") as string;
      const subject = formData.get("subject") as string;
      const body = formData.get("body") as string;
      const attachments = await parseFormDataFiles(formData, "attachments");

      const input = validate(sendEmailSchema, { to, subject, body });

      const result = await dispatchSendEmail({
        userId: user.userId,
        userName: user.name,
        to: input.to,
        subject: input.subject,
        body: input.body,
        attachments: attachments.length > 0
          ? attachments.map((f) => ({ filename: f.filename, content: f.buffer, contentType: f.contentType }))
          : undefined,
        ip,
        userAgent: request.headers.get("user-agent") ?? undefined,
        rateLimitKey: `send-email:${user.userId}`,
        rateLimit: { maxRequests: 5, windowMs: 60_000 },
      });

      if (result.ok) return success({ sent: true, messageId: result.messageId });
      return failure(new AppError(result.code, result.message, result.status));
    }

    const body = await request.json();
    const input = validate(sendEmailSchema, body);

    const result = await dispatchSendEmail({
      userId: user.userId,
      userName: user.name,
      to: input.to,
      subject: input.subject,
      body: input.body,
      ip,
      userAgent: request.headers.get("user-agent") ?? undefined,
      rateLimitKey: `send-email:${user.userId}`,
      rateLimit: { maxRequests: 5, windowMs: 60_000 },
    });

    if (result.ok) return success({ sent: true });
    return failure(new AppError(result.code, result.message, result.status));
  } catch (error) {
    return failure(error);
  }
}

// ============================================================
// FILE: src/app/api/send-email/route.ts
// ============================================================
// PURPOSE: API endpoint for sending emails via Gmail SMTP (POST /api/send-email).
// HOW IT WORKS: Authenticates the user, validates the request body against
//   sendEmailSchema (to, subject, body), and delegates to dispatchSendEmail()
//   with rate limiting (5 sends/minute). Returns success or wraps dispatch
//   errors as AppError responses with appropriate status codes.
// INTEGRATION: Email dispatch module, auth session, rate limiter
// ============================================================
