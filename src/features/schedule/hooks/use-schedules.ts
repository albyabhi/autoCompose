"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  addScheduledEmails,
  createSchedule,
  deleteSchedule,
  deleteScheduledEmail,
  fetchActiveSchedules,
  fetchSchedule,
  fetchSchedules,
  processScheduleNow,
  updateSchedule,
  updateScheduledEmail,
} from "../api/schedule";
import type { AddScheduledEmailPayload, CreateSchedulePayload, PaginatedScheduleResult } from "../types";

const SCHEDULES_KEY = ["schedules"] as const;

export function useSchedules(params?: { page?: number; pageSize?: number; status?: string }) {
  return useQuery({
    queryKey: [...SCHEDULES_KEY, params],
    queryFn: () => fetchSchedules(params),
  });
}

export function useActiveSchedules(enabled = true) {
  return useQuery({
    queryKey: [...SCHEDULES_KEY, "active"],
    queryFn: fetchActiveSchedules,
    enabled,
    staleTime: 5_000,
  });
}

export function useSchedule(id: string) {
  return useQuery({
    queryKey: [...SCHEDULES_KEY, id],
    queryFn: () => fetchSchedule(id),
    enabled: !!id,
    refetchInterval: (query) => {
      const data = query.state.data;
      if (!data) return false;
      const hasActiveItems = data.emails.some((email) =>
        ["awaiting_content", "sending"].includes(email.deliveryState)
      );
      const isDueActiveSchedule =
        data.status === "active" && new Date(data.scheduledAt).getTime() <= Date.now();
      return hasActiveItems || isDueActiveSchedule ? 2000 : false;
    },
  });
}

export function useCreateSchedule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateSchedulePayload) => createSchedule(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: SCHEDULES_KEY }),
  });
}

export function useAddScheduledEmails() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ scheduleId, emails }: { scheduleId: string; emails: AddScheduledEmailPayload[] }) =>
      addScheduledEmails(scheduleId, emails),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: SCHEDULES_KEY });
      qc.invalidateQueries({ queryKey: [...SCHEDULES_KEY, variables.scheduleId] });
    },
  });
}

export function useUpdateSchedule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: Parameters<typeof updateSchedule>[1] }) =>
      updateSchedule(id, input),
    onSuccess: () => qc.invalidateQueries({ queryKey: SCHEDULES_KEY }),
  });
}

export function useDeleteSchedule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteSchedule(id),
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: SCHEDULES_KEY });
      const previous = qc.getQueryData<PaginatedScheduleResult>(SCHEDULES_KEY);
      if (previous) {
        qc.setQueryData<PaginatedScheduleResult>(SCHEDULES_KEY, {
          ...previous,
          items: previous.items.filter((item) => item.id !== id),
          total: previous.total - 1,
        });
      }
      return { previous };
    },
    onError: (_err, _id, context) => {
      if (context?.previous) {
        qc.setQueryData(SCHEDULES_KEY, context.previous);
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: SCHEDULES_KEY });
    },
  });
}

export function useProcessScheduleNow() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => processScheduleNow(id),
    onSuccess: (data, id) => {
      qc.setQueryData([...SCHEDULES_KEY, id], data.schedule);
      qc.invalidateQueries({ queryKey: SCHEDULES_KEY });
    },
  });
}

export function useUpdateScheduledEmail() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      scheduleId,
      emailId,
      input,
    }: {
      scheduleId: string;
      emailId: string;
      input: Parameters<typeof updateScheduledEmail>[2];
    }) => updateScheduledEmail(scheduleId, emailId, input),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: [...SCHEDULES_KEY, variables.scheduleId] });
      qc.invalidateQueries({ queryKey: SCHEDULES_KEY });
    },
  });
}

export function useDeleteScheduledEmail() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ scheduleId, emailId }: { scheduleId: string; emailId: string }) =>
      deleteScheduledEmail(scheduleId, emailId),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: [...SCHEDULES_KEY, variables.scheduleId] });
      qc.invalidateQueries({ queryKey: SCHEDULES_KEY });
    },
  });
}

// ============================================================
// FILE: src/features/schedule/hooks/use-schedules.ts
// ============================================================
// PURPOSE: TanStack Query hooks for schedule fetching and mutations.
// HOW IT WORKS: Provides list/detail/active queries and create/add/edit/delete
//   mutations plus page-triggered due processing. Detail queries poll every two
//   seconds while items are active or a due schedule is being processed.
// INTEGRATION: Schedule API client, React Query cache, schedule UI components.
// ============================================================
