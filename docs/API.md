# API.md — Current State

All routes return `{ success: true, data }` or
`{ success: false, error: { code, message, details? } }`
(`src/utils/api-response.ts`). Unless noted, routes require auth
(`requireAuth()` → `CurrentUser`) and are ownership-scoped.

## Generate

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/generate` | Generate email. Body: `prompt`, `category`, `modelId`, optional `tone` (`formal`/`semi-formal`/`casual`), optional `sessionId` (persists prompt+response as messages, injects history). Returns `content`, `modelUsed`, `id`, `sessionId?`. |

## Send

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/send-email` | Send via user's Gmail SMTP. Body: `to`, `subject`, `body`, optional attachments. Rate limit 5/min/user. Errors: `CREDENTIALS_NOT_CONFIGURED` 400, `CREDENTIALS_INVALID` 400, `CREDENTIALS_DECRYPTION_FAILED` 500, `SEND_FAILED` 502. |
| `POST` | `/api/attachments/upload` | Multipart upload. Limits: 10 MB/file, 24 MB total, ≤20 files; PDF/JPEG/PNG/GIF/WebP/DOCX/TXT/CSV. Returns attachment IDs for send calls. |

## Profile / Resume

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/profile` | Get profile (secrets stripped; `emailCredentials` → `{ gmailAddress, emailConfigured }`, `rawText` excluded). |
| `PATCH` | `/api/profile` | Update personal/professional/preferences/jobApplication/contacts; set `emailCredentials: { gmailAddress, appPassword }` (16 chars, whitespace stripped) or `emailCredentials: null` to remove. |
| `GET` | `/api/profile/resume` | Get parsed resume. |
| `POST` | `/api/profile/resume` | Upload + parse resume (PDF/DOCX/TXT, per-upload model override, defaults to `deepseek`); stores `parsedByModel`. |
| `PATCH` | `/api/profile/resume` | Save edited resume data. |
| `DELETE` | `/api/profile/resume` | Delete resume. |

## Sessions / Messages

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/sessions` | Create session (`title`, `category`). |
| `GET` | `/api/sessions` | List, paginated. Query: `page` (1), `pageSize` (20, max 100), `search`, `isArchived`. |
| `GET` | `/api/sessions/:id` | Get session + messages. |
| `PATCH` | `/api/sessions/:id` | Rename (`title`). |
| `DELETE` | `/api/sessions/:id` | Soft delete (`isDeleted: true`). |
| `PATCH` | `/api/sessions/:id/archive` | Toggle archive (`{ archived }`). |
| `GET` | `/api/sessions/:id/messages` | Paginated messages. Query: `page` (1), `pageSize` (50, max 100), `sort=asc\|desc`. |
| `POST` | `/api/sessions/clear` | Soft-delete all active sessions (audited `session.bulk_deleted`). |

## Bulk (batch)

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/bulk/session` | Create batch session (auto `"Batch N"`). Returns `{ id, title }`. |
| `POST` | `/api/bulk/entries` | Create entries: `{ sessionId, entries: [{ category, prompt (≥10 chars), recipient }] }`. Returns `BulkEntryData[]`. |
| `GET` | `/api/bulk/entries?sessionId=` | List entries by `sortOrder`. |
| `PATCH` | `/api/bulk/entries/:id` | Update pending/failed entry (category/prompt/recipient). |
| `DELETE` | `/api/bulk/entries/:id` | Delete entry. |
| `PATCH` | `/api/bulk/entries/batch` | Apply category to all pending/failed entries (`{ sessionId, category }`). |
| `POST` | `/api/bulk/generate` | AI-generate one entry (`{ entryId, modelId }`, rate-limited). Returns updated entry (`generated`, `generatedContent`). |
| `POST` | `/api/bulk/send` | Send generated entry (`{ entryId }`, attachments supported). Returns `{ ok, messageId }`. |

## Schedules

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/schedules` | List, paginated (`page`, `pageSize`, `status` filter). |
| `POST` | `/api/schedules` | Create (`name` ≤120 chars, `scheduledAt` ISO, `timezone`). |
| `GET` | `/api/schedules/active` | Active future schedules only (schedule picker). |
| `GET` | `/api/schedules/:id` | Get schedule + email items. |
| `PATCH` | `/api/schedules/:id` | Update name/time/timezone/status (cancel). |
| `DELETE` | `/api/schedules/:id` | Cancel + hard-delete schedule and items. |
| `POST` | `/api/schedules/:id/emails` | Add emails: `single` (snapshot to/subject/body + source refs) or `batch` (`sourceBulkEntryId`, content generated at send time). Dedup by sparse unique indexes; response `{ emails, skipped }`. |
| `PATCH` | `/api/schedules/:id/emails/:emailId` | Edit non-sent item (`to`/`subject`/`body`); `retry: true` resets `failed → ready`. |
| `DELETE` | `/api/schedules/:id/emails/:emailId` | Remove non-sent item. |
| `POST` | `/api/schedules/:id/process` | Manual per-schedule trigger (authed; for testing/immediate run). |
| `GET/POST` | `/api/cron/process-schedules` | Internal tick. No user auth — `CRON_SECRET` via `Authorization: Bearer` (GET, Vercel Cron) or `Authorization: Bearer` / `x-cron-secret` (POST). Body: `{ maxItems }`. Claims due items, generates `awaiting_content`, sends via SMTP, marks `sent`/`failed`, closes schedule (`sent`/`expired`). |

## Auth

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/auth/register` | Public. Body: `name`, `email`, `password`, `confirmPassword`, hidden `company` honeypot. Rate limit 5/min/IP + 20/min global. Errors: `VALIDATION_ERROR` 400, `DUPLICATE_EMAIL` 409, `RATE_LIMIT` 429. |
| `GET` | `/api/auth/me` | Enriched `CurrentUser` (`onboardingCompleted`, `profileCompleted`). |
| `...` | `/api/auth/[...nextauth]` | NextAuth v5 handlers (credentials JWT). |

## Telegram

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/telegram/login-code` | Generate link code (authed). |
| `DELETE` | `/api/telegram/login-code` | Revoke link code (authed). |
| `DELETE` | `/api/telegram/link` | Unlink Telegram (authed). |
| `GET` | `/api/telegram/status` | Link status (authed). |
| `POST` | `/api/telegram/webhook` | Public bot webhook (secret-verified, idempotent). |
| `GET` | `/api/telegram/health` | Public health check. |

## Error Codes (in use)

`VALIDATION_ERROR` 400, `DUPLICATE_EMAIL` 409, `UNAUTHORIZED` 401,
`FORBIDDEN` 403, `NOT_FOUND` 404, `RATE_LIMIT` 429, `AI_PROVIDER_ERROR` 502,
`CREDENTIALS_NOT_CONFIGURED` 400, `CREDENTIALS_INVALID` 400,
`CREDENTIALS_DECRYPTION_FAILED` 500, `SEND_FAILED` 502,
`SCHEDULE_EXPIRED` 400, `SCHEDULE_NOT_ACTIVE` 400,
`EMAIL_ALREADY_SENT` 400, `EMAIL_ALREADY_SCHEDULED` 409,
`CRON_UNAUTHORIZED` 401, `INTERNAL_ERROR` 500.
Full handling rules in `ERROR_HANDLING.md`.
