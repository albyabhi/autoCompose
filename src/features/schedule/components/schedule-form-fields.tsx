"use client";

interface ScheduleFormFieldsProps {
  name: string;
  date: string;
  time: string;
  timezone: string;
  onNameChange: (value: string) => void;
  onDateChange: (value: string) => void;
  onTimeChange: (value: string) => void;
  onTimezoneChange: (value: string) => void;
}

export function getBrowserTimezone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
}

export function toDatetimeLocalParts(date = new Date(Date.now() + 60 * 60 * 1000)) {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  const hh = String(date.getHours()).padStart(2, "0");
  const min = String(date.getMinutes()).padStart(2, "0");
  return { date: `${yyyy}-${mm}-${dd}`, time: `${hh}:${min}` };
}

export function localPartsToIso(date: string, time: string): string {
  return new Date(`${date}T${time}:00`).toISOString();
}

export function ScheduleFormFields({
  name,
  date,
  time,
  timezone,
  onNameChange,
  onDateChange,
  onTimeChange,
  onTimezoneChange,
}: ScheduleFormFieldsProps) {
  return (
    <div className="schedule-form-fields">
      <div className="field-group">
        <label className="field-label" htmlFor="schedule-name">Schedule Name</label>
        <input
          id="schedule-name"
          className="field-input"
          value={name}
          onChange={(event) => onNameChange(event.target.value)}
          placeholder="Tuesday outreach"
          maxLength={120}
        />
      </div>
      <div className="schedule-form-fields__row">
        <div className="field-group">
          <label className="field-label" htmlFor="schedule-date">Date</label>
          <input
            id="schedule-date"
            className="field-input"
            type="date"
            value={date}
            onChange={(event) => onDateChange(event.target.value)}
          />
        </div>
        <div className="field-group">
          <label className="field-label" htmlFor="schedule-time">Time</label>
          <input
            id="schedule-time"
            className="field-input"
            type="time"
            value={time}
            onChange={(event) => onTimeChange(event.target.value)}
          />
        </div>
      </div>
      <details className="schedule-form-fields__timezone">
        <summary>Timezone: {timezone}</summary>
        <input
          className="field-input"
          value={timezone}
          onChange={(event) => onTimezoneChange(event.target.value)}
          placeholder="UTC"
        />
      </details>
    </div>
  );
}

// ============================================================
// FILE: src/features/schedule/components/schedule-form-fields.tsx
// ============================================================
// PURPOSE: Shared schedule name/date/time fields.
// HOW IT WORKS: Renders the simple required schedule form and helper functions
//   for browser timezone detection and local date/time conversion to UTC ISO.
// PROPS: name/date/time/timezone values and change callbacks.
// INTEGRATION: AddToScheduleDialog and schedules page creation form.
// ============================================================
