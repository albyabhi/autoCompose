"use client";

export type ScheduleListFilter = "all" | "scheduled" | "sent" | "failed";
export type ScheduleEmailFilter = "all" | "pending" | "sent" | "failed";

interface FilterOption<T extends string> {
  value: T;
  label: string;
  count: number;
}

interface FilterTabsProps<T extends string> {
  options: FilterOption<T>[];
  value: T;
  onChange: (value: T) => void;
  ariaLabel: string;
}

function FilterTabs<T extends string>({ options, value, onChange, ariaLabel }: FilterTabsProps<T>) {
  return (
    <div className="schedule-filter-tabs" role="tablist" aria-label={ariaLabel}>
      {options.map((option) => {
        const isActive = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="tab"
            aria-selected={isActive}
            className={`schedule-filter-tabs__tab${isActive ? " schedule-filter-tabs__tab--active" : ""}`}
            onClick={() => onChange(option.value)}
          >
            <span>{option.label}</span>
            <span className="schedule-filter-tabs__count" aria-label={`${option.count} items`}>
              {option.count}
            </span>
          </button>
        );
      })}
    </div>
  );
}

export interface ScheduleFilterCounts {
  all: number;
  scheduled: number;
  sent: number;
  failed: number;
}

export function ScheduleFilterTabs({
  value,
  counts,
  onChange,
}: {
  value: ScheduleListFilter;
  counts: ScheduleFilterCounts;
  onChange: (value: ScheduleListFilter) => void;
}) {
  return (
    <FilterTabs<ScheduleListFilter>
      ariaLabel="Filter schedules"
      value={value}
      onChange={onChange}
      options={[
        { value: "all", label: "All", count: counts.all },
        { value: "scheduled", label: "Scheduled", count: counts.scheduled },
        { value: "sent", label: "Sent", count: counts.sent },
        { value: "failed", label: "Failed", count: counts.failed },
      ]}
    />
  );
}

export interface ScheduleEmailFilterCounts {
  all: number;
  pending: number;
  sent: number;
  failed: number;
}

export function ScheduleEmailFilterTabs({
  value,
  counts,
  onChange,
}: {
  value: ScheduleEmailFilter;
  counts: ScheduleEmailFilterCounts;
  onChange: (value: ScheduleEmailFilter) => void;
}) {
  return (
    <FilterTabs<ScheduleEmailFilter>
      ariaLabel="Filter emails"
      value={value}
      onChange={onChange}
      options={[
        { value: "all", label: "All", count: counts.all },
        { value: "pending", label: "Pending", count: counts.pending },
        { value: "sent", label: "Sent", count: counts.sent },
        { value: "failed", label: "Failed", count: counts.failed },
      ]}
    />
  );
}

// ============================================================
// FILE: src/features/schedule/components/schedule-filter-tabs.tsx
// ============================================================
// PURPOSE: Neubrutalist tab controls for filtering schedules and emails.
// HOW IT WORKS: Generic FilterTabs renders role=tablist buttons with counts.
//   ScheduleFilterTabs maps to all/scheduled/sent/failed; Email variant maps
//   to all/pending/sent/failed. Parent filters client-side via useMemo.
// PROPS: value, counts, onChange for each variant.
// INTEGRATION: Schedules list page and schedule detail page.
// ============================================================
