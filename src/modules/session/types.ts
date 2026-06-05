export interface SessionData {
  id: string;
  title: string;
  category: string;
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

export interface SessionListOptions {
  page?: number;
  pageSize?: number;
  search?: string;
  isArchived?: boolean;
}
