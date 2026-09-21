import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { UnauthorizedError } from "@/lib/errors";
import { clearRateLimitStore } from "@/lib/rate-limit";

const mocks = vi.hoisted(() => ({
  requireAuth: vi.fn(),
  generateEmail: vi.fn(),
  generateGuestEmail: vi.fn(),
}));

vi.mock("@/lib/auth/session", () => ({
  requireAuth: mocks.requireAuth,
  getServerSession: vi.fn(),
}));

vi.mock("@/modules/email/service", () => ({
  generateEmail: mocks.generateEmail,
  generateGuestEmail: mocks.generateGuestEmail,
}));

vi.mock("@/lib/logger", () => ({
  logger: { warn: vi.fn(), info: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

import { POST } from "./route";

function guestRequest(body: Record<string, unknown>, headers: Record<string, string> = {}) {
  return new NextRequest("http://localhost/api/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-guest": "1", ...headers },
    body: JSON.stringify(body),
  });
}

const prompt = "Write a polite leave request email to my manager for three days off next week.";

describe("POST /api/generate guest trial", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearRateLimitStore();
  });

  it("serves stateless generation for guests without a session", async () => {
    mocks.requireAuth.mockRejectedValue(new UnauthorizedError());
    mocks.generateGuestEmail.mockResolvedValue({
      content: "Subject: Leave Request\n\nBody",
      modelUsed: "openai/gpt-oss-20b",
      guest: true,
    });

    const res = await POST(guestRequest({ prompt, guest: true }));
    const data = await res.json();

    expect(res.status).toBe(201);
    expect(data.success).toBe(true);
    expect(data.data.guest).toBe(true);
    expect(mocks.generateGuestEmail).toHaveBeenCalledTimes(1);
    expect(mocks.generateEmail).not.toHaveBeenCalled();
    const params = mocks.generateGuestEmail.mock.calls[0][0];
    expect(params.prompt).toBe(prompt);
    expect(params.sessionId).toBeUndefined();
  });

  it("accepts the header-only guest signal", async () => {
    mocks.requireAuth.mockRejectedValue(new UnauthorizedError());
    mocks.generateGuestEmail.mockResolvedValue({ content: "Hi", modelUsed: "openai/gpt-oss-20b", guest: true });

    const res = await POST(guestRequest({ prompt }));
    expect(res.status).toBe(201);
  });

  it("rejects guest requests carrying a sessionId (no history leak)", async () => {
    mocks.requireAuth.mockRejectedValue(new UnauthorizedError());

    const res = await POST(guestRequest({ prompt, guest: true, sessionId: "sess_123" }));
    const data = await res.json();

    expect(res.status).toBe(401);
    expect(data.success).toBe(false);
    expect(mocks.generateGuestEmail).not.toHaveBeenCalled();
  });

  it("rejects anonymous callers without a guest signal", async () => {
    mocks.requireAuth.mockRejectedValue(new UnauthorizedError());

    const res = await POST(
      new NextRequest("http://localhost/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
      })
    );
    const data = await res.json();

    expect(res.status).toBe(401);
    expect(data.error.code).toBe("UNAUTHORIZED");
    expect(mocks.generateGuestEmail).not.toHaveBeenCalled();
  });

  it("keeps the authed path unchanged (persistence via generateEmail)", async () => {
    mocks.requireAuth.mockResolvedValue({ userId: "u1", email: "a@b.c" });
    mocks.generateEmail.mockResolvedValue({
      content: "Hello",
      modelUsed: "openai/gpt-oss-20b",
      id: "t1",
      sessionId: "s1",
    });

    const res = await POST(
      new NextRequest("http://localhost/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
      })
    );
    const data = await res.json();

    expect(res.status).toBe(201);
    expect(data.data.sessionId).toBe("s1");
    expect(mocks.generateEmail).toHaveBeenCalledTimes(1);
    expect(mocks.generateGuestEmail).not.toHaveBeenCalled();
  });

  it("validates guest prompts before spending AI (short prompt -> 400)", async () => {
    mocks.requireAuth.mockRejectedValue(new UnauthorizedError());

    const res = await POST(guestRequest({ prompt: "short", guest: true }));
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error.code).toBe("VALIDATION_ERROR");
    expect(mocks.generateGuestEmail).not.toHaveBeenCalled();
  });
});

// ============================================================
// FILE: src/app/api/generate/route.guest.test.ts
// ============================================================
// PURPOSE: Guest-trial coverage for POST /api/generate (stateless branch + guards).
// HOW IT WORKS: Mocks requireAuth (throw UNAUTHORIZED for guests) and the email
//   service; asserts guest generation succeeds without persistence, sessionId is
//   rejected, anonymous non-guest callers get 401, authed flow still persists,
//   and invalid prompts fail validation before any AI call.
// INTEGRATION: Covers src/app/api/generate/route.ts guest branch.
// ============================================================
