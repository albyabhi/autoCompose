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
// PURPOSE: Limits conversation history to fit within AI token budgets.
// HOW IT WORKS: boundConversationHistory() takes messages in chronological order,
//   walks backwards from the most recent, and selects up to HISTORY_MESSAGE_LIMIT
//   (8) messages whose total characters stay within HISTORY_CHARACTER_BUDGET (6000).
//   If a message exceeds the remaining budget, it is sliced to fit. This prevents
//   token overflow while preserving the most recent context for multi-turn emails.
// INTEGRATION: Used by email service to trim history before AI completion calls
// ============================================================
