export class AppError extends Error {
  public readonly code: string;
  public readonly statusCode: number;
  public readonly details?: unknown;

  constructor(code: string, message: string, statusCode = 500, details?: unknown) {
    super(message);
    this.name = "AppError";
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
  }
}

export class ValidationError extends AppError {
  constructor(message: string, details?: unknown) {
    super("VALIDATION_ERROR", message, 400, details);
    this.name = "ValidationError";
  }
}

export class NotFoundError extends AppError {
  constructor(message = "Resource not found") {
    super("NOT_FOUND", message, 404);
    this.name = "NotFoundError";
  }
}

export class RateLimitError extends AppError {
  constructor(message = "Too many requests") {
    super("RATE_LIMIT", message, 429);
    this.name = "RateLimitError";
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = "Authentication required") {
    super("UNAUTHORIZED", message, 401);
    this.name = "UnauthorizedError";
  }
}

export class ForbiddenError extends AppError {
  constructor(message = "Access denied") {
    super("FORBIDDEN", message, 403);
    this.name = "ForbiddenError";
  }
}

export class AIProviderError extends AppError {
  constructor(message: string, statusCode = 502) {
    super("AI_PROVIDER_ERROR", message, statusCode);
    this.name = "AIProviderError";
  }
}

export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}

// ============================================================
// FILE: src/lib/errors.ts
// ============================================================
// PURPOSE: Defines a family of custom error classes so the app can handle different problems in a consistent, predictable way.
// HOW IT WORKS: AppError is the base class that adds three useful properties to regular JavaScript errors: a machine-readable code (like "VALIDATION_ERROR"), an HTTP status code (like 400), and optional extra details. Six specialized subclasses cover common scenarios:
//   - ValidationError (400): User sent bad data (missing fields, wrong format)
//   - NotFoundError (404): Requested resource doesn't exist or user isn't authorized to see it
//   - UnauthorizedError (401): User isn't logged in or session expired
//   - ForbiddenError (403): User is logged in but not allowed to do this action
//   - RateLimitError (429): Too many requests too quickly
//   - AIProviderError (502): The AI service (NVIDIA NIM) failed or timed out
//   The isAppError() function helps API routes detect these custom errors and return proper HTTP responses instead of crashing.
// INTEGRATION: Used everywhere — API routes (src/app/api/**/route.ts), service modules (src/modules/*/service.ts), and middleware. When you throw new NotFoundError("Schedule not found"), the API route catches it and returns a 404 with a clean JSON error.
// ============================================================
