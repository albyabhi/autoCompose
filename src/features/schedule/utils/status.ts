import type { ScheduleData, ScheduledEmailData } from "../types";

type ScheduleLike = Pick<
  ScheduleData,
  "status" | "scheduledAt" | "pendingCount" | "failedCount"
>;

export interface ScheduleStatusDisplay {
  label: string;
  className: string;
}

export function hasProcessableEmails(emails: ScheduledEmailData[]): boolean {
  return emails.some((email) =>
    ["awaiting_content", "ready"].includes(email.deliveryState)
  );
}

export function isDueActiveSchedule(schedule: ScheduleLike, nowMs = Date.now()): boolean {
  return schedule.status === "active" && new Date(schedule.scheduledAt).getTime() <= nowMs;
}

export function shouldTriggerSchedule(schedule: ScheduleLike, nowMs = Date.now()): boolean {
  return isDueActiveSchedule(schedule, nowMs) && (schedule.pendingCount ?? 0) > 0;
}

export function getScheduleStatusDisplay(
  schedule: ScheduleLike,
  nowMs = Date.now()
): ScheduleStatusDisplay {
  if (schedule.status === "active" && isDueActiveSchedule(schedule, nowMs)) {
    return { label: "processing", className: "processing" };
  }

  if (schedule.status === "sent" && (schedule.failedCount ?? 0) > 0) {
    return { label: "completed with failures", className: "failed" };
  }

  return { label: schedule.status, className: schedule.status };
}

// ============================================================
// FILE: src/features/schedule/utils/status.ts
// ============================================================
// PURPOSE: Derives user-facing schedule status and trigger eligibility.
// HOW IT WORKS: Uses schedule status, due time, counts, and item states to show
//   processing/completion labels and decide whether the browser may request a
//   server-side due-schedule processing tick.
// INTEGRATION: Schedule list/detail pages and schedule process mutation hooks.
// ============================================================
