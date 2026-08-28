export interface SessionData {
  id: string;
  title: string;
  category: string;
  type?: "single" | "batch";
  userId: string;
  metadata: Record<string, unknown>;
  isArchived: boolean;
  messageCount?: number;
  lastMessageAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface MessageData {
  id: string;
  sessionId: string;
  role: "user" | "assistant";
  content: string;
  modelUsed?: string;
  metadata: Record<string, unknown>;
  createdAt: Date;
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface SessionWithMessages extends SessionData {
  messages: MessageData[];
}

export interface SessionListOptions {
  page?: number;
  pageSize?: number;
  search?: string;
  isArchived?: boolean;
}

// ============================================================
// FILE: src/modules/session/types.ts
// ============================================================
// PURPOSE: TypeScript interfaces for session data transfer objects.
// HOW IT WORKS: SessionData is the normalized session shape returned by
//   service functions (id, title, category, metadata, isArchived, optional
//   messageCount/lastMessageAt). MessageData is the message shape. PaginatedResult<T>
//   is a generic pagination envelope. SessionListOptions defines query filters.
// INTEGRATION: Used by session service, API routes, and frontend hooks
// ============================================================
