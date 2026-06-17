import type { EmailCategory } from "@/modules/email/categories";
import type { BulkEntryStatus } from "@/models/bulk-entry";

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
