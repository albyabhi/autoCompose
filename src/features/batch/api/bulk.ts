import { api } from "@/lib/api-client";
import type { BulkEntryData, CreateEntryPayload } from "../types";

export async function createBatchSession(): Promise<{ id: string; title: string }> {
  return api.post<{ id: string; title: string }>("/api/bulk/session");
}

export async function createEntries(payload: CreateEntryPayload): Promise<BulkEntryData[]> {
  return api.post<BulkEntryData[]>("/api/bulk/entries", payload);
}

export async function fetchEntries(sessionId: string): Promise<BulkEntryData[]> {
  return api.get<BulkEntryData[]>(`/api/bulk/entries?sessionId=${encodeURIComponent(sessionId)}`);
}

export async function updateEntry(
  id: string,
  input: { category?: string; prompt?: string; recipient?: string }
): Promise<BulkEntryData> {
  return api.patch<BulkEntryData>(`/api/bulk/entries/${id}`, input);
}

export async function deleteEntry(id: string): Promise<{ deleted: boolean }> {
  return api.delete<{ deleted: boolean }>(`/api/bulk/entries/${id}`);
}

export async function generateEntry(
  entryId: string,
  modelId: string
): Promise<BulkEntryData> {
  return api.post<BulkEntryData>("/api/bulk/generate", { entryId, modelId });
}

export async function batchUpdateCategory(
  sessionId: string,
  category: string
): Promise<{ updated: number }> {
  return api.patch<{ updated: number }>("/api/bulk/entries/batch", { sessionId, category });
}

export async function sendEntry(entryId: string): Promise<{
  ok: boolean;
  messageId?: string;
  error?: string;
}> {
  return api.post<{ ok: boolean; messageId?: string; error?: string }>(
    "/api/bulk/send",
    { entryId }
  );
}
