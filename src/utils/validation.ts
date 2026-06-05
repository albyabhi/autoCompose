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
