import { api } from "@/lib/api-client";
import type { SessionData, SessionWithMessages, PaginatedResult } from "../types";
import type { CreateSessionInput, UpdateSessionInput } from "@/modules/session/validation";

export async function fetchSessions(params?: {
  page?: number;
  pageSize?: number;
  search?: string;
  isArchived?: boolean;
}): Promise<PaginatedResult<SessionData>> {
  const searchParams = new URLSearchParams();
  if (params?.page) searchParams.set("page", String(params.page));
  if (params?.pageSize) searchParams.set("pageSize", String(params.pageSize));
  if (params?.search) searchParams.set("search", params.search);
  if (params?.isArchived !== undefined) searchParams.set("isArchived", String(params.isArchived));

  const qs = searchParams.toString();
  return api.get<PaginatedResult<SessionData>>(`/api/sessions${qs ? `?${qs}` : ""}`);
}

export async function fetchSession(id: string): Promise<SessionWithMessages> {
  return api.get<SessionWithMessages>(`/api/sessions/${id}`);
}

export async function createSession(input: CreateSessionInput): Promise<SessionData> {
  return api.post<SessionData>("/api/sessions", input);
}

export async function updateSession(id: string, input: UpdateSessionInput): Promise<SessionData> {
  return api.patch<SessionData>(`/api/sessions/${id}`, input);
}

export async function deleteSession(id: string): Promise<{ deleted: boolean }> {
  return api.delete<{ deleted: boolean }>(`/api/sessions/${id}`);
}

export async function toggleArchive(id: string, archived: boolean): Promise<SessionData> {
  return api.patch<SessionData>(`/api/sessions/${id}/archive`, { archived });
}

export async function fetchSessionMessages(
  id: string,
  page = 1,
  pageSize = 50
): Promise<{ items: { id: string; sessionId: string; role: string; content: string; modelUsed?: string; createdAt: string }[]; total: number }> {
  return api.get(`/api/sessions/${id}/messages?page=${page}&pageSize=${pageSize}`);
}
