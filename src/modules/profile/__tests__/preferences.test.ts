import { describe, expect, it } from "vitest";
import { preferencesSchema } from "../validation";
import { MODEL_IDS_KEYS, DEFAULT_MODEL_ID } from "@/modules/ai/types";

const base = {
  formalityLevel: "semi-formal" as const,
  preferredTone: "professional" as const,
};

describe("preferencesSchema", () => {
  describe("preferredModel", () => {
    it.each(MODEL_IDS_KEYS)("accepts registered model id %s", (id) => {
      expect(() =>
        preferencesSchema.parse({ ...base, preferredModel: id })
      ).not.toThrow();
    });

    it("is optional", () => {
      expect(() => preferencesSchema.parse(base)).not.toThrow();
    });

    it("rejects unknown model ids", () => {
      expect(() =>
        preferencesSchema.parse({ ...base, preferredModel: "gpt-5" })
      ).toThrow();
    });
  });

  describe("partial PATCH payloads", () => {
    it("accepts only preferredModel (AI Settings section shape)", () => {
      expect(() =>
        preferencesSchema.parse({ preferredModel: DEFAULT_MODEL_ID })
      ).not.toThrow();
    });

    it("accepts only formalityLevel", () => {
      expect(() =>
        preferencesSchema.parse({ formalityLevel: "formal" })
      ).not.toThrow();
    });

    it("accepts only preferredTone", () => {
      expect(() =>
        preferencesSchema.parse({ preferredTone: "warm" })
      ).not.toThrow();
    });

    it("accepts defaultSignature only", () => {
      expect(() =>
        preferencesSchema.parse({ defaultSignature: "Best,\nAlice" })
      ).not.toThrow();
    });

    it("accepts preferredLanguage only", () => {
      expect(() =>
        preferencesSchema.parse({ preferredLanguage: "Spanish" })
      ).not.toThrow();
    });

    it("accepts empty object", () => {
      expect(() => preferencesSchema.parse({})).not.toThrow();
    });

    it("accepts full payload", () => {
      expect(() =>
        preferencesSchema.parse({
          formalityLevel: "formal",
          preferredTone: "direct",
          defaultSignature: "Best,\nAlice",
          preferredLanguage: "English",
          preferredModel: DEFAULT_MODEL_ID,
        })
      ).not.toThrow();
    });
  });

  describe("rejections", () => {
    it("rejects unknown formalityLevel", () => {
      expect(() =>
        preferencesSchema.parse({ ...base, formalityLevel: "fancy" })
      ).toThrow();
    });

    it("rejects unknown preferredTone", () => {
      expect(() =>
        preferencesSchema.parse({ ...base, preferredTone: "sarcastic" })
      ).toThrow();
    });

    it("rejects defaultSignature over 500 chars", () => {
      expect(() =>
        preferencesSchema.parse({ ...base, defaultSignature: "x".repeat(501) })
      ).toThrow();
    });

    it("rejects preferredLanguage over 50 chars", () => {
      expect(() =>
        preferencesSchema.parse({ ...base, preferredLanguage: "x".repeat(51) })
      ).toThrow();
    });
  });
});
