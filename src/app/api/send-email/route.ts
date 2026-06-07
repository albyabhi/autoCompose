import { NextRequest } from "next/server";
import { success, failure } from "@/utils/api-response";
import { validate } from "@/utils/validation";
import { sendEmailSchema } from "@/modules/email/validation";
import { dispatchSendEmail } from "@/modules/email/dispatch";
import { requireAuth } from "@/lib/auth/session";
import { AppError } from "@/lib/errors";

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();

    const ip = request.headers.get("x-forwarded-for") ?? "unknown";
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
