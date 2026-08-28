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
// PURPOSE: The main "write an email" API endpoint — takes a prompt, calls AI, returns a polished email.
// HOW IT WORKS: POST /api/generate:
//   1. Authentication: requireAuth() gets the logged-in user (throws 401 if not logged in).
//   2. Rate limiting: checkRateLimit() allows 10 generations/minute per user (key: "generate:{userId}").
//   3. Validation: Request body validated against generateEmailSchema (prompt, category, modelId, optional temperature/maxTokens/tone/sessionId).
//   4. Generation: Calls generateEmail() service (src/modules/email/service.ts) which handles profile context, conversation history, AI call, and persistence.
//   5. Response: Returns created(201) with {content, modelUsed, id, sessionId, assistantMessageId}.
//   If no sessionId provided, a new session is created automatically.
//   All errors (auth, validation, rate limit, AI failure) are caught and returned as standardized failure responses.
// INTEGRATION: Email service (generateEmail), rate limiter (src/lib/rate-limit.ts), auth (requireAuth), validation (generateEmailSchema from src/modules/email/validation.ts), API response helpers (created/failure from src/utils/api-response.ts).
// ============================================================
