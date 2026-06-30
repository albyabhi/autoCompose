import { NextRequest } from "next/server";
import { created, failure } from "@/utils/api-response";
import { validate } from "@/utils/validation";
import { generateEmailSchema } from "@/modules/email/validation";
import { generateEmail } from "@/modules/email/service";
import { checkRateLimit } from "@/lib/rate-limit";
import { requireAuth } from "@/lib/auth/session";

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();

    const ip = request.headers.get("x-forwarded-for") ?? "unknown";
    checkRateLimit(`generate:${user.userId}`);

    const body = await request.json();
    const input = validate(generateEmailSchema, body);

    const result = await generateEmail({
      prompt: input.prompt,
      category: input.category,
      modelId: input.modelId,
      temperature: input.temperature,
      maxTokens: input.maxTokens,
      tone: input.tone,
      userId: user.userId,
      sessionId: input.sessionId,
      ip,
      userAgent: request.headers.get("user-agent") ?? undefined,
    });

    return created(result);
  } catch (error) {
    return failure(error);
  }
}

// ============================================================
// FILE: src/app/api/generate/route.ts
// ============================================================
// PURPOSE: API endpoint for generating AI-powered emails (POST /api/generate).
// HOW IT WORKS: Authenticates the user via requireAuth(), applies rate limiting
//   (10 requests/minute per user), validates the request body against
//   generateEmailSchema, and delegates to generateEmail() service. Returns
//   the generated email content, model used, and session ID. Creates a new
//   session if no sessionId is provided.
// INTEGRATION: Email service, rate limiter, auth session, Zod validation
// ============================================================
