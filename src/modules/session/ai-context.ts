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
