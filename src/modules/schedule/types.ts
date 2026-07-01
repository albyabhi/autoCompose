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
// PURPOSE: DTO types returned by the schedule module and API routes.
// HOW IT WORKS: Defines serialized schedule, scheduled email, detail, list,
//   and cron-processing result shapes for frontend and route consumers.
// INTEGRATION: Used by schedule service, API clients, hooks, and components.
// ============================================================
