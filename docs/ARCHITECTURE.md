# ARCHITECTURE.md — Current State

## Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router), React 19, TypeScript 5 |
| Database | MongoDB via Mongoose 9 (cached singleton in `src/lib/db.ts`) |
| Auth | NextAuth.js v5 (JWT + Credentials provider, bcryptjs) |
| AI | NVIDIA NIM API via OpenAI SDK; strategy pattern in `src/modules/ai/` |
| Telegram | grammY bot (`src/modules/telegram/`) + webhook route |
| State | Zustand (layout/draft), TanStack React Query (server data) |
| Validation | Zod (request schemas + env config) |
| Email delivery | Nodemailer, Gmail SMTP (fresh transporter per send) |
| Styling | Neubrutalist CSS (`src/app/globals.css`, tokens in `CONVENTIONS.md`) |
| Testing | Vitest 3 + shims (`vitest-shims/`) |
| Parsing | pdfjs-dist (PDF), mammoth (DOCX) for resumes |

## Layered Structure

```
src/
├── app/            # Next.js App Router: (app) pages, api/ routes, auth pages
├── components/     # Shared UI: auth/, ui/ primitives, compose/send dialogs
├── features/       # Frontend modules: layout, sessions, batch, schedule, profile
├── hooks/          # Shared client hooks
├── lib/            # Infrastructure: auth/, db, errors, logger, audit,
│                   #   crypto, key-rotation, rate-limit, workers, api-client
├── models/         # Mongoose schemas (all user-scoped via userId)
├── modules/        # Backend logic: ai, attachments, bulk, email, message,
│                   #   profile, resume, schedule, session, telegram
├── config/         # Zod-validated env singleton
├── instrumentation.ts  # Starts schedule + model-benchmark workers
├── types/          # next-auth augmentation, nodemailer declarations
└── utils/          # api-response, validation, attachments
```

## Request Flow

```
UI (AppShell pages, TanStack Query)
  → API route: requireAuth() → validate(Zod) → checkRateLimit()
  → module service (ownedFilter(userId) on every query)
  → MongoDB / NVIDIA NIM / Gmail SMTP
  → success()/created() or failure() envelope
  → recordAudit() (never logs secrets)
```

## Key Subsystems

- **AI generation** (`src/modules/ai/`): `AIProvider` interface →
  `BaseAIProvider` (Tree-of-Thought + DCE system prompt) → `NvidiaNIMProvider`
  via `factory.ts`. 8 models from `MODEL_IDS`. Per-request overrides for
  `temperature`/`maxTokens` (`MODEL_DEFAULTS`). `model-recommendation/`
  benchmarks models and caches fastest-model state; refreshed by
  `src/lib/model-benchmark-worker.ts` (10-min interval, env-tunable).
- **Email** (`src/modules/email/`): `service.ts` (generate + persist +
  session messages), `sender.ts` (fresh Nodemailer per send, 10s/15s
  timeouts), `content.ts` (`parseEmailContent`, `extractEmailFromText`),
  `categories.ts` (7 policies). Dispatch path shared by single, bulk, and
  schedule sends.
- **Batch** (`src/modules/bulk/` + `src/features/batch/`): `BulkEntry`
  rows under a `type: "batch"` session; statuses
  `pending → generating → generated/failed → sending → sent`; 2s polling
  while active; Send All spaces sends ~12s apart (5/min SMTP limit).
- **Scheduling** (`src/modules/schedule/` + `src/features/schedule/`):
  `Schedule` (name, scheduledAt UTC, timezone, status
  `active/sent/expired/cancelled`) + `ScheduledEmail` items
  (`awaiting_content/ready/sending/sent/failed`, atomic claim via
  `claimedAt`). Due processing via `POST|GET /api/cron/process-schedules`
  (CRON_SECRET) and the in-process `schedule-worker.ts`
  (disabled on Vercel; Vercel Cron used instead). Dedup via sparse unique
  indexes on `{scheduleId, sourceMessageId}` and
  `{scheduleId, sourceBulkEntryId}`.
- **Profiles / resume / contacts** (`src/modules/profile/`,
  `src/modules/resume/`): single `Profile` per user; sections personal,
  professional, preferences, jobApplication, emailCredentials, contacts
  (≤500), resume. `context-builder.ts` injects category-relevant sections
  into prompts. Resume upload (PDF/DOCX/TXT) → text extract → AI structuring
  → editable at `/settings/resume/edit`.
- **Attachments** (`src/modules/attachments/` + `src/utils/attachments.ts` +
  `POST /api/attachments/upload`): per-file 10 MB, 24 MB total, ≤20 files;
  PDF/JPEG/PNG/GIF/WebP/DOCX/TXT/CSV only; forwarded to Nodemailer.
- **Telegram** (`src/modules/telegram/`): grammY bot, commands/callbacks/
  compose+send flows, login-code linking, webhook with secret + idempotency,
  rate limiting, AI bridge reusing the email service.
- **Workers** (`src/instrumentation.ts`): starts `startScheduleWorker()`
  (default 60s tick, overlap guard, `unref()` timers) and
  `startModelBenchmarkWorker()` (default 10-min tick). Both singleton per
  process, env-tunable, Vercel-aware (schedule worker off on Vercel).
- **Cross-cutting**: `src/lib/auth/*` (session, ownership, guards,
  current-user), `src/lib/errors.ts` + `src/utils/api-response.ts`
  (uniform envelope), `src/lib/rate-limit.ts` (in-memory sliding window),
  `src/lib/audit.ts` + `AuditLog` model (32 actions), `src/lib/logger.ts`
  (level-based), `src/lib/crypto.ts` + `key-rotation.ts` (envelope v2).
