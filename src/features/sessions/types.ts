export interface SessionData {
  id: string;
  title: string;
  category: string;
  userId: string;
  metadata: Record<string, unknown>;
  isArchived: boolean;
  messageCount?: number;
  lastMessageAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface MessageData {
  id: string;
  sessionId: string;
  role: "user" | "assistant";
  content: string;
  modelUsed?: string;
  createdAt: string;
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

// ============================================================
// FILE: src/features/sessions/types.ts
// ============================================================
// PURPOSE: TypeScript type definitions for sessions, messages, and paginated query results.
// HOW IT works: Defines SessionData (id, title, category, metadata, archive state, timestamps), MessageData (role, content, model used), PaginatedResult<T> (items, total, page info), and SessionWithMessages (session with embedded messages). These types are shared across API, hooks, and components.
// INTEGRATION: No external dependencies; consumed by sessions API, hooks, and components.
// ============================================================
