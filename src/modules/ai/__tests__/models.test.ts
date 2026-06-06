import { describe, expect, it } from "vitest";
import {
  MODEL_DEFAULTS,
  MODEL_IDS,
  MODEL_IDS_KEYS,
  MODEL_LABELS,
  modelIdSchema,
} from "../types";
import { generateEmailSchema } from "@/modules/email/validation";
import { addMessageSchema } from "@/modules/session/validation";

describe("AI model registry", () => {
  it("exposes exactly the six configured models", () => {
    expect(Object.keys(MODEL_IDS)).toEqual(MODEL_IDS_KEYS);
    expect(MODEL_IDS_KEYS).toHaveLength(6);
  });

  it.each(MODEL_IDS_KEYS)("provides a label for %s", (id) => {
    const label = MODEL_LABELS[id];
    expect(label.name.length).toBeGreaterThan(0);
    expect(label.description.length).toBeGreaterThan(0);
  });

  it.each(MODEL_IDS_KEYS)("uses a valid NVIDIA NIM upstream id for %s", (id) => {
    expect(MODEL_IDS[id]).toMatch(/^[a-z0-9-]+\/[a-z0-9.-]+$/);
  });

  it.each(MODEL_IDS_KEYS)("accepts %s through modelIdSchema", (id) => {
    expect(() => modelIdSchema.parse(id)).not.toThrow();
  });

  it.each(MODEL_IDS_KEYS)("accepts %s through generateEmailSchema", (id) => {
    const result = generateEmailSchema.parse({
      prompt: "Write a polite follow-up email after an interview",
      modelId: id,
    });
    expect(result.modelId).toBe(id);
  });

  it.each(MODEL_IDS_KEYS)("accepts %s through addMessageSchema", (id) => {
    const result = addMessageSchema.parse({
      prompt: "Hello there",
      modelId: id,
    });
    expect(result.modelId).toBe(id);
  });

  it("rejects unknown model ids", () => {
    expect(() => modelIdSchema.parse("not-a-model")).toThrow();
  });

  it("constrains MODEL_DEFAULTS to known models with sane values", () => {
    for (const [id, defaults] of Object.entries(MODEL_DEFAULTS)) {
      expect(MODEL_IDS_KEYS).toContain(id);
      if (defaults?.temperature !== undefined) {
        expect(defaults.temperature).toBeGreaterThanOrEqual(0);
        expect(defaults.temperature).toBeLessThanOrEqual(2);
      }
      if (defaults?.maxTokens !== undefined) {
        expect(defaults.maxTokens).toBeGreaterThan(0);
      }
    }
  });
});

describe("resume route accepts any ModelId", () => {
  it.each(MODEL_IDS_KEYS)(
    "modelIdSchema accepts %s so the resume form field can carry it",
    (id) => {
      expect(() => modelIdSchema.parse(id)).not.toThrow();
    }
  );

  it("rejects an unknown model id for resume parsing", () => {
    expect(() => modelIdSchema.parse("not-a-model")).toThrow();
  });
});
