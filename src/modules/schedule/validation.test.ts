import { describe, expect, it } from "vitest";
import {
  addScheduledEmailsSchema,
  createScheduleSchema,
  processSchedulesSchema,
  updateScheduledEmailSchema,
} from "./validation";

describe("schedule validation", () => {
  it("accepts simple schedule creation with UTC ISO time and timezone", () => {
    const input = createScheduleSchema.parse({
      name: "Tuesday outreach",
      scheduledAt: "2035-01-01T09:00:00.000Z",
      timezone: "Asia/Kolkata",
    });

    expect(input.name).toBe("Tuesday outreach");
    expect(input.scheduledAt).toBeInstanceOf(Date);
    expect(input.timezone).toBe("Asia/Kolkata");
  });

  it("validates a single email snapshot payload", () => {
    const input = addScheduledEmailsSchema.parse({
      emails: [
        {
          sourceType: "single",
          to: "alex@example.com",
          subject: "Hello",
          body: "A useful note.",
          sourceSessionId: "65f000000000000000000001",
          sourceMessageId: "65f000000000000000000002",
        },
      ],
    });

    expect(input.emails[0].sourceType).toBe("single");
  });

  it("validates a batch source payload with frozen model", () => {
    const input = addScheduledEmailsSchema.parse({
      emails: [
        {
          sourceType: "batch",
          sourceBulkEntryId: "65f000000000000000000003",
          modelId: "deepseek",
        },
      ],
    });

    expect(input.emails[0]).toEqual({
      sourceType: "batch",
      sourceBulkEntryId: "65f000000000000000000003",
      modelId: "deepseek",
    });
  });

  it("rejects snapshot edits that try to blank subject or body", () => {
    expect(() => updateScheduledEmailSchema.parse({ subject: "" })).toThrow();
    expect(() => updateScheduledEmailSchema.parse({ body: "" })).toThrow();
  });

  it("defaults cron caps to small bounded values", () => {
    expect(processSchedulesSchema.parse({})).toEqual({
      maxSchedules: 5,
      maxEmailsPerSchedule: 10,
    });
  });
});

// ============================================================
// FILE: src/modules/schedule/validation.test.ts
// ============================================================
// PURPOSE: Unit tests for schedule Zod validation schemas.
// HOW IT WORKS: Exercises schedule creation, single snapshot payloads, batch
//   source payloads, snapshot edit constraints, and cron cap defaults.
// INTEGRATION: Vitest and schedule validation module.
// ============================================================
