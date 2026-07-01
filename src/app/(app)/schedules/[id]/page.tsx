"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { SkeletonList } from "@/components/ui/skeleton";
import {
  useDeleteSchedule,
  useDeleteScheduledEmail,
  useProcessScheduleNow,
  useSchedule,
  useUpdateScheduledEmail,
} from "@/features/schedule/hooks/use-schedules";
import { getScheduleCountdown } from "@/features/schedule/utils/countdown";
import {
  getScheduleStatusDisplay,
  hasProcessableEmails,
  isDueActiveSchedule,
} from "@/features/schedule/utils/status";

export default function ScheduleDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const scheduleId = params.id;
  const { data, isLoading, isError } = useSchedule(scheduleId);
  const deleteScheduleMutation = useDeleteSchedule();
  const deleteEmailMutation = useDeleteScheduledEmail();
  const updateEmailMutation = useUpdateScheduledEmail();
  const processScheduleMutation = useProcessScheduleNow();
  const [nowMs, setNowMs] = useState(() => Date.now());
  const lastTriggerMsRef = useRef(0);

  useEffect(() => {
    const interval = setInterval(() => setNowMs(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  const countdown = useMemo(
    () => data ? getScheduleCountdown(data.scheduledAt, data.status, nowMs) : null,
    [data, nowMs]
  );
  const status = useMemo(
    () => data ? getScheduleStatusDisplay(data, nowMs) : null,
    [data, nowMs]
  );

  useEffect(() => {
    if (!data) return;
    if (!isDueActiveSchedule(data, nowMs)) return;
    if (!hasProcessableEmails(data.emails)) return;
    if (processScheduleMutation.isPending || nowMs - lastTriggerMsRef.current < 2_000) return;

    lastTriggerMsRef.current = nowMs;
    processScheduleMutation.mutate(scheduleId);
  }, [data, nowMs, processScheduleMutation, scheduleId]);

  if (isLoading) {
    return <div className="session-detail"><SkeletonList count={4} /></div>;
  }

  if (isError || !data) {
    return (
      <div className="session-detail">
        <div className="settings-message settings-message--error">
          Failed to load schedule. Please try again.
        </div>
      </div>
    );
  }

  async function handleCancelSchedule() {
    await deleteScheduleMutation.mutateAsync(scheduleId);
    router.push("/schedules");
  }

  return (
    <div className="session-detail">
      <div className="session-detail__header">
        <div>
          <h1 className="session-detail__title">{data.name}</h1>
          <span className="session-detail__category">
            {new Date(data.scheduledAt).toLocaleString()} ({data.timezone})
          </span>
          {countdown && (
            <div className={`schedule-countdown schedule-countdown--${countdown.tone}`}>
              {countdown.label}
            </div>
          )}
        </div>
        <Button
          variant="danger"
          onClick={handleCancelSchedule}
          disabled={data.status !== "active" || deleteScheduleMutation.isPending}
        >
          Cancel Schedule
        </Button>
      </div>

      <div className="schedule-detail__stats">
        {status && (
          <span className={`schedule-status schedule-status--${status.className}`}>
            {status.label}
          </span>
        )}
        <span>{data.totalCount ?? data.emails.length} emails</span>
        <span>{data.pendingCount ?? 0} pending</span>
        <span>{data.sentCount ?? 0} sent</span>
        <span>{data.failedCount ?? 0} failed</span>
      </div>

      {data.emails.length === 0 ? (
        <div className="bulk-table__empty">No emails have been added to this schedule.</div>
      ) : (
        <div className="bulk-list">
          {data.emails.map((email) => (
            <div key={email.id} className="bulk-card">
              <div className="bulk-card__header">
                <span className="bulk-card__order">#{email.sortOrder + 1}</span>
                <span className={`schedule-status schedule-status--${email.deliveryState}`}>
                  {email.deliveryState.replace(/_/g, " ")}
                </span>
              </div>
              <div className="bulk-card__display">
                <div className="bulk-card__display-row bulk-card__display-row--recipient">
                  <span className="bulk-card__display-label">To</span>
                  <span className="bulk-card__display-value">{email.to}</span>
                </div>
                {email.subject && (
                  <div className="bulk-card__display-row">
                    <span className="bulk-card__display-label">Subject</span>
                    <span className="bulk-card__display-value">{email.subject}</span>
                  </div>
                )}
                {email.body && <div className="schedule-email__body">{email.body}</div>}
                {email.errorMessage && (
                  <div className="bulk-card__error">{email.errorMessage}</div>
                )}
              </div>
              <div className="bulk-card__actions">
                {email.deliveryState === "failed" && (
                  <button
                    className="bulk-card__btn bulk-card__btn--regen"
                    onClick={() =>
                      updateEmailMutation.mutate({
                        scheduleId,
                        emailId: email.id,
                        input: { retry: true },
                      })
                    }
                  >
                    Retry
                  </button>
                )}
                {email.deliveryState !== "sent" && (
                  <button
                    className="bulk-card__btn bulk-card__btn--delete"
                    onClick={() => deleteEmailMutation.mutate({ scheduleId, emailId: email.id })}
                  >
                    Remove
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================================
// FILE: src/app/(app)/schedules/[id]/page.tsx
// ============================================================
// PURPOSE: Authenticated schedule detail page with scheduled email status list.
// HOW IT WORKS: Fetches one schedule, polls while items are active, shows status
//   cards and a live send countdown, triggers authenticated processing when due,
//   and exposes cancel, retry failed, and remove non-sent actions.
// INTEGRATION: Schedule hooks, Next navigation, shared batch card styles.
// ============================================================
