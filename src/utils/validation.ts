import { z } from "zod";
import { ValidationError } from "@/lib/errors";

export function validate<T>(schema: z.ZodSchema<T>, data: unknown): T {
  const result = schema.safeParse(data);
  if (!result.success) {
    const details = result.error.flatten();
    throw new ValidationError("Validation failed", details);
  }
  return result.data;
}

export function validateAsync<T>(schema: z.ZodSchema<T>, data: unknown): Promise<T> {
  return Promise.resolve(validate(schema, data));
}

// ============================================================
// FILE: src/utils/validation.ts
// ============================================================
// PURPOSE: Zod validation wrapper that throws ValidationError on failure.
// HOW IT WORKS: validate() runs schema.safeParse() and throws ValidationError
//   with flattened field errors if validation fails. validateAsync() is an
//   async wrapper for consistency. Both return the typed, validated data on success.
// INTEGRATION: Used by API routes to validate request bodies and query params
// ============================================================
