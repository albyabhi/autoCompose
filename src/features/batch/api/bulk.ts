import { api } from "@/lib/api-client";
import type { BulkEntryData, CreateEntryPayload } from "@/modules/bulk/types";

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

export async function sendEntryWithAttachments(
  entryId: string,
  sharedAttachmentIds: string[],
  rowAttachmentIds: string[]
): Promise<{ ok: boolean; messageId?: string; error?: string }> {
  const body = new FormData();
  body.append("entryId", entryId);
  if (sharedAttachmentIds.length > 0) {
    body.append("attachmentIds", sharedAttachmentIds.join(","));
  }
  if (rowAttachmentIds.length > 0) {
    body.append("attachmentIds", rowAttachmentIds.join(","));
  }
  const res = await fetch("/api/bulk/send", { method: "POST", body });
  const json = await res.json();
  if (!json.success) {
    throw new Error(json.error?.message ?? "Failed to send");
  }
  return json.data;
}

export async function uploadAttachments(files: File[]): Promise<{
  ids: string[];
  count: number;
  totalSize: number;
  files: Array<{ filename: string; contentType: string; size: number }>;
}> {
  const formData = new FormData();
  for (const file of files) {
    formData.append("attachments", file);
  }
  const res = await fetch("/api/attachments/upload", { method: "POST", body: formData });
  const json = await res.json();
  if (!json.success) {
    throw new Error(json.error?.message ?? "Failed to upload attachments");
  }
  return json.data;
}
