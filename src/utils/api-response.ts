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
// PURPOSE: Standardized JSON response helpers for Next.js API routes.
// HOW IT WORKS: success() wraps data in { success: true, data } format.
//   created() is a 201 convenience wrapper. failure() handles errors:
//   AppError instances get their code/message/status preserved; unknown
//   errors become a generic INTERNAL_ERROR with 500 status. All responses
//   are logged via the logger for debugging.
// INTEGRATION: Used by all API routes for consistent response format
// ============================================================
