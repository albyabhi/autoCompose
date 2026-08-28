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
// PURPOSE: The "send this email" API endpoint — delivers a composed email via Gmail SMTP using the user's stored credentials.
// HOW IT WORKS: POST /api/send-email (supports both JSON and multipart/form-data for attachments):
//   1. Authentication: requireAuth() gets the logged-in user.
//   2. Request parsing: If multipart/form-data, extracts to/subject/body from form fields and attachments from files. If JSON, parses body directly.
//   3. Validation: sendEmailSchema validates to (email), subject (1-200 chars), body (1-20000 chars).
//   4. Sending: Calls dispatchSendEmail() (src/modules/email/dispatch.ts) which:
//      - Rate limits: 5 sends/minute per user.
//      - Fetches user's Gmail credentials from Profile, decrypts (v1 or v2 envelope).
//      - Sends via SMTP (sender.ts).
//      - Logs audit on success/failure.
//      - Triggers v1->v2 migration if legacy credentials used.
//   5. Response: success(200) with {sent: true, messageId} or failure with error code/message/status.
//   Attachments: FormData files converted to {filename, buffer, contentType} and passed to dispatch.
// INTEGRATION: Email dispatch (dispatchSendEmail), auth (requireAuth), rate limiter, attachment parser (src/utils/attachments.ts), API response helpers, AppError for typed errors.
// ============================================================
