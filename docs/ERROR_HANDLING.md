# ERROR_HANDLING.md — Current State

## Shape

```json
{ "success": false, "error": { "code": "SOME_CODE", "message": "...", "details": "..." } }
```

Produced by `failure()` (`src/utils/api-response.ts`): `AppError`
preserves `code/message/details/statusCode` (logged `warn`); anything
else becomes `INTERNAL_ERROR` 500 (logged `error` with stack).
Success: `success(data, 200)` / `created(data, 201)`.

## Hierarchy (`src/lib/errors.ts`)

| Class | Code | Status | Used for |
|---|---|---|---|
| `ValidationError` | `VALIDATION_ERROR` | 400 | Zod/input failures (all `validate()` calls) |
| `UnauthorizedError` | `UNAUTHORIZED` | 401 | Missing/invalid session (`requireAuth`) |
| `ForbiddenError` | `FORBIDDEN` | 403 | Ownership denial (`assertOwnership`) |
| `NotFoundError` | `NOT_FOUND` | 404 | Missing or not-owned resource |
| `RateLimitError` | `RATE_LIMIT` | 429 | `checkRateLimit` breaches |
| `AIProviderError` | `AI_PROVIDER_ERROR` | 502 | NVIDIA NIM failures/timeouts |
| `AppError` (direct) | domain code | varies | `DUPLICATE_EMAIL` 409, `CREDENTIALS_*`, `SEND_FAILED` 502, `SCHEDULE_*`, `EMAIL_*`, `CRON_UNAUTHORIZED` 401 |

## Route Patterns (in use today)

- **Validation first**: `validate(schema)` throws `VALIDATION_ERROR` with
  details before any DB/AI/SMTP work.
- **Ownership as 404**: not-owned reads/updates/deletes surface
  `NOT_FOUND` (no existence oracle).
- **Send path mapping**: missing creds → `CREDENTIALS_NOT_CONFIGURED`
  400; Nodemailer `EAUTH` → `CREDENTIALS_INVALID` 400; `decrypt` throw →
  `CREDENTIALS_DECRYPTION_FAILED` 500; other SMTP → `SEND_FAILED` 502.
  Retry semantics: only `failed` schedule items accept `retry: true`;
  sent items are immutable (`EMAIL_ALREADY_SENT` 400); non-active
  schedules reject edits (`SCHEDULE_NOT_ACTIVE` 400); past-due schedules
  reject (`SCHEDULE_EXPIRED` 400); duplicate adds return `skipped`
  (`EMAIL_ALREADY_SCHEDULED` 409 shape).
- **Cron**: missing/bad secret → `CRON_UNAUTHORIZED` 401 (no user auth).
- **Registration**: `DUPLICATE_EMAIL` 409; rate breaches → `RATE_LIMIT`
  429; honeypot fills silently succeed without creating an account.

## Client Handling

- Forms show field errors from `details`; toasts/banners for `message`.
- Send buttons disable with Settings hint when `emailConfigured` is
  false (preempts `CREDENTIALS_NOT_CONFIGURED`).
- Mutations roll back optimistic updates on `failure()`; bulk polling
  surfaces per-row `errorMessage`; schedule detail exposes per-item
  `errorCode`/`errorMessage` with retry.

## Logging and Audit

`src/lib/logger.ts` (debug/info/warn/error). API failures log warn
(known) or error+stack (unknown). Domain events go to `AuditLog`
(`api.error`, `validation.error`, `email.send_failed`,
`schedule.email_failed`, `telegram.email_send_failed`,
`telegram.webhook_rejected`) with `to`/`subjectLength`/`bodyLength` —
never passwords, tokens, or ciphertext.
