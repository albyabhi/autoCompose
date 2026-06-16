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
// PURPOSE: Defines a custom error class hierarchy for structured error handling.
// HOW IT WORKS: AppError is the base class with code, statusCode, and details.
//   Subclasses (ValidationError=400, NotFoundError=404, RateLimitError=429,
//   UnauthorizedError=401, ForbiddenError=403, AIProviderError=502) provide
//   semantic error types. isAppError() is a type guard for catching errors
//   in API routes and returning consistent HTTP responses.
// INTEGRATION: Used by all API routes and service modules for error handling
// ============================================================
