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
