export const HISTORY_CHARACTER_BUDGET = 6000;
export const HISTORY_MESSAGE_LIMIT = 8;

export interface ConversationMessage {
  role: "user" | "assistant";
  content: string;
}

export interface BoundedHistory {
  messages: ConversationMessage[];
  characterCount: number;
}

export function boundConversationHistory(
  messages: ConversationMessage[],
  characterBudget = HISTORY_CHARACTER_BUDGET,
  messageLimit = HISTORY_MESSAGE_LIMIT
): BoundedHistory {
  const selected: ConversationMessage[] = [];
  let characterCount = 0;

  for (let index = messages.length - 1; index >= 0 && selected.length < messageLimit; index--) {
    const message = messages[index];
    const remaining = characterBudget - characterCount;
    if (remaining <= 0) break;
    const content = message.content.slice(-remaining);
    selected.unshift({ role: message.role, content });
    characterCount += content.length;
  }

  return { messages: selected, characterCount };
}

// ============================================================
// FILE: src/modules/session/history-budget.ts
// ============================================================
// PURPOSE: Prevents the AI from receiving too much conversation history — keeps only the most relevant recent messages within token limits.
// HOW IT WORKS: boundConversationHistory(messages, budget=6000 chars, limit=8 messages) takes a full conversation (chronological) and returns a trimmed version:
//   1. Starts from the MOST RECENT message and works backward.
//   2. Adds messages to the result (prepending) until either 8 messages are selected OR total characters reach 6000.
//   3. If a single message exceeds the remaining character budget, it's truncated (keeps the end of the message).
//   4. Returns { messages: selected[], characterCount: total }.
//   This ensures the AI gets recent context without exceeding token limits. The 6000 char budget leaves room for system prompt + user prompt + profile context + response.
//   Constants: HISTORY_MESSAGE_LIMIT=8, HISTORY_CHARACTER_BUDGET=6000.
// INTEGRATION: Used by email service (src/modules/email/service.ts) when building AI requests for existing sessions. Called with messages from getMessageHistory() (session service).
// ============================================================
