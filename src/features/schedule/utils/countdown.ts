import type { ScheduleStatus } from "../types";

export type ScheduleCountdownTone = "pending" | "due" | "done" | "blocked";

export interface ScheduleCountdown {
  label: string;
  tone: ScheduleCountdownTone;
  isActiveFuture: boolean;
  isDue: boolean;
}

function plural(value: number, unit: string): string {
  return `${value} ${unit}${value === 1 ? "" : "s"}`;
}

export function formatDuration(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const days = Math.floor(totalSeconds / 86_400);
  const hours = Math.floor((totalSeconds % 86_400) / 3_600);
  const minutes = Math.floor((totalSeconds % 3_600) / 60);
  const seconds = totalSeconds % 60;

  if (days > 0) {
    return `${plural(days, "day")} ${plural(hours, "hour")}`;
  }

  if (hours > 0) {
    return `${plural(hours, "hour")} ${plural(minutes, "minute")}`;
  }

  if (minutes > 0) {
    return `${plural(minutes, "minute")} ${plural(seconds, "second")}`;
  }

  return plural(seconds, "second");
}

export function getScheduleCountdown(
  scheduledAt: string,
  status: ScheduleStatus,
  nowMs = Date.now()
): ScheduleCountdown {
  if (status === "sent") {
    return { label: "Sent", tone: "done", isActiveFuture: false, isDue: false };
  }

  if (status === "cancelled") {
    return { label: "Cancelled", tone: "blocked", isActiveFuture: false, isDue: false };
  }

  if (status === "expired") {
    return { label: "Expired", tone: "blocked", isActiveFuture: false, isDue: false };
  }

  const targetMs = new Date(scheduledAt).getTime();
  if (!Number.isFinite(targetMs)) {
    return { label: "Invalid schedule time", tone: "blocked", isActiveFuture: false, isDue: false };
  }

  const remainingMs = targetMs - nowMs;
  if (remainingMs <= 0) {
    return { label: "Due now", tone: "due", isActiveFuture: false, isDue: true };
  }

  return {
    label: `Sends in ${formatDuration(remainingMs)}`,
    tone: "pending",
    isActiveFuture: true,
    isDue: false,
  };
}

// ============================================================
// FILE: src/features/schedule/utils/countdown.ts
// ============================================================
// PURPOSE: Formats schedule countdown labels for list and detail views.
// HOW IT WORKS: Converts an absolute scheduledAt timestamp and schedule status
//   into a short user-facing label plus tone metadata. Terminal statuses return
//   stable labels, while active future schedules show remaining time.
// INTEGRATION: Used by schedule pages and Vitest countdown unit tests.
// ============================================================
