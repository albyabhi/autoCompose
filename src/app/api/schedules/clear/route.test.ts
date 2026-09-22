import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { UnauthorizedError } from "@/lib/errors";

const mocks = vi.hoisted(() => ({
  requireAuth: vi.fn(),
  clearAllSchedules: vi.fn(),
  recordAudit: vi.fn(),
}));

vi.mock("@/lib/auth/session", () => ({
  requireAuth: mocks.requireAuth,
  getServerSession: vi.fn(),
}));

vi.mock("@/modules/schedule/service", () => ({
  clearAllSchedules: mocks.clearAllSchedules,
}));

vi.mock("@/lib/audit", () => ({
  recordAudit: mocks.recordAudit,
}));

vi.mock("@/lib/logger", () => ({
  logger: { warn: vi.fn(), info: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

import { POST } from "./route";

function clearRequest() {
  return new NextRequest("http://localhost/api/schedules/clear", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({}),
  });
}

describe("POST /api/schedules/clear", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireAuth.mockResolvedValue({ userId: "user-1" });
    mocks.clearAllSchedules.mockResolvedValue({ clearedSchedules: 2, clearedEmails: 5 });
    mocks.recordAudit.mockResolvedValue(undefined);
  });

  it("hard-deletes everything and returns counts", async () => {
    const res = await POST(clearRequest());
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data).toEqual({ clearedSchedules: 2, clearedEmails: 5 });
    expect(mocks.clearAllSchedules).toHaveBeenCalledWith("user-1");
    expect(mocks.recordAudit).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "schedule.bulk_deleted",
        entityType: "Schedule",
        userId: "user-1",
        metadata: { clearedSchedules: 2, clearedEmails: 5 },
      })
    );
  });

  it("rejects unauthenticated callers", async () => {
    mocks.requireAuth.mockRejectedValue(new UnauthorizedError());
    const res = await POST(clearRequest());
    const data = await res.json();

    expect(data.success).toBe(false);
    expect(mocks.clearAllSchedules).not.toHaveBeenCalled();
  });
});

// ============================================================
// FILE: src/app/api/schedules/clear/route.test.ts
// ============================================================
// PURPOSE: Contract tests for the schedules Clear All endpoint.
// HOW IT WORKS: Mocks auth, the schedule service, and audit, then asserts
//   the success envelope carries deletion counts and the bulk audit fires,
//   plus that unauthenticated callers never reach the service.
// INTEGRATION: Vitest with vi.hoisted mocks, mirroring route test idioms.
// ============================================================
