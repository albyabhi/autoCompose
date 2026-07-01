export type ScheduleStatus = "active" | "sent" | "expired" | "cancelled";
export type ScheduledEmailDeliveryState =
  | "awaiting_content"
  | "ready"
  | "sending"
  | "sent"
  | "failed";
export type ScheduledEmailSourceType = "single" | "batch";

export interface ScheduleData {
  id: string;
  userId: string;
  name: string;
  scheduledAt: string;
  timezone: string;
  status: ScheduleStatus;
  totalCount?: number;
  pendingCount?: number;
  sentCount?: number;
  failedCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface ScheduledEmailData {
  id: string;
  scheduleId: string;
  userId: string;
  sourceType: ScheduledEmailSourceType;
  sourceSessionId?: string;
  sourceMessageId?: string;
  sourceBulkEntryId?: string;
  to: string;
  subject?: string;
  body?: string;
  category?: string;
  prompt?: string;
  modelId?: string;
  deliveryState: ScheduledEmailDeliveryState;
  claimedAt?: string;
  sentAt?: string;
  errorCode?: string;
  errorMessage?: string;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface ScheduleDetailData extends ScheduleData {
  emails: ScheduledEmailData[];
}

export interface PaginatedScheduleResult {
  items: ScheduleData[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface ProcessSchedulesResult {
  schedulesChecked: number;
  itemsProcessed: number;
  sent: number;
  failed: number;
  generated: number;
}

export interface ProcessScheduleNowResult {
  result: ProcessSchedulesResult;
  schedule: ScheduleDetailData;
}

export type AddScheduledEmailPayload =
  | {
      sourceType: "single";
      sourceSessionId?: string;
      sourceMessageId?: string;
      to: string;
      subject: string;
      body: string;
      category?: string;
      prompt?: string;
      modelId?: string;
    }
  | {
      sourceType: "batch";
      sourceBulkEntryId: string;
      modelId: string;
    };

export interface AddScheduledEmailsResult {
  emails: ScheduledEmailData[];
  skipped: number;
}

export interface CreateSchedulePayload {
  name: string;
  scheduledAt: string;
  timezone: string;
  emails?: AddScheduledEmailPayload[];
}

// ============================================================
// FILE: src/features/schedule/types.ts
// ============================================================
// PURPOSE: Frontend TypeScript types for schedules and scheduled emails.
// HOW IT WORKS: Mirrors the serialized API DTOs and request payloads used by
//   schedule API client functions, hooks, process triggers, and UI components.
// INTEGRATION: Schedule API client, hooks, list/detail pages, dialogs.
// ============================================================
