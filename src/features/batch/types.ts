import type { EmailCategory } from "@/modules/email/categories";

export type BulkEntryStatus =
  | "pending"
  | "generating"
  | "generated"
  | "failed"
  | "sending"
  | "sent";

export interface BulkEntryData {
  id: string;
  sessionId: string;
  userId: string;
  category: EmailCategory;
  prompt: string;
  recipient: string;
  status: BulkEntryStatus;
  generatedContent?: string;
  subject?: string;
  modelUsed?: string;
  errorMessage?: string;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateEntryPayload {
  sessionId: string;
  entries: Array<{
    category: EmailCategory;
    prompt: string;
    recipient: string;
  }>;
}

export interface EntryAttachmentInfo {
  filename: string;
  size: number;
}

export interface SendEntryInput {
  entryId: string;
  sharedFiles?: File[];
  rowFiles?: File[];
  sharedAttachmentIds?: string[];
  rowAttachmentIds?: string[];
}
