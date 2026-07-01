import { describe, expect, it } from "vitest";
import {
  getScheduleStatusDisplay,
  hasProcessableEmails,
  shouldTriggerSchedule,
} from "./status";
import type { ScheduledEmailData } from "../types";

const dueSchedule = {
  status: "active" as const,
  scheduledAt: "2035-01-01T09:00:00.000Z",
  pendingCount: 1,
  failedCount: 0,
};

function email(deliveryState: ScheduledEmailData["deliveryState"]): ScheduledEmailData {
  return {
    id: deliveryState,
    scheduleId: "schedule",
    userId: "user",
    sourceType: "single",
    to: "alex@example.com",
    deliveryState,
    sortOrder: 0,
    createdAt: "2035-01-01T08:00:00.000Z",
    updatedAt: "2035-01-01T08:00:00.000Z",
  };
}

describe("schedule status utilities", () => {
  it("allows page triggering only for active due schedules with pending work", () => {
    expect(shouldTriggerSchedule(dueSchedule, Date.parse("2035-01-01T09:00:01.000Z"))).toBe(true);
    expect(shouldTriggerSchedule(dueSchedule, Date.parse("2035-01-01T08:59:59.000Z"))).toBe(false);
    expect(shouldTriggerSchedule({ ...dueSchedule, pendingCount: 0 }, Date.parse("2035-01-01T09:00:01.000Z"))).toBe(false);
    expect(shouldTriggerSchedule({ ...dueSchedule, status: "sent" }, Date.parse("2035-01-01T09:00:01.000Z"))).toBe(false);
  });

  it("shows due active schedules as processing", () => {
    expect(getScheduleStatusDisplay(dueSchedule, Date.parse("2035-01-01T09:00:01.000Z"))).toEqual({
      label: "processing",
      className: "processing",
    });
  });

  it("shows sent schedules with failed items as completed with failures", () => {
    expect(getScheduleStatusDisplay({
      ...dueSchedule,
      status: "sent",
      failedCount: 1,
    })).toEqual({
      label: "completed with failures",
      className: "failed",
    });
  });

  it("detects only ready or awaiting content items as processable", () => {
    expect(hasProcessableEmails([email("ready")])).toBe(true);
    expect(hasProcessableEmails([email("awaiting_content")])).toBe(true);
    expect(hasProcessableEmails([email("sending"), email("sent"), email("failed")])).toBe(false);
  });
});

// ============================================================
// FILE: src/features/schedule/utils/status.test.ts
// ============================================================
// PURPOSE: Unit tests for schedule status and page-trigger eligibility helpers.
// HOW IT WORKS: Uses fixed timestamps and minimal scheduled email fixtures to
//   verify due-trigger checks, processing labels, failure labels, and processable
//   item detection.
// INTEGRATION: Vitest and schedule status utility.
// ============================================================
