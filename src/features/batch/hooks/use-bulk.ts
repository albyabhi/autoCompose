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
  sendEntryWithAttachments,
  uploadAttachments,
  batchUpdateCategory,
} from "../api/bulk";
import type { BulkEntryData, CreateEntryPayload } from "../types";

const BULK_KEY = ["bulk-entries"] as const;

export function useBulkEntries(sessionId: string | undefined) {
  return useQuery({
    queryKey: [...BULK_KEY, sessionId],
    queryFn: () => fetchEntries(sessionId!),
    enabled: !!sessionId,
    staleTime: 5_000,
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
    onMutate: async (payload) => {
      const queryKey = [...BULK_KEY, payload.sessionId];
      await qc.cancelQueries({ queryKey });
      const previous = qc.getQueryData<BulkEntryData[]>(queryKey);
      const maxSort = previous?.reduce((max, e) => Math.max(max, e.sortOrder), -1) ?? -1;
      const tempEntries: BulkEntryData[] = payload.entries.map((e, i) => ({
        id: `temp-${Date.now()}-${i}`,
        sessionId: payload.sessionId,
        userId: "",
        category: e.category,
        prompt: e.prompt,
        recipient: e.recipient,
        status: "pending",
        sortOrder: maxSort + 1 + i,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }));
      qc.setQueryData<BulkEntryData[]>(queryKey, (old) => [...(old ?? []), ...tempEntries]);
      return { queryKey, previous };
    },
    onError: (_err, _payload, context) => {
      if (context?.previous) {
        qc.setQueryData(context.queryKey, context.previous);
      }
    },
    onSettled: (_data, _error, _variables, context) => {
      if (context?.queryKey) {
        qc.invalidateQueries({ queryKey: context.queryKey });
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
    mutationFn: async (id: string) => {
      if (id.startsWith("temp-")) {
        return { deleted: true, wasTemp: true };
      }
      const result = await deleteEntry(id);
      return { ...result, wasTemp: false };
    },
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: BULK_KEY });
      const queries = qc.getQueriesData<BulkEntryData[]>({ queryKey: BULK_KEY });
      const snapshot = queries.map(
        ([key, data]) => [[...key], [...(data ?? [])]],
      );
      for (const [key, data] of queries) {
        if (data) {
          qc.setQueryData<BulkEntryData[]>(key, data.filter((e) => e.id !== id));
        }
      }
      return { snapshot };
    },
    onError: (_err, _id, context) => {
      if (context?.snapshot) {
        for (const [key, data] of context.snapshot) {
          qc.setQueryData(key, data);
        }
      }
    },
    onSettled: (data, _error, _id, context) => {
      if (data?.wasTemp) return;
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

export function useSendEntryWithAttachments() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      entryId,
      sharedAttachmentIds,
      rowAttachmentIds,
    }: {
      entryId: string;
      sharedAttachmentIds: string[];
      rowAttachmentIds: string[];
    }) => sendEntryWithAttachments(entryId, sharedAttachmentIds, rowAttachmentIds),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: BULK_KEY });
    },
  });
}

export function useUploadAttachments() {
  return useMutation({
    mutationFn: (files: File[]) => uploadAttachments(files),
  });
}
