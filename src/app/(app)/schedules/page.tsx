"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { SkeletonList } from "@/components/ui/skeleton";
import {
  useCreateSchedule,
  useDeleteSchedule,
  useProcessScheduleNow,
  useSchedules,
} from "@/features/schedule/hooks/use-schedules";
import { getScheduleCountdown } from "@/features/schedule/utils/countdown";
import {
  getScheduleStatusDisplay,
  shouldTriggerSchedule,
} from "@/features/schedule/utils/status";
import {
  getBrowserTimezone,
  localPartsToIso,
  ScheduleFormFields,
  toDatetimeLocalParts,
} from "@/features/schedule/components/schedule-form-fields";

export default function SchedulesPage() {
  const { data, isLoading, isError } = useSchedules({ pageSize: 50 });
  const createMutation = useCreateSchedule();
  const initial = toDatetimeLocalParts();
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState("Scheduled Emails");
  const [date, setDate] = useState(initial.date);
  const [time, setTime] = useState(initial.time);
  const [timezone, setTimezone] = useState(getBrowserTimezone());
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [scheduleToDelete, setScheduleToDelete] = useState<{ id: string; name: string; emailCount: number } | null>(null);
  const [nowMs, setNowMs] = useState(() => Date.now());
  const deleteMutation = useDeleteSchedule();
  const processScheduleMutation = useProcessScheduleNow();
  const processingIdsRef = useRef(new Set<string>());
  const lastTriggerMsRef = useRef(new Map<string, number>());

  useEffect(() => {
    const interval = setInterval(() => setNowMs(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const dueSchedules = data?.items.filter((schedule) =>
      shouldTriggerSchedule(schedule, nowMs)
    ) ?? [];

    for (const schedule of dueSchedules) {
      const lastTriggerMs = lastTriggerMsRef.current.get(schedule.id) ?? 0;
      if (processingIdsRef.current.has(schedule.id) || nowMs - lastTriggerMs < 2_000) {
        continue;
      }

      processingIdsRef.current.add(schedule.id);
      lastTriggerMsRef.current.set(schedule.id, nowMs);
      processScheduleMutation.mutate(schedule.id, {
        onSettled: () => {
          processingIdsRef.current.delete(schedule.id);
        },
      });
    }
  }, [data?.items, nowMs, processScheduleMutation]);

  async function handleCreate() {
    await createMutation.mutateAsync({
      name,
      scheduledAt: localPartsToIso(date, time),
      timezone,
    });
    setShowCreate(false);
  }

  async function handleDeleteSchedule() {
    if (!scheduleToDelete) return;
    setDeletingId(scheduleToDelete.id);
    try {
      await deleteMutation.mutateAsync(scheduleToDelete.id);
    } finally {
      setDeletingId(null);
      setShowDeleteConfirm(false);
      setScheduleToDelete(null);
    }
  }

  if (isLoading) {
    return (
      <div className="sessions-page">
        <h1 className="sessions-page__title">Schedules</h1>
        <SkeletonList count={4} />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="sessions-page">
        <h1 className="sessions-page__title">Schedules</h1>
        <div className="settings-message settings-message--error">
          Failed to load schedules. Please try again.
        </div>
      </div>
    );
  }

  const schedules = data?.items ?? [];

  return (
    <div className="sessions-page">
      <div className="sessions-page__header">
        <h1 className="sessions-page__title">Schedules</h1>
        <button className="btn btn--primary" onClick={() => setShowCreate((value) => !value)}>
          New Schedule
        </button>
      </div>

      {showCreate && (
        <div className="schedule-create-card">
          <ScheduleFormFields
            name={name}
            date={date}
            time={time}
            timezone={timezone}
            onNameChange={setName}
            onDateChange={setDate}
            onTimeChange={setTime}
            onTimezoneChange={setTimezone}
          />
          <div className="dialog__actions">
            <Button variant="ghost" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button
              variant="primary"
              onClick={handleCreate}
              disabled={!name.trim() || !date || !time}
              loading={createMutation.isPending}
            >
              Create
            </Button>
          </div>
        </div>
      )}

      {schedules.length === 0 ? (
        <EmptyState
          icon="T"
          title="No schedules yet"
          description="Create a schedule, then add generated emails from single or batch compose."
          action={
            <button className="btn btn--primary" onClick={() => setShowCreate(true)}>
              Create Schedule
            </button>
          }
        />
      ) : (
        <div className="sessions-page__list">
          {schedules.map((schedule) => {
            const isDeleting = deletingId === schedule.id;
            const countdown = getScheduleCountdown(schedule.scheduledAt, schedule.status, nowMs);
            const status = getScheduleStatusDisplay(schedule, nowMs);
            return (
              <Link
                key={schedule.id}
                href={isDeleting ? "#" : `/schedules/${schedule.id}`}
                className={`schedule-card${isDeleting ? " schedule-card--deleting" : ""}`}
                onClick={isDeleting ? (e) => e.preventDefault() : undefined}
                aria-disabled={isDeleting}
              >
                <div className="schedule-card__header">
                  <h2 className="schedule-card__title">{isDeleting ? "Deleting..." : schedule.name}</h2>
                  <div className="schedule-card__actions">
                    <span className={`schedule-status schedule-status--${status.className}`}>
                      {status.label}
                    </span>
                    <button
                      className="btn btn--danger btn--sm"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setScheduleToDelete({
                          id: schedule.id,
                          name: schedule.name,
                          emailCount: schedule.totalCount ?? 0,
                        });
                        setShowDeleteConfirm(true);
                      }}
                      disabled={schedule.status !== "active" || deletingId !== null}
                    >
                      {isDeleting ? "Deleting..." : "Delete"}
                    </button>
                  </div>
                </div>
                <div className="schedule-card__time">
                  {new Date(schedule.scheduledAt).toLocaleString()} ({schedule.timezone})
                </div>
                <div className={`schedule-countdown schedule-countdown--${countdown.tone}`}>
                  {countdown.label}
                </div>
                <div className="schedule-card__stats">
                  <span>{schedule.totalCount ?? 0} emails</span>
                  <span>{schedule.pendingCount ?? 0} pending</span>
                  <span>{schedule.sentCount ?? 0} sent</span>
                  <span>{schedule.failedCount ?? 0} failed</span>
                </div>
              </Link>
            );
          })}
        </div>
      )}

      {showDeleteConfirm && scheduleToDelete && (
        <div className="modal-overlay" onClick={() => setShowDeleteConfirm(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>Delete Schedule?</h3>
            <p>
              Are you sure you want to delete &ldquo;{scheduleToDelete.name}&rdquo;?
              {scheduleToDelete.emailCount > 0 && (
                <> This will cancel the schedule and remove {scheduleToDelete.emailCount} pending email(s). Sent emails will be preserved.</>
              )}
            </p>
            <div className="modal__actions">
              <Button variant="ghost" onClick={() => setShowDeleteConfirm(false)}>
                Cancel
              </Button>
              <Button
                variant="danger"
                onClick={handleDeleteSchedule}
                loading={deleteMutation.isPending}
              >
                Delete
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================
// FILE: src/app/(app)/schedules/page.tsx
// ============================================================
// PURPOSE: Authenticated schedules list and standalone schedule creation page.
// HOW IT WORKS: Fetches schedules with React Query, renders loading/error/empty
//   states, supports a compact create form, shows live send countdowns, and
//   triggers authenticated due-schedule processing while linking to detail.
// INTEGRATION: Schedule hooks, ScheduleFormFields, shared UI components.
// ============================================================
