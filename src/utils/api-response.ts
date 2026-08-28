import { NextResponse } from "next/server";
import { isAppError } from "@/lib/errors";
import { logger } from "@/lib/logger";

interface ApiSuccessResponse<T> {
  success: true;
  data: T;
}

interface ApiErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

export type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse;

export function success<T>(data: T, status = 200): NextResponse<ApiSuccessResponse<T>> {
  return NextResponse.json({ success: true, data }, { status });
}

export function created<T>(data: T): NextResponse<ApiSuccessResponse<T>> {
  return success(data, 201);
}

export function failure(error: unknown): NextResponse<ApiErrorResponse> {
  if (isAppError(error)) {
    logger.warn(`Request failed: ${error.code} - ${error.message}`, error.details);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: error.code,
          message: error.message,
          details: error.details,
        },
      },
      { status: error.statusCode }
    );
  }

  logger.error("Unexpected error", error instanceof Error ? { message: error.message, stack: error.stack } : error);

  return NextResponse.json(
    {
      success: false,
      error: {
        code: "INTERNAL_ERROR",
        message: "An unexpected error occurred",
      },
    },
    { status: 500 }
  );
}

// ============================================================
// FILE: src/utils/api-response.ts
// ============================================================
// PURPOSE: Consistent JSON response format for all API routes — {success: true, data} or {success: false, error: {code, message, details}}.
// HOW IT WORKS: Three helper functions that every API route uses:
//   - success(data, status=200): Returns {success: true, data} with given HTTP status.
//   - created(data): Shortcut for 201 Created — returns {success: true, data} with status 201.
//   - failure(error): Handles any error:
//     * If it's an AppError (from src/lib/errors.ts): preserves error.code, error.message, error.details, and error.statusCode. Logs as warn.
//     * If it's any other error (unexpected): returns generic INTERNAL_ERROR with status 500. Logs as error with stack trace.
//   All responses use NextResponse.json(). This ensures every endpoint returns the same shape, making frontend error handling simple.
// INTEGRATION: Used by ALL API routes (src/app/api/**/route.ts). AppError from src/lib/errors.ts. Logger from src/lib/logger.ts.
// ============================================================
