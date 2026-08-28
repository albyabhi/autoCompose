import type { EmailCategory } from "@/modules/email/categories";
import type { ModelId } from "@/modules/ai/types";
import type { ScheduleStatus } from "@/models/schedule";
import type {
  ScheduledEmailDeliveryState,
  ScheduledEmailSourceType,
} from "@/models/scheduled-email";

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
  category?: EmailCategory;
  prompt?: string;
  modelId?: ModelId;
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

export interface AddScheduledEmailsResult {
  emails: ScheduledEmailData[];
  skipped: number;
}

export interface ProcessSchedulesResult {
  schedulesChecked: number;
  itemsProcessed: number;
  sent: number;
  failed: number;
  generated: number;
}

// ============================================================
// FILE: src/modules/schedule/types.ts
// ============================================================
// PURPOSE: TypeScript interfaces for all data shapes returned by the schedule module — what the frontend and API routes receive.
// HOW IT WORKS: Defines the exact structure of schedule data at every level:
//   - ScheduleData: Core schedule info (id, name, date, timezone, status) plus optional counts (total/pending/sent/failed emails).
//   - ScheduledEmailData: One email in a schedule — includes source tracking (single vs batch, original session/message/bulk entry IDs), recipient, subject, body, category, AI model, delivery state (awaiting_content/ready/sending/sent/failed), timestamps, and sort order.
//   - ScheduleDetailData: ScheduleData + full emails array (for detail view).
//   - PaginatedScheduleResult: List response with items, total count, pagination metadata.
//   - AddScheduledEmailsResult: Created emails + count of skipped duplicates.
//   - ProcessSchedulesResult: Cron job summary — how many schedules checked, items processed, sent, failed, AI-generated.
//   All dates are ISO strings (serialized for JSON). These types are used by the API client, React Query hooks, and UI components.
// INTEGRATION: Used by schedule service (src/modules/schedule/service.ts) for return types, API routes (src/app/api/schedules/**/route.ts) for responses, hooks (src/features/schedule/hooks/use-schedules.ts), and UI components (src/app/(app)/schedules/**).
// ============================================================
