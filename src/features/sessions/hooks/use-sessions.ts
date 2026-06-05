"use client";

import {
  useQuery,
  useMutation,
  useQueryClient,
  useInfiniteQuery,
} from "@tanstack/react-query";
import {
  fetchSessions,
  fetchSession,
  createSession,
  updateSession,
  deleteSession,
  toggleArchive,
} from "../api/sessions";
import type { SessionData, SessionWithMessages } from "../types";
import type { CreateSessionInput, UpdateSessionInput } from "@/modules/session/validation";

const SESSIONS_KEY = ["sessions"] as const;

export function useSessions(params?: {
  page?: number;
  pageSize?: number;
  search?: string;
  isArchived?: boolean;
}) {
  return useQuery({
    queryKey: [...SESSIONS_KEY, params],
    queryFn: () => fetchSessions(params),
  });
}

export function useInfiniteSessions(
  params: { search?: string; isArchived?: boolean } = {}
) {
  return useInfiniteQuery({
    queryKey: [...SESSIONS_KEY, "infinite", params],
    queryFn: ({ pageParam = 1 }) =>
      fetchSessions({ ...params, page: pageParam, pageSize: 20 }),
    getNextPageParam: (lastPage) =>
      lastPage.page < lastPage.totalPages ? lastPage.page + 1 : undefined,
    initialPageParam: 1,
  });
}

export function useSession(id: string) {
  return useQuery({
    queryKey: [...SESSIONS_KEY, id],
    queryFn: () => fetchSession(id),
    enabled: !!id,
  });
}

export function useCreateSession() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateSessionInput) => createSession(input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: SESSIONS_KEY });
    },
  });
}

export function useUpdateSession() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateSessionInput }) =>
      updateSession(id, input),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: SESSIONS_KEY });
      qc.setQueryData([...SESSIONS_KEY, data.id], (old: SessionWithMessages | undefined) =>
        old ? { ...old, ...data } : old
      );
    },
  });
}

export function useDeleteSession() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteSession(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: SESSIONS_KEY });
    },
  });
}

export function useToggleArchive() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, archived }: { id: string; archived: boolean }) =>
      toggleArchive(id, archived),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: SESSIONS_KEY });
    },
  });
}
