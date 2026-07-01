"use client";

import { useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import {
  useActiveSchedules,
  useCreateSchedule,
} from "../hooks/use-schedules";
import { addScheduledEmails } from "../api/schedule";
import type { AddScheduledEmailPayload } from "../types";
import {
  getBrowserTimezone,
  localPartsToIso,
  ScheduleFormFields,
  toDatetimeLocalParts,
} from "./schedule-form-fields";

const SCHEDULES_KEY = ["schedules"] as const;

interface Progress {
  current: number;
  total: number;
  succeeded: number;
  failed: number;
  skipped: number;
}

interface AddToScheduleDialogProps {
  open: boolean;
  onClose: () => void;
  emails: AddScheduledEmailPayload[];
  skippedCount?: number;
  title?: string;
}

export function AddToScheduleDialog({
  open,
  onClose,
  emails,
  skippedCount = 0,
  title = "Add to Schedule",
}: AddToScheduleDialogProps) {
  const parts = useMemo(() => toDatetimeLocalParts(), []);
  const [mode, setMode] = useState<"existing" | "new">("existing");
  const [selectedId, setSelectedId] = useState("");
  const [name, setName] = useState("Scheduled Emails");
  const [date, setDate] = useState(parts.date);
  const [time, setTime] = useState(parts.time);
  const [timezone, setTimezone] = useState(getBrowserTimezone());
  const [message, setMessage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState<Progress | null>(null);

  const queryClient = useQueryClient();
  const activeSchedules = useActiveSchedules(open);
  const createMutation = useCreateSchedule();

  if (!open) return null;

  const canSubmit =
    emails.length > 0 &&
    (mode === "new" ? name.trim() && date && time : selectedId) &&
    !isProcessing;

  async function handleSubmit() {
    if (!canSubmit) return;
    setMessage(null);
    setIsProcessing(true);

    const total = emails.length;
    setProgress({ current: 0, total, succeeded: 0, failed: 0, skipped: 0 });

    try {
      let targetScheduleId: string;

      if (mode === "new") {
        const newSchedule = await createMutation.mutateAsync({
          name: name.trim(),
          scheduledAt: localPartsToIso(date, time),
          timezone,
        });
        targetScheduleId = newSchedule.id;
      } else {
        targetScheduleId = selectedId;
      }

      setProgress({ current: 1, total, succeeded: 0, failed: 0, skipped: 0 });

      let succeeded = 0;
      let skipped = 0;

      try {
        const result = await addScheduledEmails(targetScheduleId, emails);
        succeeded = result.emails.length;
        skipped = result.skipped;
      } catch {
        setMessage("Could not add emails to schedule.");
        setIsProcessing(false);
        setProgress({ current: total, total, succeeded: 0, failed: total, skipped: 0 });
        return;
      }

      setProgress({ current: total, total, succeeded, failed: 0, skipped });

      queryClient.invalidateQueries({ queryKey: SCHEDULES_KEY });
      queryClient.invalidateQueries({ queryKey: [...SCHEDULES_KEY, targetScheduleId] });

      if (skipped > 0 && succeeded > 0) {
        setMessage(
          `Added ${succeeded} email${succeeded !== 1 ? "s" : ""}. ${skipped} skipped (already in this schedule).`
        );
      } else if (skipped > 0) {
        setMessage(
          `All ${skipped} email${skipped !== 1 ? "s" : ""} skipped (already in this schedule).`
        );
      } else {
        setMessage(`Added ${succeeded} email${succeeded !== 1 ? "s" : ""} to schedule.`);
      }

      setTimeout(onClose, 1500);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not add to schedule.");
    } finally {
      setIsProcessing(false);
    }
  }

  return (
    <div className="dialog-backdrop" onClick={onClose} role="presentation">
      <div
        className="dialog dialog--email"
        role="dialog"
        aria-modal="true"
        aria-labelledby="add-schedule-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="dialog__header">
          <h2 id="add-schedule-title" className="dialog__title">{title}</h2>
          <button
            type="button"
            className="dialog__close"
            onClick={onClose}
            aria-label="Close"
            disabled={isProcessing}
          >
            x
          </button>
        </div>
        <div className="dialog__body">
          <div className="schedule-dialog__notice">
            Scheduling {emails.length} email{emails.length !== 1 ? "s" : ""}. Attachments are not included in scheduled sends.
            {skippedCount > 0 && ` ${skippedCount} row${skippedCount !== 1 ? "s" : ""} skipped because they need a recipient and prompt.`}
          </div>

          {!isProcessing ? (
            <>
              <div className="schedule-dialog__tabs" role="tablist">
                <button
                  type="button"
                  className={`schedule-dialog__tab ${mode === "existing" ? "schedule-dialog__tab--active" : ""}`}
                  onClick={() => setMode("existing")}
                >
                  Existing
                </button>
                <button
                  type="button"
                  className={`schedule-dialog__tab ${mode === "new" ? "schedule-dialog__tab--active" : ""}`}
                  onClick={() => setMode("new")}
                >
                  New
                </button>
              </div>

              {mode === "existing" ? (
                <div className="field-group">
                  <label htmlFor="schedule-existing" className="field-label">Schedule</label>
                  <select
                    id="schedule-existing"
                    className="field-select"
                    value={selectedId}
                    onChange={(event) => setSelectedId(event.target.value)}
                    disabled={isProcessing}
                  >
                    <option value="">Choose a future schedule</option>
                    {(activeSchedules.data ?? []).map((schedule) => (
                      <option key={schedule.id} value={schedule.id}>
                        {schedule.name} ({schedule.totalCount ?? 0} email{schedule.totalCount !== 1 ? "s" : ""}) - {new Date(schedule.scheduledAt).toLocaleString()}
                      </option>
                    ))}
                  </select>
                  {!activeSchedules.isLoading && (activeSchedules.data ?? []).length === 0 && (
                    <div className="settings-message settings-message--error">
                      No active future schedules. Create a new one instead.
                    </div>
                  )}
                </div>
              ) : (
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
              )}
            </>
          ) : (
            <div className="schedule-dialog__progress">
              <div className="schedule-dialog__progress-text">
                Adding email {progress?.current ?? 0} of {progress?.total ?? 0}
              </div>
              <div className="progress-bar">
                <div
                  className="progress-bar__fill"
                  style={{ width: `${progress && progress.total > 0 ? ((progress.current) / progress.total) * 100 : 0}%` }}
                />
              </div>
              <div className="schedule-dialog__progress-stats">
                <span className="progress-stat progress-stat--success">{progress?.succeeded ?? 0} added</span>
                <span className="progress-stat progress-stat--skip">{progress?.skipped ?? 0} skipped</span>
                <span className="progress-stat progress-stat--error">{progress?.failed ?? 0} failed</span>
              </div>
            </div>
          )}

          {message && (
            <div className={`settings-message settings-message--${message.startsWith("Added") ? "success" : "error"}`}>
              {message}
            </div>
          )}

          <div className="dialog__actions">
            <Button variant="ghost" onClick={onClose} disabled={isProcessing}>Cancel</Button>
            <Button variant="primary" onClick={handleSubmit} disabled={!canSubmit} loading={isProcessing}>
              {isProcessing ? "Adding..." : "Add"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// FILE: src/features/schedule/components/add-to-schedule-dialog.tsx
// ============================================================
// PURPOSE: Shared modal for adding one or more emails to a schedule.
// HOW IT WORKS: Lets users choose an active future schedule or create a new
//   schedule inline, then submits the provided schedule email payloads.
// PROPS: open state, close handler, email payloads, optional skipped count/title.
// INTEGRATION: Schedule form fields, schedule hooks, shared dialog/button styles.
// ============================================================
