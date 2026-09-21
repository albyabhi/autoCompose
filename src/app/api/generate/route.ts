import { NextRequest } from "next/server";
import { created, failure } from "@/utils/api-response";
import { validate } from "@/utils/validation";
import { generateEmailSchema } from "@/modules/email/validation";
import { generateEmail, generateGuestEmail } from "@/modules/email/service";
import { checkRateLimit } from "@/lib/rate-limit";
import { requireAuth } from "@/lib/auth/session";
import { UnauthorizedError } from "@/lib/errors";
import { GUEST_HEADER } from "@/lib/guest";

function isGuestRequest(request: NextRequest, body: Record<string, unknown>): boolean {
  return request.headers.get(GUEST_HEADER) === "1" || body.guest === true;
}

export async function POST(request: NextRequest) {
  try {
    const rawBody: Record<string, unknown> = await request.json();

    let user = null;
    try {
      user = await requireAuth();
    } catch (authError) {
      if (!(authError instanceof UnauthorizedError) || !isGuestRequest(request, rawBody)) {
        throw authError;
      }
      // Guest trial path: stateless generation, no session persistence.
      // Guests must never send a sessionId (no history leak across users).
      if (typeof rawBody.sessionId === "string" && rawBody.sessionId.length > 0) {
        throw new UnauthorizedError("Please login to continue conversations");
      }
      const ip = request.headers.get("x-forwarded-for") ?? "unknown";
      checkRateLimit(`generate:guest:${ip}`, { maxRequests: 20, windowMs: 60_000 });

      const input = validate(generateEmailSchema, rawBody);
      const result = await generateGuestEmail({
        prompt: input.prompt,
        category: input.category,
        modelId: input.modelId,
        temperature: input.temperature,
        maxTokens: input.maxTokens,
        tone: input.tone,
        ip,
        userAgent: request.headers.get("user-agent") ?? undefined,
      });

      return created(result);
    }

    const ip = request.headers.get("x-forwarded-for") ?? "unknown";
    checkRateLimit(`generate:${user.userId}`);

    const input = validate(generateEmailSchema, rawBody);

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
//   1. Authentication: requireAuth() gets the logged-in user (authed path unchanged:
//      10 generations/minute per user, full persistence via generateEmail()).
//   2. Guest trial: when requireAuth() throws UNAUTHORIZED and the request carries
//      `x-guest: 1` (or body.guest=true), falls through to generateGuestEmail() —
//      stateless AI call, no Session/Message/Template writes, IP-throttled at
//      20/min as an abuse backstop (the 5-mail cap itself is client-enforced).
//      Guest requests with a sessionId are rejected (no cross-user history).
//   3. Validation: Request body validated against generateEmailSchema (prompt,
//      category, modelId, optional temperature/maxTokens/tone/sessionId/guest).
//   4. Response: Returns created(201) with {content, modelUsed, ...} (+ guest:true
//      for trial calls). All errors returned as standardized failure responses.
// INTEGRATION: Email service (generateEmail/generateGuestEmail), rate limiter (src/lib/rate-limit.ts), auth (requireAuth), guest header const (src/lib/guest.ts), validation (generateEmailSchema from src/modules/email/validation.ts), API response helpers (created/failure from src/utils/api-response.ts).
// ============================================================
