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
  fetchSessionMessages,
  createSession,
  updateSession,
  deleteSession,
  toggleArchive,
  clearAllSessions,
} from "../api/sessions";
import type { SessionData, SessionWithMessages, MessageData } from "../types";
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

export function useSessionMessages(id: string) {
  return useInfiniteQuery({
    queryKey: ["session-messages", id],
    queryFn: async ({ pageParam = 1 }) => {
      const res = await fetchSessionMessages(id, pageParam, 20, "desc");
      const totalPages = Math.ceil(res.total / 20);
      return { ...res, page: pageParam, totalPages };
    },
    initialPageParam: 1,
    getNextPageParam: (lastPage) =>
      lastPage.page < lastPage.totalPages ? lastPage.page + 1 : undefined,
    select: (data) => {
      const allMessages: MessageData[] = [];
      for (const page of data.pages) {
        allMessages.push(...page.items);
      }
      return allMessages.reverse();
    },
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
    onMutate: async ({ id, input }) => {
      await qc.cancelQueries({ queryKey: SESSIONS_KEY });
      const snapshot = qc.getQueriesData({ queryKey: SESSIONS_KEY });

      qc.setQueriesData(
        { queryKey: SESSIONS_KEY },
        (old: unknown) => {
          if (!old || typeof old !== "object") return old;
          const data = old as Record<string, unknown>;
          if (Array.isArray(data.pages)) {
            return {
              ...data,
              pages: data.pages.map((page: unknown) => {
                const p = page as Record<string, unknown>;
                if (!Array.isArray(p.items)) return p;
                return {
                  ...p,
                  items: p.items.map((s: unknown) => {
                    const session = s as SessionData;
                    return session.id === id
                      ? { ...session, title: input.title ?? session.title }
                      : session;
                  }),
                };
              }),
            };
          }
          if (Array.isArray(data.items)) {
            return {
              ...data,
              items: data.items.map((s: unknown) => {
                const session = s as SessionData;
                return session.id === id
                  ? { ...session, title: input.title ?? session.title }
                  : session;
              }),
            };
          }
          return old;
        }
      );

      return { snapshot };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.snapshot) {
        for (const [key, data] of ctx.snapshot) {
          qc.setQueryData(key, data);
        }
      }
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: SESSIONS_KEY });
      qc.setQueryData([...SESSIONS_KEY, data.id], (old: SessionWithMessages | undefined) =>
        old ? { ...old, ...data } : old
      );
    },
  });
}

export function useClearAllSessions() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => clearAllSessions(),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: SESSIONS_KEY });
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

// ============================================================
// FILE: src/features/sessions/hooks/use-sessions.ts
// ============================================================
// PURPOSE: React Query hooks for querying, creating, updating, deleting, and archiving sessions.
// HOW IT works: useSessions fetches paginated sessions; useInfiniteSessions uses useInfiniteQuery for scrollable lists with auto-pagination. useSession fetches a single session with messages. Mutations (create/update/delete/toggleArchive) invalidate the sessions query cache on success, and useUpdateSession also optimistically patches the individual session cache.
// INTEGRATION: @tanstack/react-query, sessions API client, CreateSessionInput/UpdateSessionInput types.
// ============================================================
