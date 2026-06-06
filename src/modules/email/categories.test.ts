import { describe, expect, it } from "vitest";
import {
  CATEGORY_POLICIES,
  EMAIL_CATEGORIES,
  resolveGenerationCategory,
} from "./categories";

describe("email category policy", () => {
  it.each(EMAIL_CATEGORIES)("provides guidance and an AI playbook for %s", (category) => {
    expect(CATEGORY_POLICIES[category].promptGuidance.length).toBeGreaterThan(0);
    expect(CATEGORY_POLICIES[category].aiInstruction.length).toBeGreaterThan(20);
  });

  it("uses an existing session's category instead of the submitted category", () => {
    expect(resolveGenerationCategory("custom", "job_application")).toBe("job_application");
    expect(resolveGenerationCategory("meeting_request")).toBe("meeting_request");
  });
});
