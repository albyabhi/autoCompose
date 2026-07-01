import { api } from "@/lib/api-client";
import type {
  AddScheduledEmailPayload,
  AddScheduledEmailsResult,
  CreateSchedulePayload,
  PaginatedScheduleResult,
  ProcessScheduleNowResult,
  ScheduleData,
  ScheduleDetailData,
  ScheduledEmailData,
} from "../types";

export async function fetchSchedules(params?: {
  page?: number;
  pageSize?: number;
  status?: string;
}): Promise<PaginatedScheduleResult> {
  const searchParams = new URLSearchParams();
  if (params?.page) searchParams.set("page", String(params.page));
  if (params?.pageSize) searchParams.set("pageSize", String(params.pageSize));
  if (params?.status) searchParams.set("status", params.status);
  const qs = searchParams.toString();
  return api.get<PaginatedScheduleResult>(`/api/schedules${qs ? `?${qs}` : ""}`);
}

export function fetchActiveSchedules(): Promise<ScheduleData[]> {
  return api.get<ScheduleData[]>("/api/schedules/active");
}

export function fetchSchedule(id: string): Promise<ScheduleDetailData> {
  return api.get<ScheduleDetailData>(`/api/schedules/${id}`);
}

export function createSchedule(input: CreateSchedulePayload): Promise<ScheduleDetailData> {
  return api.post<ScheduleDetailData>("/api/schedules", input);
}

export function updateSchedule(
  id: string,
  input: Partial<Pick<ScheduleData, "name" | "scheduledAt" | "timezone" | "status">>
): Promise<ScheduleData> {
  return api.patch<ScheduleData>(`/api/schedules/${id}`, input);
}

export function deleteSchedule(id: string): Promise<{ deleted: boolean }> {
  return api.delete<{ deleted: boolean }>(`/api/schedules/${id}`);
}

export function processScheduleNow(id: string): Promise<ProcessScheduleNowResult> {
  return api.post<ProcessScheduleNowResult>(`/api/schedules/${id}/process`, {});
}

export function addScheduledEmails(
  scheduleId: string,
  emails: AddScheduledEmailPayload[]
): Promise<AddScheduledEmailsResult> {
  return api.post<AddScheduledEmailsResult>(`/api/schedules/${scheduleId}/emails`, { emails });
}

export function updateScheduledEmail(
  scheduleId: string,
  emailId: string,
  input: { to?: string; subject?: string; body?: string; retry?: boolean }
): Promise<ScheduledEmailData> {
  return api.patch<ScheduledEmailData>(`/api/schedules/${scheduleId}/emails/${emailId}`, input);
}

export function deleteScheduledEmail(
  scheduleId: string,
  emailId: string
): Promise<{ deleted: boolean }> {
  return api.delete<{ deleted: boolean }>(`/api/schedules/${scheduleId}/emails/${emailId}`);
}

// ============================================================
// FILE: src/features/schedule/api/schedule.ts
// ============================================================
// PURPOSE: Frontend API client functions for schedule endpoints.
// HOW IT WORKS: Wraps the shared JSON api client for list/detail/create/update,
//   active picker lookup, add-email, edit/retry, delete, and due processing.
// INTEGRATION: TanStack Query hooks and schedule UI components.
// ============================================================
