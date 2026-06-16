import type { IMessage } from "@/models/message";
import type { ChatCompletionMessageParam } from "openai/resources/chat/completions";

export function buildConversationHistory(
  messages: IMessage[]
): ChatCompletionMessageParam[] {
  return messages.map((msg) => ({
    role: msg.role === "user" ? "user" : "assistant",
    content: msg.content,
  }));
}

// ============================================================
// FILE: src/modules/session/ai-context.ts
// ============================================================
// PURPOSE: Converts Mongoose message documents to OpenAI chat completion format.
// HOW IT WORKS: buildConversationHistory() maps IMessage[] to ChatCompletionMessageParam[],
//   translating the "assistant" role to "assistant" for the OpenAI API. This adapter
//   bridges the database model and the AI provider's expected input format.
// INTEGRATION: Used by email service and Telegram AI bridge for multi-turn completions
// ============================================================
