export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public details?: unknown
  ) {
    super(message);
    this.name = "ApiError";
  }
}

interface ApiSuccessResponse<T> {
  success: true;
  data: T;
}

interface ApiErrorResponse {
  success: false;
  error: { code: string; message: string; details?: unknown };
}

type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse;

async function request<T>(
  url: string,
  options: RequestInit = {}
): Promise<T> {
  const res = await fetch(url, {
    headers: { "Content-Type": "application/json", ...options.headers },
    ...options,
  });

  const json: ApiResponse<T> = await res.json();

  if (!json.success) {
    throw new ApiError(
      res.status,
      json.error.code,
      json.error.message,
      json.error.details
    );
  }

  return json.data;
}

export const api = {
  get: <T>(url: string) => request<T>(url),
  post: <T>(url: string, body?: unknown) =>
    request<T>(url, { method: "POST", body: body ? JSON.stringify(body) : undefined }),
  patch: <T>(url: string, body?: unknown) =>
    request<T>(url, { method: "PATCH", body: body ? JSON.stringify(body) : undefined }),
  delete: <T>(url: string) => request<T>(url, { method: "DELETE" }),
};

// ============================================================
// FILE: src/lib/api-client.ts
// ============================================================
// PURPOSE: Typed HTTP client for making API requests from frontend components.
// HOW IT WORKS: Provides a request() function that calls fetch, parses JSON,
//   and handles the standardized { success, data/error } response format.
//   On error responses, it throws ApiError with status, code, and message.
//   The api object exposes get/post/patch/delete convenience methods with
//   proper Content-Type headers and JSON serialization.
// INTEGRATION: Used by frontend feature hooks (useProfile, useSessions, etc.)
// ============================================================
