"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { SkeletonList } from "@/components/ui/skeleton";
import {
  useClearAllSchedules,
  useCreateSchedule,
  useDeleteSchedule,
  useProcessScheduleNow,
  useSchedules,
} from "@/features/schedule/hooks/use-schedules";
import { shouldTriggerSchedule } from "@/features/schedule/utils/status";
import {
  getBrowserTimezone,
  localPartsToIso,
  ScheduleFormFields,
  toDatetimeLocalParts,
} from "@/features/schedule/components/schedule-form-fields";
import { ScheduleCard } from "@/features/schedule/components/schedule-card";
import {
  ScheduleFilterTabs,
  type ScheduleListFilter,
} from "@/features/schedule/components/schedule-filter-tabs";

const FILTER_COPY: Record<ScheduleListFilter, { title: string; description: string }> = {
  all: {
    title: "No schedules yet",
    description: "Create a schedule, then add emails from single or batch compose.",
  },
  scheduled: {
    title: "No scheduled emails",
    description: "Upcoming schedules will appear here.",
  },
  sent: {
    title: "No sent schedules",
    description: "Completed schedules will appear here.",
  },
  failed: {
    title: "No failed emails",
    description: "Schedules with failed emails will appear here.",
  },
};

export default function SchedulesPage() {
  const { data, isLoading, isError } = useSchedules({ pageSize: 50 });
  const createMutation = useCreateSchedule();
  const initial = toDatetimeLocalParts();
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState("Scheduled Emails");
  const [date, setDate] = useState(initial.date);
  const [time, setTime] = useState(initial.time);
  const [timezone, setTimezone] = useState(getBrowserTimezone());
  const [filter, setFilter] = useState<ScheduleListFilter>("all");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showClearAllConfirm, setShowClearAllConfirm] = useState(false);
  const [clearResult, setClearResult] = useState<string | null>(null);
  const [clearError, setClearError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [scheduleToDelete, setScheduleToDelete] = useState<{ id: string; name: string; emailCount: number } | null>(null);
  const [nowMs, setNowMs] = useState(() => Date.now());
  const deleteMutation = useDeleteSchedule();
  const clearAllMutation = useClearAllSchedules();
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

  const schedules = useMemo(() => data?.items ?? [], [data?.items]);

  const counts = useMemo(
    () => ({
      all: schedules.length,
      scheduled: schedules.filter((s) => s.status === "active").length,
      sent: schedules.filter((s) => s.status === "sent").length,
      failed: schedules.filter((s) => (s.failedCount ?? 0) > 0).length,
    }),
    [schedules]
  );

  const visibleSchedules = useMemo(() => {
    switch (filter) {
      case "scheduled":
        return schedules.filter((s) => s.status === "active");
      case "sent":
        return schedules.filter((s) => s.status === "sent");
      case "failed":
        return schedules.filter((s) => (s.failedCount ?? 0) > 0);
      default:
        return schedules;
    }
  }, [schedules, filter]);

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
      setClearResult(null);
    } finally {
      setDeletingId(null);
      setShowDeleteConfirm(false);
      setScheduleToDelete(null);
    }
  }

  async function handleClearAllSchedules() {
    setClearResult(null);
    setClearError(null);
    try {
      const result = await clearAllMutation.mutateAsync();
      setFilter("all");
      setClearResult(
        `Deleted ${result.clearedSchedules} schedule${result.clearedSchedules !== 1 ? "s" : ""} and ${result.clearedEmails} email${result.clearedEmails !== 1 ? "s" : ""}.`
      );
    } catch (error) {
      setClearError(error instanceof Error ? error.message : "Failed to clear schedules");
    } finally {
      setShowClearAllConfirm(false);
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

  const copy = FILTER_COPY[filter];

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
          title={copy.title}
          description={copy.description}
          action={
            <button className="btn btn--primary" onClick={() => setShowCreate(true)}>
              Create Schedule
            </button>
          }
        />
      ) : (
        <>
          <ScheduleFilterTabs value={filter} counts={counts} onChange={setFilter} />
          <p className="schedule-filter-hint" aria-live="polite">
            {visibleSchedules.length} of {schedules.length} schedules.
          </p>
          {visibleSchedules.length === 0 ? (
            <EmptyState title={copy.title} description={copy.description} />
          ) : (
            <div className="sessions-page__list">
              {visibleSchedules.map((schedule) => (
                <ScheduleCard
                  key={schedule.id}
                  schedule={schedule}
                  nowMs={nowMs}
                  isDeleting={deletingId === schedule.id}
                  deleteDisabled={deletingId !== null}
                  onDelete={(target) => {
                    setScheduleToDelete(target);
                    setShowDeleteConfirm(true);
                  }}
                />
              ))}
            </div>
          )}
        </>
      )}

      {schedules.length > 0 && (
        <div className="schedule-clear-all">
          <p className="schedule-clear-all__text">
            Delete all schedules and their emails.
          </p>
          {clearResult && <p className="schedule-clear-all__result">{clearResult}</p>}
          {clearError && <p className="schedule-clear-all__error">{clearError}</p>}
          <Button
            variant="danger"
            onClick={() => {
              setClearResult(null);
              setClearError(null);
              setShowClearAllConfirm(true);
            }}
            disabled={clearAllMutation.isPending}
            loading={clearAllMutation.isPending}
          >
            Delete all
          </Button>
        </div>
      )}

      {showDeleteConfirm && scheduleToDelete && (
        <div className="modal-overlay" onClick={() => setShowDeleteConfirm(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>Delete schedule?</h3>
            <p>
              Delete &ldquo;{scheduleToDelete.name}&rdquo; and all {scheduleToDelete.emailCount} emails, including sent emails? This cannot be undone.
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

      {showClearAllConfirm && (
        <div className="modal-overlay" onClick={() => setShowClearAllConfirm(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>Delete all schedules?</h3>
            <p>
              Delete all {schedules.length} schedule{schedules.length !== 1 ? "s" : ""} and
              {" "}{schedules.reduce((sum, s) => sum + (s.totalCount ?? 0), 0)} emails, including sent emails? This cannot be undone.
            </p>
            <div className="modal__actions">
              <Button variant="ghost" onClick={() => setShowClearAllConfirm(false)}>
                Cancel
              </Button>
              <Button
                variant="danger"
                onClick={handleClearAllSchedules}
                loading={clearAllMutation.isPending}
              >
                Delete all
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
