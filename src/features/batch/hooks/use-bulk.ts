"use client";

import {
  useQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import {
  createBatchSession,
  createEntries,
  fetchEntries,
  updateEntry,
  deleteEntry,
  generateEntry,
  sendEntry,
  batchUpdateCategory,
} from "../api/bulk";
import type { CreateEntryPayload } from "../types";

const BULK_KEY = ["bulk-entries"] as const;

export function useBulkEntries(sessionId: string | undefined) {
  return useQuery({
    queryKey: [...BULK_KEY, sessionId],
    queryFn: () => fetchEntries(sessionId!),
    enabled: !!sessionId,
    refetchInterval: (query) => {
      const data = query.state.data;
      if (!data) return false;
      const hasActiveJobs = data.some(
        (e) => e.status === "generating" || e.status === "sending"
      );
      return hasActiveJobs ? 2000 : false;
    },
  });
}

export function useCreateBatchSession() {
  return useMutation({
    mutationFn: createBatchSession,
  });
}

export function useCreateEntries() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateEntryPayload) => createEntries(payload),
    onSuccess: (data) => {
      if (data.length > 0) {
        qc.invalidateQueries({ queryKey: [...BULK_KEY, data[0].sessionId] });
      }
    },
  });
}

export function useUpdateEntry() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: { category?: string; prompt?: string; recipient?: string } }) =>
      updateEntry(id, input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: BULK_KEY });
    },
  });
}

export function useDeleteEntry() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteEntry(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: BULK_KEY });
    },
  });
}

export function useGenerateEntry() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ entryId, modelId }: { entryId: string; modelId: string }) =>
      generateEntry(entryId, modelId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: BULK_KEY });
    },
  });
}

export function useBatchUpdateCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ sessionId, category }: { sessionId: string; category: string }) =>
      batchUpdateCategory(sessionId, category),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: BULK_KEY });
    },
  });
}

export function useSendEntry() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (entryId: string) => sendEntry(entryId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: BULK_KEY });
    },
  });
}
