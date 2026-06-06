import { describe, expect, it } from "vitest";
import { boundConversationHistory } from "./history-budget";

describe("boundConversationHistory", () => {
  it("preserves the newest messages within character and item budgets", () => {
    const history = [
      { role: "user" as const, content: "old-message" },
      { role: "assistant" as const, content: "middle-message" },
      { role: "user" as const, content: "new-message" },
    ];

    const result = boundConversationHistory(history, 30, 2);
    expect(result.messages).toEqual(history.slice(1));
    expect(result.characterCount).toBeLessThanOrEqual(30);
  });

  it("clips a single oversized newest message from the end", () => {
    const result = boundConversationHistory(
      [{ role: "user", content: "1234567890" }],
      4,
      8
    );
    expect(result.messages[0].content).toBe("7890");
  });
});
