import { describe, expect, it } from "vitest";
import { formatDuration, getScheduleCountdown } from "./countdown";

describe("schedule countdown", () => {
  it("formats compact durations", () => {
    expect(formatDuration(4_000)).toBe("4 seconds");
    expect(formatDuration(65_000)).toBe("1 minute 5 seconds");
    expect(formatDuration(7_260_000)).toBe("2 hours 1 minute");
    expect(formatDuration(93_600_000)).toBe("1 day 2 hours");
  });

  it("shows active future schedules as a send countdown", () => {
    const countdown = getScheduleCountdown(
      "2035-01-01T10:00:00.000Z",
      "active",
      Date.parse("2035-01-01T09:58:30.000Z")
    );

    expect(countdown).toMatchObject({
      label: "Sends in 1 minute 30 seconds",
      tone: "pending",
      isActiveFuture: true,
      isDue: false,
    });
  });

  it("shows active past schedules as due now", () => {
    const countdown = getScheduleCountdown(
      "2035-01-01T09:00:00.000Z",
      "active",
      Date.parse("2035-01-01T09:00:01.000Z")
    );

    expect(countdown).toMatchObject({
      label: "Due now",
      tone: "due",
      isDue: true,
    });
  });

  it("shows terminal schedule status labels", () => {
    expect(getScheduleCountdown("2035-01-01T09:00:00.000Z", "sent").label).toBe("Sent");
    expect(getScheduleCountdown("2035-01-01T09:00:00.000Z", "cancelled").label).toBe("Cancelled");
    expect(getScheduleCountdown("2035-01-01T09:00:00.000Z", "expired").label).toBe("Expired");
  });
});

// ============================================================
// FILE: src/features/schedule/utils/countdown.test.ts
// ============================================================
// PURPOSE: Unit tests for schedule countdown formatting.
// HOW IT WORKS: Exercises duration formatting, future active countdowns, due
//   active schedules, and terminal status labels with fixed timestamps.
// INTEGRATION: Vitest and schedule countdown utility.
// ============================================================
