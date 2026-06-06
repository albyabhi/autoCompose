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
