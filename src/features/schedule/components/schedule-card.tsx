"use client";

import Link from "next/link";
import type { ScheduleData } from "../types";
import { getScheduleCountdown } from "../utils/countdown";
import { getScheduleStatusDisplay } from "../utils/status";

interface ScheduleCardProps {
  schedule: ScheduleData;
  nowMs: number;
  isDeleting: boolean;
  deleteDisabled: boolean;
  onDelete: (schedule: { id: string; name: string; emailCount: number }) => void;
}

function formatScheduleDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "Invalid date";
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

export function ScheduleCard({ schedule, nowMs, isDeleting, deleteDisabled, onDelete }: ScheduleCardProps) {
  const countdown = getScheduleCountdown(schedule.scheduledAt, schedule.status, nowMs);
  const status = getScheduleStatusDisplay(schedule, nowMs);
  const total = schedule.totalCount ?? 0;
  const sent = schedule.sentCount ?? 0;
  const failed = schedule.failedCount ?? 0;
  const pending = schedule.pendingCount ?? 0;
  const progressPct = total > 0 ? Math.round((sent / total) * 100) : 0;
  const needsAttention = failed > 0;
  const tone =
    schedule.status === "sent" && !needsAttention
      ? "done"
      : needsAttention
        ? "attention"
        : schedule.status === "active"
          ? "scheduled"
          : "muted";

  return (
    <article
      className={`schedule-card-v2 schedule-card-v2--${tone}${isDeleting ? " schedule-card-v2--deleting" : ""}`}
      aria-busy={isDeleting}
    >
      <div className="schedule-card-v2__banner" aria-hidden="true" />
      <div className="schedule-card-v2__body">
        <div className="schedule-card-v2__top">
          <h2 className="schedule-card-v2__title">{isDeleting ? "Deleting…" : schedule.name}</h2>
          <span className={`schedule-status schedule-status--${status.className}`}>{status.label}</span>
        </div>

        <div className="schedule-card-v2__meta">
          <span className="schedule-card-v2__date">
            {formatScheduleDate(schedule.scheduledAt)}
          </span>
          <span className="schedule-card-v2__tz" title={`Timezone: ${schedule.timezone}`}>
            {schedule.timezone}
          </span>
          {(countdown.isActiveFuture || countdown.isDue) && (
            <span className={`schedule-countdown schedule-countdown--${countdown.tone}`}>
              {countdown.label}
            </span>
          )}
        </div>

        <div className="schedule-card-v2__progress-wrap">
          <div className="schedule-card-v2__progress-head">
            <span>
              {sent} of {total} sent
            </span>
            <span>{progressPct}%</span>
          </div>
          <div
            className="schedule-card-v2__progress"
            role="progressbar"
            aria-valuenow={progressPct}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={`${sent} of ${total} emails sent`}
          >
            <div className="schedule-card-v2__progress-fill" style={{ width: `${progressPct}%` }} />
          </div>
        </div>

        <div className="schedule-card-v2__chips">
          <span className="stat-chip">{total} total</span>
          <span className="stat-chip stat-chip--pending">{pending} pending</span>
          <span className="stat-chip stat-chip--sent">{sent} sent</span>
          <span className={`stat-chip${needsAttention ? " stat-chip--failed" : ""}`}>
            {failed} failed
          </span>
        </div>

        <div className="schedule-card-v2__actions">
          <Link
            href={isDeleting ? "#" : `/schedules/${schedule.id}`}
            className="btn btn--primary btn--sm schedule-card-v2__view"
            onClick={isDeleting ? (e) => e.preventDefault() : undefined}
            aria-disabled={isDeleting}
          >
            Open
          </Link>
          <button
            type="button"
            className="btn btn--danger btn--sm"
            disabled={deleteDisabled || isDeleting}
            onClick={() =>
              onDelete({ id: schedule.id, name: schedule.name, emailCount: total })
            }
          >
            {isDeleting ? "Deleting…" : "Delete"}
          </button>
        </div>
      </div>
    </article>
  );
}

// ============================================================
// FILE: src/features/schedule/components/schedule-card.tsx
// ============================================================
// PURPOSE: Readable schedule card with banner, progress, chips, actions.
// HOW IT WORKS: Derives status/countdown via shared utils, formats date for
//   humans, renders sent/total progress bar and count chips, exposes View
//   link plus Delete button as siblings (no nested interactive elements).
// PROPS: schedule, nowMs, isDeleting, deleteDisabled, onDelete callback.
// INTEGRATION: Schedules list page with schedule-filter-tabs and globals.css.
// ============================================================
