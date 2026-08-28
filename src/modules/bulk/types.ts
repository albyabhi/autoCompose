import type { EmailCategory } from "@/modules/email/categories";
import type { BulkEntryStatus } from "@/models/bulk-entry";

export interface CreateEntryPayload {
  sessionId: string;
  entries: Array<{
    category: EmailCategory;
    prompt: string;
    recipient: string;
  }>;
}

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

// ============================================================
// FILE: src/modules/bulk/types.ts
// ============================================================
// PURPOSE: TypeScript interface for a single bulk email entry — the shape returned to the frontend and API clients.
// HOW IT WORKS: BulkEntryData mirrors the BulkEntry MongoDB document but with serialized dates (ISO strings). Fields: unique id, parent sessionId, owner userId, email category, user's prompt, recipient email, status (pending/generating/generated/sending/sent/failed), AI-generated content (after generation), extracted subject, AI model used, error message if failed, sortOrder for display order, creation/update timestamps.
// INTEGRATION: Used by bulk service (src/modules/bulk/service.ts) for return types, batch API routes (src/app/api/batch/**/route.ts), and batch UI components (src/features/batch/components/**).
// ============================================================
