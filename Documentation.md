# AutoCompose Documentation

AI-powered - AI Email Assistant

professional email composition tool built with Next.js 16 App Router, MongoDB, NVIDIA NIM, and a Neubrutalist design system.

**Document Version:** 1.4.3
**Last Updated:** 2026-07-02
**Last Commit:** contacts updation

---

## Architecture Overview

```
┌──────────────────────────────────────────────────────────────────┐
│                        UI Layer                                   │
│  AppShell (Header + Sidebar) → Feature Pages                     │
│    ├── / (compose)          │  ComposePage (Single/Batch toggle) │
│    ├── /dashboard           │  Workspace home                    │
│    ├── /sessions/[id]       │  SessionView or BatchSessionView   │
│    └── /settings            │  ProfileForm (4 sections)          │
│  AuthGuard wraps all (app) routes                                │
└──────────────────────────────┬───────────────────────────────────┘
                               │ API calls via TanStack Query
┌──────────────────────────────▼───────────────────────────────────┐
│                     API Routes (Next.js)                          │
│  POST /api/generate      → rate-limit → validate → service → AI  │
│  POST /api/sessions      → requireAuth → createSession           │
│  GET  /api/sessions      → requireAuth → listSessions (paginated)│
│  GET  /api/sessions/:id  → requireAuth → getSession + messages   │
│  PATCH /api/sessions/:id → requireAuth → updateSession           │
│  DELETE /api/sessions/:id → requireAuth → deleteSession (soft)   │
│  PATCH /api/sessions/:id/archive → requireAuth → toggleArchive   │
│  GET  /api/sessions/:id/messages → requireAuth → getMessages     │
│  GET  /api/profile      → requireAuth → getProfile               │
│  PATCH /api/profile     → requireAuth → updateProfile            │
│  POST /api/send-email   → requireAuth → rate-limit → decrypt → SMTP│
│  POST /api/bulk/session → requireAuth → create batch session     │
│  POST /api/bulk/entries → requireAuth → create bulk entries      │
│  GET  /api/bulk/entries → requireAuth → list bulk entries        │
│  PATCH /api/bulk/entries/:id → requireAuth → update entry        │
│  DELETE /api/bulk/entries/:id → requireAuth → delete entry       │
│  PATCH /api/bulk/entries/batch → requireAuth → batch update cat  │
│  POST /api/bulk/generate → requireAuth → rate-limit → AI gen     │
│  POST /api/bulk/send     → requireAuth → decrypt → SMTP          │
│  GET|POST /api/schedules → requireAuth → list / create           │
│  GET /api/schedules/active → requireAuth → active future only     │
│  GET|PATCH|DELETE /api/schedules/:id → requireAuth → CRUD         │
│  POST /api/schedules/:id/emails → requireAuth → add items         │
│  PATCH|DELETE /api/schedules/:id/emails/:eid → requireAuth        │
│  GET|POST /api/cron/process-schedules → cron-secret → batch send│
│  GET  /api/auth/me      → getCurrentUser (enriched)              │
└──────────────────────────────┬───────────────────────────────────┘
          ┌────────────────────┼────────────────────┐
          ▼                    ▼                    ▼
     ┌──────────┐       ┌──────────┐        ┌──────────┐
      │ MongoDB   │       │ NVIDIA   │        │ Audit    │
      │ Models    │       │ NIM API  │        │ Logs     │
      └──────────┘       └──────────┘        └──────────┘
                                                     ┌──────────┐
                                                     │ Cron     │
                                                     │ Tick     │
                                                     └──────────┘
```

---

## Project Structure

```
src/
├── app/                          # Next.js App Router
│   ├── (app)/                    # Route group — all authenticated pages
│   │   ├── layout.tsx            # AuthGuard + AppShell (shared)
│   │   ├── page.tsx              # / — ComposePage (single or batch via ?mode=)
│   │   ├── dashboard/page.tsx    # /dashboard
│   │   ├── sessions/
│   │   │   ├── page.tsx          # /sessions — history list
│   │   │   └── [id]/page.tsx     # /sessions/:id — detail + messages
│   │   └── settings/page.tsx     # /settings — profile form
│   │   └── settings/resume/edit/page.tsx  # /settings/resume/edit — resume editor
│   ├── api/                      # API routes
│   │   ├── auth/
│   │   │   ├── [...nextauth]/    # NextAuth v5 handlers
│   │   │   ├── register/route.ts
│   │   │   └── me/route.ts       # Current user (enriched)
│   │   ├── generate/route.ts     # POST /api/generate
│   │   ├── profile/route.ts      # GET/PATCH profile
│   │   ├── profile/resume/route.ts  # GET/POST/DELETE resume
│   │   ├── send-email/route.ts   # POST /api/send-email
│   │   ├── bulk/                 # Batch email endpoints
│   │   │   ├── session/route.ts  # POST /api/bulk/session
│   │   │   ├── entries/route.ts  # GET+POST /api/bulk/entries
│   │   │   ├── entries/[id]/route.ts # PATCH+DELETE /api/bulk/entries/:id
│   │   │   ├── entries/batch/route.ts # PATCH /api/bulk/entries/batch
│   │   │   ├── generate/route.ts # POST /api/bulk/generate
│   │   │   └── send/route.ts     # POST /api/bulk/send
│   │   ├── schedules/             # Schedule CRUD + item management
│   │   │   ├── route.ts           # GET+POST /api/schedules
│   │   │   ├── active/route.ts   # GET /api/schedules/active
│   │   │   ├── [id]/route.ts     # GET+PATCH+DELETE /api/schedules/:id
│   │   │   ├── [id]/process/route.ts # POST /api/schedules/:id/process (manual trigger)
│   │   │   └── [id]/emails/
│   │   │       ├── route.ts       # POST /api/schedules/:id/emails
│   │   │       └── [emailId]/route.ts # PATCH+DELETE /api/schedules/:id/emails/:emailId
│   │   ├── cron/
│   │   │   └── process-schedules/route.ts # GET+POST /api/cron/process-schedules
│   │   └── sessions/             # Session CRUD + messages
│   ├── globals.css               # Neubrutalist design system
│   ├── layout.tsx                # Root layout (providers)
│   └── login | register | auth/  # Auth pages (no AppShell)
│
├── components/                   # Shared components
│   ├── auth/
│   │   ├── session-provider.tsx  # NextAuth SessionProvider wrapper
│   │   ├── auth-guard.tsx        # Protected route wrapper
│   │   ├── user-button.tsx       # Avatar + dropdown menu
│   │   ├── login-form.tsx
│   │   └── register-form.tsx
│   ├── ui/                       # Reusable UI primitives
│   │   ├── button.tsx            # Variants: primary/secondary/danger/ghost
│   │   ├── input.tsx             # With label + error state
│   │   ├── select.tsx            # With label + error state
│   │   ├── card.tsx              # Card, CardHeader, CardBody, CardFooter
│   │   ├── skeleton.tsx          # Loading placeholders
│   │   ├── empty-state.tsx       # Empty state with icon + action
│   │   └── index.ts
│   ├── compose-page.tsx          # Single/Batch mode toggle + routing
│   ├── generate-form.tsx         # Prompt input + category + model selector
│   ├── model-selector.tsx
│   ├── response-display.tsx      # Loading/error/empty/success states
│   ├── send-email-dialog.tsx     # Reusable send modal (recipient/subject/body)
│   └── providers.tsx             # TanStack Query provider
│
├── features/                     # Feature-based modules
│   ├── layout/                   # App shell
│   │   ├── stores/layout-store.ts  # Zustand store (sidebar state)
│   │   └── components/
│   │       ├── app-shell.tsx     # Header + Sidebar + Content
│   │       ├── header.tsx        # Logo, page title, user menu
│   │       └── sidebar.tsx       # Nav items + session list
│   ├── sessions/                 # Session management
│   │   ├── types.ts
│   │   ├── api/sessions.ts        # Fetch wrappers
│   │   ├── hooks/use-sessions.ts  # TanStack Query hooks
│   │   └── components/
│   │       ├── session-card.tsx   # Inline rename, archive, delete
│   │       ├── session-list.tsx   # Infinite scroll list
│   │       ├── session-view.tsx   # Full session with messages
│   │       ├── message-bubble.tsx # Role/content + Send via Email action
│   │       └── new-session-dialog.tsx
│   ├── batch/                    # Batch email generation
│   │   ├── types.ts              # BulkEntryData, BulkEntryStatus, CreateEntryPayload
│   │   ├── api/bulk.ts           # Fetch wrappers for bulk endpoints
│   │   ├── hooks/use-bulk.ts     # TanStack Query hooks (polling on active jobs)
│   │   └── components/
│   │       ├── batch-compose-view.tsx  # Batch compose UI (toolbar + table)
│   │       ├── batch-session-view.tsx  # Batch session detail view
│   │       ├── batch-settings-panel.tsx  # Collapsible settings panel with category, row count, attachments
│   │       ├── batch-help-dialog.tsx  # Quick tips dialog for batch usage
│   │       ├── batch-stepper.tsx  # Row count stepper component
│   │       ├── bulk-table.tsx          # Entries list with empty state
│   │       ├── bulk-row.tsx            # Single entry card (edit/generate/preview/send/delete)
│   │       ├── bulk-send-bar.tsx       # Send All with progress bar + abort
│   │       └── bulk-preview-dialog.tsx # Preview + send individual entry
│   ├── schedule/                 # Email scheduling
│   │   ├── types.ts              # Frontend DTOs and payload types
│   │   ├── api/schedule.ts       # API client functions
│   │   ├── hooks/use-schedules.ts # TanStack Query hooks (list/detail/active + mutations)
│   │   ├── utils/
│   │   │   ├── status.ts         # Schedule status derivation and trigger eligibility
│   │   │   └── countdown.ts      # Time remaining calculations
│   │   └── components/
│   │       ├── add-to-schedule-dialog.tsx  # Shared modal for scheduling emails
│   │       └── schedule-form-fields.tsx    # Schedule name/date/time/timezone fields
│   └── profile/                  # Profile management
│       ├── api/profile.ts
│       ├── api/resume.ts
│       ├── hooks/use-profile.ts
│       ├── hooks/use-resume.ts
│       └── components/
│           ├── profile-form.tsx        # 5-section settings form host
│           ├── ai-settings-section.tsx  # Preferred AI Model
│           ├── email-credentials-section.tsx  # Gmail + App Password
│           ├── resume-widget.tsx       # Resume upload and display widget
│           ├── resume-editor-form.tsx  # Full resume editor form with sections
│           ├── resume-editor-contact.tsx  # Contact info editor
│           ├── resume-editor-links.tsx  # Links editor (LinkedIn, GitHub, portfolio)
│           ├── resume-editor-skills.tsx  # Skills editor
│           └── resume-editor-list.tsx  # Reusable list editor for education/experience/projects
│
├── hooks/
│   └── use-current-user.ts       # Client-side CurrentUser hook
│
├── lib/                          # Infrastructure layer
│   ├── auth/                     # Auth + ownership system
│   │   ├── types.ts              # CurrentUser interface
│   │   ├── session.ts            # getServerSession, requireAuth (cached)
│   │   ├── current-user.ts       # getCurrentUser with profile status
│   │   ├── ownership.ts          # ownedFilter, requireOwnership, assertOwnership
│   │   └── guards.ts             # withAuth / withOptionalAuth wrappers
│   ├── api-client.ts             # Typed fetch wrapper
│   ├── dal.ts                    # Legacy DAL (delegates to auth/)
│   ├── db.ts                     # Mongoose cached singleton connection
│   ├── errors.ts                 # AppError hierarchy
│   ├── logger.ts                 # Level-based structured logging
│   ├── audit.ts                  # Audit log service
│   ├── crypto.ts                 # AES-256-GCM (v1:iv:tag:ct) — server-only
│   ├── rate-limit.ts             # In-memory sliding window + registration rate limiter + honeypot
│   └── schedule-worker.ts        # In-process background worker for due schedules
│
├── models/                       # Mongoose schemas
│   ├── user.ts
│   ├── profile.ts
│   ├── email-template.ts
│   ├── audit-log.ts
│   ├── session.ts                # title, category, type, userId, isArchived, isDeleted
│   ├── message.ts                # sessionId, role, content, modelUsed
│   ├── bulk-entry.ts             # sessionId, userId, category, prompt, recipient, status, generatedContent
│   ├── schedule.ts               # userId, name, scheduledAt, timezone, status (active/sent/expired/cancelled)
│   └── scheduled-email.ts        # scheduleId, userId, sourceType, to, subject, body, deliveryState
│
├── modules/                      # Backend services
│   ├── ai/                       # AI provider (strategy pattern)
│   │   ├── types.ts
│   │   ├── provider.ts           # BaseAIProvider with ToT/DCE prompt
│   │   ├── providers/nvidia.ts   # NVIDIA NIM via OpenAI SDK
│   │   └── factory.ts
│   ├── email/                    # Email generation + delivery
│   │   ├── validation.ts         # generateEmailSchema, sendEmailSchema
│   │   ├── service.ts            # AI generation + persistence + messages
│   │   ├── sender.ts             # Nodemailer transport per-send (fresh)
│   │   ├── content.ts            # parseEmailContent() subject/body splitter
│   │   └── categories.ts         # Policy registry + readiness types
│   ├── profile/                  # Profile CRUD
│   │   ├── types.ts
│   │   ├── validation.ts
│   │   ├── service.ts            # Uses ownedFilter() guards
│   │   └── context-builder.ts
│   ├── session/                  # Session CRUD
│   │   ├── types.ts
│   │   ├── validation.ts
│   │   ├── service.ts            # Paginated, searchable, archived filter
│   │   └── ai-context.ts         # Build conversation history for AI
│   ├── message/                  # Message CRUD
│   │   └── service.ts
│   ├── schedule/                 # Email scheduling
│   │   ├── types.ts              # Schedule DTOs and process result types
│   │   ├── validation.ts         # Zod schemas for all schedule operations
│   │   └── service.ts            # CRUD, snapshot management, cron processing
│   └── bulk/                     # Batch email operations
│       ├── types.ts              # BulkEntryData DTO
│       ├── validation.ts         # Zod schemas (createEntries, updateEntry, generate, send)
│       └── service.ts            # createEntries, listEntries, updateEntry, deleteEntry,
│                                 #   batchUpdateCategory, generateEntry (AI), sendEntry (SMTP)
│
├── config/
│   └── index.ts                  # Zod-validated env config singleton
├── instrumentation.ts            # Next.js startup hook — starts schedule worker
├── types/
│   └── next-auth.d.ts            # Session type augmentation
├── utils/
│   ├── api-response.ts           # success() / created() / failure()
│   └── validation.ts             # validate() wrapper
└── auth.ts                       # NextAuth v5 config (JWT + credentials)

vitest-shims/                     # Vitest-only stubs
├── server-only.ts                # Empty module for "server-only" alias
└── setup.ts                      # Test env defaults
vitest.config.ts                  # @ alias + server-only alias + setupFiles
```

---

## Setup

### Prerequisites

- Node.js 22+
- MongoDB Atlas cluster (or local MongoDB)
- NVIDIA NIM API key

### Installation

```bash
npm install
```

### Environment Variables

Copy `.env.local.example` to `.env.local` and fill in:

| Variable | Description |
|---|---|
| `MONGODB_URI` | MongoDB connection string |
| `NVIDIA_API_KEY` | NVIDIA NIM API key |
| `NVIDIA_BASE_URL` | NVIDIA API base URL |
| `AUTH_SECRET` | NextAuth secret (generate with `openssl rand -base64 32`) |
| `CRON_SECRET` | Shared secret protecting `/api/cron/process-schedules` |
| `SCHEDULE_BACKGROUND_WORKER` | Optional; set to `false` to disable the local/self-hosted in-process schedule worker |
| `SCHEDULE_WORKER_INTERVAL_MS` | Optional; schedule worker tick interval in milliseconds, defaults to `60000` |
| `SCHEDULE_WORKER_MAX_SCHEDULES` | Optional; max due schedules processed per worker tick, defaults to `5` |
| `SCHEDULE_WORKER_MAX_EMAILS_PER_SCHEDULE` | Optional; max emails per schedule per worker tick, defaults to `10` |
| `NODE_ENV` | `development`, `production`, or `test` |
| `NEXT_PUBLIC_APP_URL` | Public app URL |

### Run

```bash
npm run dev       # Development server on :3000
npm run build     # Production build
npm start         # Production server
```

---

## Route Structure

| Path | Auth | Layout | Description |
|---|---|---|---|
| `/` | Required | AppShell + AuthGuard | Compose email (single or batch via `?mode=batch`) |
| `/dashboard` | Required | AppShell + AuthGuard | Workspace home |
| `/sessions` | Required | AppShell + AuthGuard | Session history (paginated) |
| `/sessions/:id` | Required | AppShell + AuthGuard | Session detail + messages |
| `/settings` | Required | AppShell + AuthGuard | Profile management |
| `/settings/resume/edit` | Required | AppShell + AuthGuard | Edit parsed resume data |
| `/schedules` | Required | AppShell + AuthGuard | Schedule list and creation |
| `/schedules/:id` | Required | AppShell + AuthGuard | Schedule detail with email status |
| `/login` | Public | Centered card | Sign in |
| `/register` | Public | Centered card | Create account |
| `/auth/error` | Public | Minimal | Auth error display |

The `(app)` route group applies a unified `AuthGuard` + `AppShell` layout to all authenticated pages, providing persistent header, sidebar, and session context.

---

## API Reference

### `POST /api/generate`

Generate an email with optional session persistence.

**Request Body:**

```json
{
  "prompt": "Write a leave request email for 3 days off",
  "category": "leave_request",
  "modelId": "deepseek",
  "tone": "formal" (optional — "formal" | "semi-formal" | "casual"),
  "sessionId": "665a1b2c..." (optional)
}
```

**Response (201):**

```json
{
  "success": true,
  "data": {
    "content": "Subject: Leave Request\n\nDear [Manager's Name],...",
    "modelUsed": "deepseek-ai/deepseek-v4-flash",
    "id": "template-id",
    "sessionId": "session-id" (if sessionId was provided)
  }
}
```

When `sessionId` is provided, the prompt and response are saved as messages in the session, and previous conversation history is injected into the AI context.

### `POST /api/sessions`

Create a new session.

```json
{ "title": "Leave Request for Tomorrow", "category": "leave_request" }
```

### `GET /api/sessions`

List sessions with pagination, search, and archive filtering.

| Query | Type | Default | Description |
|---|---|---|---|
| `page` | int | 1 | Page number |
| `pageSize` | int | 20 | Items per page (max 100) |
| `search` | string | — | Filter by title |
| `isArchived` | bool | — | Filter archived state |

### `GET /api/sessions/:id`

Get session with all messages.

### `PATCH /api/sessions/:id`

Rename session.

```json
{ "title": "Updated Title" }
```

### `DELETE /api/sessions/:id`

Soft delete (sets `isDeleted: true`).

### `PATCH /api/sessions/:id/archive`

Toggle archive.

```json
{ "archived": true }
```

### `GET /api/sessions/:id/messages`

Get paginated messages for a session.

| Query | Type | Default | Description |
|---|---|---|---|
| `page` | int | 1 | Page number |
| `pageSize` | int | 50 | Items per page (max 100) |

### `GET /api/profile`

Get current user's profile.

### `PATCH /api/profile`

Update profile sections.

```json
{
  "personal": { "fullName": "John Doe", "phone": "...", "location": "..." },
  "professional": { "designation": "...", "organization": "..." },
  "preferences": { "formalityLevel": "formal", "preferredTone": "professional" },
  "jobApplication": { "resumeUrl": "...", "linkedIn": "...", "portfolio": "..." }
}
```

To save Gmail credentials:

```json
{ "emailCredentials": { "gmailAddress": "me@gmail.com", "appPassword": "abcd efgh ijkl mnop" } }
```

To remove Gmail credentials:

```json
{ "emailCredentials": null }
```

The password is encrypted server-side before write; the encrypted form is never returned by GET. The Zod schema strips whitespace and requires exactly 16 characters.

### `POST /api/send-email`

Send a generated email via the user's own Gmail account (App Password auth). Requires the user to have configured Gmail credentials via `PATCH /api/profile` first.

**Rate limit:** 5 requests / 60 s per user.

**Request Body:**

```json
{
  "to": "recipient@example.com",
  "subject": "Leave request for next week",
  "body": "Hi Manager,\n\nPlease consider my leave.\n\nBest,\nArjun"
}
```

**Response (200):**

```json
{ "success": true, "data": { "sent": true } }
```

**Errors:**

| Code | Status | Cause |
|---|---|---|
| `CREDENTIALS_NOT_CONFIGURED` | 400 | User has not saved Gmail credentials yet. |
| `CREDENTIALS_INVALID` | 400 | Gmail rejected the credentials (revoked or wrong). |
| `CREDENTIALS_DECRYPTION_FAILED` | 500 | Stored blob can't be decrypted (AUTH_SECRET rotated, tampered record). |
| `SEND_FAILED` | 502 | SMTP / network error. |
| `VALIDATION_ERROR` | 400 | `to` / `subject` / `body` failed Zod. |
| `RATE_LIMIT` | 429 | > 5 sends in 60 s. |

### Batch / Bulk Endpoints

Batch generation lets users create multiple email drafts at once (rows), generate them individually or in bulk, preview, regenerate, and send in sequence.

#### `POST /api/bulk/session`

Create a new batch session (type `"batch"`). Auto-named `"Batch N"`.

**Response (201):**
```json
{ "id": "session-id", "title": "Batch 1" }
```

#### `POST /api/bulk/entries`

Create one or more bulk entries in a batch session.

**Request Body:**
```json
{
  "sessionId": "session-id",
  "entries": [
    { "category": "leave_request", "prompt": "Write a leave request", "recipient": "manager@co.com" }
  ]
}
```

**Response (201):** Array of `BulkEntryData` objects.

#### `GET /api/bulk/entries?sessionId=<id>`

List all entries for a batch session, sorted by `sortOrder`.

#### `PATCH /api/bulk/entries/:id`

Update a pending/failed entry's category, prompt, or recipient.

```json
{ "prompt": "Updated prompt text..." }
```

Requires prompt >= 10 chars, recipient must be valid email.

#### `DELETE /api/bulk/entries/:id`

Delete a single bulk entry.

#### `PATCH /api/bulk/entries/batch`

Apply a category to all pending/failed entries in a session.

```json
{ "sessionId": "id", "category": "complaint" }
```

#### `POST /api/bulk/generate`

Generate an email for a single entry via AI.

```json
{ "entryId": "id", "modelId": "deepseek" }
```

Rate-limited per user. Returns updated `BulkEntryData` with `status: "generated"` and `generatedContent`.

#### `POST /api/bulk/send`

Send a generated entry's email via the user's Gmail SMTP.

```json
{ "entryId": "id" }
```

**Response:**
```json
{ "ok": true, "messageId": "..." }
```

Uses `dispatchSendEmail()` — same credential/rate-limit path as individual email sending.

---

## Schedule Endpoints

### `GET /api/schedules`

List schedules with pagination and status filtering.

| Query | Type | Default | Description |
|---|---|---|---|
| `page` | int | 1 | Page number |
| `pageSize` | int | 20 | Items per page (max 100) |
| `status` | string | — | Filter by status (`active`, `sent`, `expired`, `cancelled`) |

### `POST /api/schedules`

Create a new schedule.

**Request Body:**
```json
{
  "name": "Tuesday Outreach",
  "scheduledAt": "2026-07-02T09:00:00.000Z",
  "timezone": "America/New_York"
}
```

### `GET /api/schedules/active`

Returns only schedules that are active and still in the future. Used by the `AddToScheduleDialog` picker.

### `GET /api/schedules/:id`

Get a schedule with all its email items.

### `PATCH /api/schedules/:id`

Update schedule name, scheduled time, timezone, or status (cancel).

```json
{ "name": "Updated Name", "status": "cancelled" }
```

### `DELETE /api/schedules/:id`

Cancel and delete a schedule (hard delete of schedule + all email items).

### `POST /api/schedules/:id/emails`

Add one or more emails to a schedule. Supports two source types:

**Single (from compose or session):**
```json
{
  "emails": [{
    "sourceType": "single",
    "sourceSessionId": "...",
    "sourceMessageId": "...",
    "to": "recipient@example.com",
    "subject": "Meeting Reminder",
    "body": "Hi, just a reminder about our meeting...",
    "category": "meeting_request",
    "prompt": "Write a meeting reminder",
    "modelId": "deepseek"
  }]
}
```

**Batch (from bulk entry, generates content at send time):**
```json
{
  "emails": [{
    "sourceType": "batch",
    "sourceBulkEntryId": "entry-id",
    "modelId": "deepseek"
  }]
}
```

Deduplication uses unique sparse indexes on `{scheduleId, sourceMessageId}` and `{scheduleId, sourceBulkEntryId}`. Duplicate rows are skipped and reported in the response.

**Response:**
```json
{ "emails": [...], "skipped": 0 }
```

### `PATCH /api/schedules/:id/emails/:emailId`

Edit recipient, subject, or body of a scheduled email, or retry a failed one.

```json
{ "to": "new@example.com", "retry": true }
```

Only non-sent items can be mutated. Setting `retry: true` resets `deliveryState` from `"failed"` to `"ready"`.

### `DELETE /api/schedules/:id/emails/:emailId`

Remove a scheduled email item (not-yet-sent only).

### `GET/POST /api/cron/process-schedules`

Internal cron endpoint. Protected by `CRON_SECRET` — does not use user auth.

**Vercel Cron:** Vercel calls this route with `GET` and `Authorization: Bearer <CRON_SECRET>`.

**Manual/local POST:** Use either `Authorization: Bearer <CRON_SECRET>` or `x-cron-secret: <CRON_SECRET>`.

**Deployment note:** `vercel.json` schedules this route every minute. Vercel Hobby plans only support once-per-day cron jobs, so per-minute schedule sending requires Vercel Pro/Enterprise or an external cron service that calls this endpoint.

**Request Body:**
```json
{ "maxItems": 20 }
```

**Processing flow:**
1. Finds schedules where `scheduledAt <= now` and `status === "active"`
2. For each due schedule, atomically claims up to `maxItems` email items (sets `deliveryState: "sending"`)
3. For items with `deliveryState === "awaiting_content"` (batch sources), generates content via the AI provider
4. Sends each claimed item via the user's Gmail SMTP (`dispatchSendEmail()`)
5. Marks items as `"sent"` or `"failed"` with error details
6. After processing all items, marks the schedule as `"sent"` (or `"expired"` if past-due)

---

### `GET /api/auth/me`

Get enriched current user (`CurrentUser` with `onboardingCompleted` + `profileCompleted`).

### `POST /api/auth/register`

Register a new user account. **Public endpoint** — no authentication required.

**Rate limit:** 5 requests / 60 s per IP + 20 requests / 60 s global.

**Honeypot protection:** Includes a hidden `company` field. Bot submissions that fill this field are silently discarded (returns 200 with no account created).

**Request Body:**

```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "StrongP@ss1",
  "confirmPassword": "StrongP@ss1",
  "company": ""
}
```

**Response (201):**

```json
{
  "success": true,
  "data": {
    "user": {
      "id": "user-id",
      "name": "John Doe",
      "email": "john@example.com"
    }
  }
}
```

**Errors:**

| Code | Status | Cause |
|---|---|---|
| `VALIDATION_ERROR` | 400 | Input validation failed (name, email, password complexity, password match). |
| `DUPLICATE_EMAIL` | 409 | An account with this email already exists. |
| `RATE_LIMIT` | 429 | > 5 registrations from the same IP in 60 s, or > 20 registrations globally in 60 s. |

**Note:** The server action (`src/app/actions/auth.ts`) used by the `RegisterForm` component enforces identical rate limits and honeypot protection.

### Error Codes

| Code | Status | Meaning |
|---|---|---|
| `VALIDATION_ERROR` | 400 | Input validation failed |
| `DUPLICATE_EMAIL` | 409 | Email already registered |
| `UNAUTHORIZED` | 401 | Authentication required |
| `FORBIDDEN` | 403 | Access denied |
| `NOT_FOUND` | 404 | Resource not found |
| `RATE_LIMIT` | 429 | Too many requests |
| `AI_PROVIDER_ERROR` | 502 | AI API error |
| `CREDENTIALS_NOT_CONFIGURED` | 400 | Gmail credentials not set in Settings |
| `CREDENTIALS_INVALID` | 400 | Gmail rejected the stored App Password |
| `CREDENTIALS_DECRYPTION_FAILED` | 500 | Stored credentials blob cannot be decrypted |
| `SEND_FAILED` | 502 | SMTP / network error during send |
| `SCHEDULE_EXPIRED` | 400 | Schedule date is in the past |
| `SCHEDULE_NOT_ACTIVE` | 400 | Cannot modify a non-active schedule |
| `EMAIL_ALREADY_SENT` | 400 | Cannot modify an already-sent email item |
| `EMAIL_ALREADY_SCHEDULED` | 409 | Email is already in the target schedule (dedup match) |
| `CRON_UNAUTHORIZED` | 401 | Missing or invalid cron secret header |
| `INTERNAL_ERROR` | 500 | Unexpected error |

---

## Frontend Architecture

### Global State

- **Auth**: NextAuth v5 with JWT — `useSession()` for client, `auth()` for server
- **CurrentUser**: `useCurrentUser()` hook — enriches session with profile status via `/api/auth/me`
- **Layout**: Zustand store — sidebar open/close, mobile state, active view, compose draft auto-save (prompt + category persisted across navigation, restored on revisit, cleared on successful generation)
- **Server data**: TanStack Query — caching, revalidation, optimistic updates, infinite scroll

### AppShell Layout

```
┌─────────────────────────────────────────────────────┐
│ Header                                               │
│ [☰] AutoCompose / PageTitle                          │
├───────────┬─────────────────────────────────────────┤
│ Sidebar   │ Content Area                             │
│           │                                          │
│ ▦ Dashboard│  ┌───────────────────────────────┐     │
│ ✎ Compose  │  │  Page-specific content        │     │
│ T Schedules│  │                               │     │
│ ⚙ Settings │  └───────────────────────────────┘     │
│ ────────   │                                        │
│ SESSIONS   │                                        │
│ [+]        │                                        │
│ ┌────────┐ │                                        │
│ │ Card 1  │ │                                        │
│ │ Card 2  │ │                                        │
│ │ Card 3  │ │                                        │
│           │ │                                        │
│ [UserBtn] │ │                                        │
└───────────┴─────────────────────────────────────────┘
```

- **Responsive**: Sidebar collapses to flyout on mobile (< 768px) with backdrop overlay
- **Persistent**: Sidebar open/closed state preserved across navigation via Zustand store
- **Infinite scroll**: Session list loads more on scroll via `useInfiniteQuery`
- **Keyboard shortcut**: `Cmd/Ctrl+K` navigates to the compose page (`/`) from anywhere in the app
- **User menu**: `UserButton` is rendered in the sidebar footer, not the header

### Single Compose (GenerateForm)

The compose page (`/`) shows a **Single / Batch** toggle. In single mode, `GenerateForm` provides:

- **Prompt textarea** — auto-focused on mount, character counter with color-coded warning (>80% yellow, >95% red)
- **Tone toggle** — Formal / Neutral (semi-formal) / Casual selector. Defaults to the user's profile formality preference; clicking a tone overrides it per-generation. Passed as `tone` in the API request and applied in `buildProfileContext()` to override `formalityLevel`.
- **Draft auto-save** — Unsubmitted prompts are persisted to the Zustand `layoutStore.draft` on every change. On revisit (without `sessionId` or cloned prompt), the draft is restored with a "Draft restored" banner and a Discard button. The draft is cleared on successful generation.
- **Category selector** — With policy guidance and per-category prompt suggestions.
- **Model selector** — Defaults to profile's `preferredModel`, allows per-generation override.

### Batch Email Generation

In batch mode, the `BatchComposeView` renders a collapsible `BatchSettingsPanel` and an entries table (`BulkTable`). The settings panel contains:

- **Mail Type selector** — Set category for all rows
- **Apply to All** — Apply category to all pending/failed rows
- **Row stepper** — Add 1-50 blank entries at once
- **Shared Attachments** — Files sent with every email in the batch

Each entry row (`BulkRow`) has:

- **Category/Email Type** selector
- **Prompt** textarea
- **Recipient** email input
- **Generate** button — triggers AI generation for that row (updates status to `generating` → `generated` / `failed`)
- **Preview** — opens `BulkPreviewDialog` with subject/body editor and individual Send button
- **Regenerate** — re-runs AI generation
- **Delete** — removes the row

The `BatchHelpDialog` provides quick tips for optimal batch usage. The `BulkSendBar` at the bottom shows stats and a **Send All** button that iterates through generated entries with a 12-second gap between sends (to respect the 5/min rate limit). A progress bar with abort is shown during sending.

Batch sessions use `Session.type = "batch"` and get a `Batch` badge in the session list. Opening a batch session navigates to `BatchSessionView` instead of the message-based `SessionView`. Batch entries are stored in the `BulkEntry` model.

**Auto-polling:** `useBulkEntries` polls every 2 seconds while any entry has `"generating"` or `"sending"` status.

### Session Management

| Feature | Implementation |
|---|---|---|
| Create | `NewSessionDialog` → `useCreateSession` mutation |
| List | `useInfiniteSessions` with infinite scroll |
| Rename | Inline input on `SessionCard` → `useUpdateSession` (optimistic update with rollback on error) |
| Archive | `useToggleArchive` mutation |
| Delete | `useDeleteSession` mutation (soft delete) |
| Messages | `useSessionMessages(id)` — paginated with `useInfiniteQuery`, 20 per page sorted desc, "Load earlier messages" button, messages reversed for display |
| Batch View | `BatchSessionView` for sessions with `type === "batch"` |
| AI Context | `getMessageHistory()` builds conversation for AI |

### Email Scheduling

Scheduling allows users to defer email delivery to a future date/time, with full timezone support. The system supports both single emails (from compose or session history) and batch entries (which generate AI content at send time).

#### Schedule Lifecycle

```
Create → ACTIVE → (cron picks up at scheduledAt) → SENT
                    ↓ (past due, no items sent)    → EXPIRED
                    ↓ (user cancels)               → CANCELLED
```

#### Key Flow

1. **User creates a schedule** — Name, scheduled date/time, and browser timezone are stored as a `Schedule` document.
2. **User adds emails** — From compose (`AddToScheduleDialog`) or directly on the schedule detail page. Single emails snapshot the recipient/subject/body at scheduling time. Batch entries store the `sourceBulkEntryId` with `deliveryState: "awaiting_content"` — the AI generates content at send time.
3. **Background worker processes** — Locally or on a self-hosted Node server, `src/instrumentation.ts` starts an in-process worker that checks due schedules every minute by default. On Vercel, `vercel.json` configures Vercel Cron to call `GET /api/cron/process-schedules` every minute on production deployments.
4. **Items are sent** — The cron processor atomically claims a batch of due items, generates AI content for `"awaiting_content"` items, sends via the user's Gmail SMTP, and updates status. Each user's credential is decrypted per-item (no long-lived secrets in memory).

#### `AddToScheduleDialog`

Shared modal component used from:
- **Batch compose** — The `BulkSendBar` offers "Schedule All" to defer remaining generated entries.
- **Single compose** — The `ResponseDisplay` success card has a "Schedule" button.
- **Session view** — Assistant messages offer "Schedule via Email" in the `MessageBubble`.

The dialog lets users pick an existing active future schedule or create a new one inline. Adding multiple emails shows a progress bar. Items already present in the schedule (detected by unique source references) are silently skipped.

#### Duplication Protection

Unique sparse indexes on `{scheduleId, sourceMessageId}` and `{scheduleId, sourceBulkEntryId}` ensure the same email is never scheduled twice within the same schedule. Duplicates are reported in the `skipped` count.

### Schedule Worker

The schedule worker is an in-process background service that processes due schedules automatically.

#### Architecture

```
src/instrumentation.ts → startScheduleWorker() → setInterval(tick)
                                                      ↓
                                              processDueSchedules()
                                                      ↓
                                              dispatchSendEmail()
```

#### Configuration

| Env Var | Default | Description |
|---|---|---|
| `SCHEDULE_BACKGROUND_WORKER` | `true` | Set to `false` to disable the worker |
| `SCHEDULE_WORKER_INTERVAL_MS` | `60000` | Tick interval in milliseconds (min 5000) |
| `SCHEDULE_WORKER_INITIAL_DELAY_MS` | `1000` | Delay before first tick after startup |
| `SCHEDULE_WORKER_MAX_SCHEDULES` | `5` | Max due schedules processed per tick |
| `SCHEDULE_WORKER_MAX_EMAILS_PER_SCHEDULE` | `10` | Max emails processed per schedule per tick |

#### Behavior

- **Singleton**: Only one worker per Node.js process (global state prevents duplicates)
- **Non-blocking**: Uses `unref()` timers so the worker doesn't prevent process exit
- **Overlapping protection**: Skips tick if previous tick is still running
- **Vercel-aware**: Automatically disabled on Vercel (uses Vercel Cron instead)
- **Logging**: Logs at INFO level when items are processed, DEBUG for empty ticks

#### Manual Trigger

For testing or immediate processing, you can manually trigger a schedule:

```
POST /api/schedules/:id/process
Authorization: Bearer <user-token>
```

This runs the cron processor for a single schedule, processing all due items immediately.

### Profile Management

| Section | Component | Fields |
|---|---|---|
| Personal | inline (ProfileForm) | Full Name, Phone, Location |
| Professional | inline (ProfileForm) | Designation, Department, Organization, College, Degree |
| Writing Preferences | inline (ProfileForm) | Formality Level, Preferred Tone, Signature, Language |
| Job Application | inline (ProfileForm) | Resume URL, LinkedIn, GitHub, Portfolio |
| AI Settings | `AiSettingsSection` | Preferred AI Model (default for compose and resume parsing) |
| Email Credentials | `EmailCredentialsSection` | Gmail address, encrypted App Password (5th section) |
| Contacts | `ContactsSection` | Saved name + email pairs for recipient autocomplete across compose, session, batch, and send-email |
| Resume | (see below) | AI-parsed skills, education, experience, projects |

The first four sections are rendered by `ProfileForm` with the shared dirty-state / save button pattern. `AiSettingsSection` and `EmailCredentialsSection` are mounted as dedicated components beneath the form so they can host section-specific UX (status badges, destructive remove actions, password masking, help links).

The default AI model for both email composition and resume parsing is set in **Settings → AI Settings → Preferred AI Model**. The per-action selector in compose and resume upload still allows one-off overrides without changing the saved preference. The default is applied on first render of the action form; changing the preference while a form is open does not retroactively update it.

### Contacts Management

The **Contacts** tab in Settings lets users save frequently-used contact pairs (name + email). Contacts are stored as an array on the profile document and surfaced via the `useProfile` hook. A `ContactAutocomplete` UI component (`src/components/ui/contact-autocomplete.tsx`) replaces the native email input on all recipient fields — compose, session messages, batch rows, and the send-email dialog — providing inline filtering by name or email with keyboard navigation and click-to-select. CRUD operations (add, edit, delete) are handled by the `ContactsSection` component and persisted via `PATCH /api/profile` with the `contacts` field. Input validation enforces non-empty name (max 100 chars), valid email (max 320 chars), and a maximum of 500 contacts per user.

### Resume Parsing & Editing

The Resume section in Settings accepts PDF, DOCX, or TXT uploads. Parsing is streamed from `POST /api/profile/resume` and persisted to `Profile.resume` (with `rawText` excluded from `GET` responses). The AI model used for parsing is selectable per-upload inside the upload card; defaults to `deepseek`. The chosen upstream model id is stored on `Profile.resume.parsedByModel` for audit.

After parsing, users can review and edit the extracted data at `/settings/resume/edit`. The `ResumeEditorForm` provides modular sections for editing contact info, links (LinkedIn, GitHub, portfolio), skills, education, experience, and projects. The form tracks dirty state and prompts before navigation when unsaved changes exist.

### Email Sending

AutoCompose can deliver a generated email through the user's own Gmail account, authenticated with a Google **App Password** (not the Gmail password). The full path:

1. **Configure** — In **Settings → Email Credentials**, the user enters their Gmail address and a 16-character App Password. The password is validated (whitespace stripped, length === 16) and encrypted with AES-256-GCM (`v1:iv:tag:ct` hex) using a key derived from `AUTH_SECRET` via `scryptSync` (`src/lib/crypto.ts`). The encrypted form is stored on `Profile.emailCredentials.encryptedAppPassword` and is **never** returned by the API — `sanitizeProfile()` is the single secret-stripping site.
2. **Trigger** — The "Send via Email" button appears in two places:
   - On the compose page's `ResponseDisplay` success card (the freshly generated email).
   - On every assistant message in a session (`MessageBubble` in `/sessions/:id`), so the user can re-send any past email.
   In both cases the button reads `emailCredentials.emailConfigured` from the cached profile (TanStack Query, `["profile"]`); when `false` it is disabled with a tooltip and a "Connect Gmail in Settings" hint.
3. **Compose** — The `SendEmailDialog` pre-fills the subject and body by calling `parseEmailContent(content)` (`src/modules/email/content.ts`), which strips a leading `Subject: ...` line if present (case-insensitive) and trims the body. The user can override the recipient, subject, and body.
4. **Send** — `POST /api/send-email` runs through:
   1. `requireAuth()` (rate-limited at 5/min per user via `checkRateLimit('send-email:${userId}')`).
   2. `validate(sendEmailSchema)` — Zod-validated `to` / `subject` / `body`.
   3. `Profile.findOne(ownedFilter(userId)).select('emailCredentials')` — ownership-scoped, projection-minimised.
   4. `decrypt(encryptedAppPassword)` — decryption happens at the route boundary. If this throws, the route returns `CREDENTIALS_DECRYPTION_FAILED` 500.
   5. `sendEmail(...)` (`src/modules/email/sender.ts`) — builds a **fresh** Nodemailer transporter per call (`smtp.gmail.com:465`, `secure: true`, `connectionTimeout: 10s`, `socketTimeout: 15s`, `logger: false`, `debug: false`), calls `sendMail`, then `transporter.close()` in `finally`. The plaintext password lives only for the request lifetime.
   6. `recordAudit('email.sent' | 'email.send_failed')` — never logs the password; logs `to`, `subjectLength`, `bodyLength`, and the failure reason.
5. **Errors** — `EAUTH` from Nodemailer → `CREDENTIALS_INVALID` 400. Other SMTP errors → `SEND_FAILED` 502. Missing credentials → `CREDENTIALS_NOT_CONFIGURED` 400.

**Security invariants** (enforced in code):

- `encryptedAppPassword` is written only by `updateProfile()` (`src/modules/profile/service.ts:53-67`) and is read by `decrypt()` only inside the `send-email` route.
- The `from` header is the user's own Gmail (the SMTP authenticator) — we never spoof a sender.
- Rotating `AUTH_SECRET` invalidates all stored passwords; users must re-enter them in Settings. This is the only secret-rotation failure mode and is documented in the Settings hint.

---

## Auth & Ownership System

### Multi-Tenant Isolation

Every document has a `userId` field. All queries use `ownedFilter(userId)` which auto-injects `{ userId }` into the MongoDB filter. This prevents any data leakage between users.

### Enforcement Chain

```
API Route → requireAuth() → returns CurrentUser
  → Service receives userId
    → ownedFilter(userId) applied to query
      → MongoDB returns only owned documents
```

### Key Files

| File | Purpose |
|---|---|
| `lib/auth/types.ts` | `CurrentUser` interface |
| `lib/auth/session.ts` | `getServerSession()`, `requireAuth()` (cached) |
| `lib/auth/current-user.ts` | `getCurrentUser()` with profile status |
| `lib/auth/ownership.ts` | `ownedFilter()`, `requireOwnership()`, `assertOwnership()` |
| `lib/auth/guards.ts` | `withAuth()` API route wrapper |

---

## Database Models

### Session

| Field | Type | Description |
|---|---|---|
| `title` | string | Session display name |
| `category` | enum | Email category |
| `type` | "single" \| "batch" | Session type (default: "single") |
| `userId` | string (indexed) | Owner |
| `metadata` | Mixed | Extensible data |
| `isArchived` | boolean | Archive flag |
| `isDeleted` | boolean | Soft delete flag |
| `deletedAt` | Date | When soft-deleted |

Indexes: `{ userId: 1, isDeleted: 1, createdAt: -1 }`, text index on `title`.

### Message

| Field | Type | Description |
|---|---|---|
| `sessionId` | ObjectId (ref Session) | Parent session |
| `role` | "user" \| "assistant" | Message author |
| `content` | string | Message body |
| `modelUsed` | string | AI model (assistant only) |
| `metadata` | Mixed | Extensible data |

Index: `{ sessionId: 1, createdAt: 1 }`.

### BulkEntry

| Field | Type | Description |
|---|---|---|
| `sessionId` | ObjectId (ref Session) | Parent batch session |
| `userId` | string (indexed) | Owner |
| `category` | enum | Email category |
| `prompt` | string | Generation prompt (max 5000 chars) |
| `recipient` | string | Target email address |
| `status` | enum | `pending` → `generating` → `generated` / `failed` → `sending` → `sent` |
| `generatedContent` | string (optional) | AI-generated email body |
| `subject` | string (optional) | Extracted email subject |
| `modelUsed` | string (optional) | AI model used for generation |
| `errorMessage` | string (optional) | Error details on failure |
| `sortOrder` | number | Display ordering within session |

Indexes: `{ sessionId: 1, sortOrder: 1 }`, `{ userId: 1, status: 1 }`.

### Schedule

| Field | Type | Description |
|---|---|---|
| `userId` | string (indexed) | Owner |
| `name` | string | Schedule display name (max 120 chars) |
| `scheduledAt` | Date (indexed) | Absolute UTC date/time for processing |
| `timezone` | string | Browser timezone (e.g. `America/New_York`) |
| `status` | enum | `active` → `sent` / `expired` / `cancelled` |

Index: `{ userId: 1, status: 1, scheduledAt: 1 }`.

### ScheduledEmail

| Field | Type | Description |
|---|---|---|
| `scheduleId` | ObjectId (ref Schedule) | Parent schedule |
| `userId` | string (indexed) | Owner |
| `sourceType` | `"single"` \| `"batch"` | How the email was added |
| `sourceSessionId` | ObjectId (optional) | Source session (single mode) |
| `sourceMessageId` | ObjectId (optional, sparse unique) | Source message (single mode — dedup key) |
| `sourceBulkEntryId` | ObjectId (optional, sparse unique) | Source bulk entry (batch mode — dedup key) |
| `to` | string | Recipient email |
| `subject` | string (optional) | Email subject (max 200 chars) |
| `body` | string (optional) | Email body (max 20000 chars) |
| `category` | enum (optional) | Email category |
| `prompt` | string (optional) | Frozen prompt for regeneration (max 5000 chars) |
| `modelId` | enum (optional) | AI model for content generation |
| `deliveryState` | enum | `awaiting_content` / `ready` / `sending` / `sent` / `failed` |
| `claimedAt` | Date (optional) | When cron claimed this item |
| `sentAt` | Date (optional) | When the email was delivered |
| `errorCode` | string (optional) | Machine-readable error on failure |
| `errorMessage` | string (optional) | Human-readable error on failure |
| `sortOrder` | number | Display ordering within schedule |

Indexes: `{ scheduleId: 1, sortOrder: 1 }`, `{ userId: 1, deliveryState: 1 }`, unique sparse on `{ scheduleId, sourceMessageId }` and `{ scheduleId, sourceBulkEntryId }`.

### Profile

| Field | Type | Description |
|---|---|---|
| `userId` | string (unique) | Owner |
| `personal` | subdoc | Name, phone, location |
| `professional` | subdoc | Designation, org, education |
| `preferences` | subdoc | Tone, formality, signature, language, preferred model |
| `jobApplication` | subdoc | Resume, LinkedIn, portfolio URLs |
| `emailCredentials` | subdoc | `gmailAddress` (string), `encryptedAppPassword` (AES-256-GCM hex) — both optional |
| `contacts` | array | Saved contacts `{ id, name, email }[]` for recipient autocomplete |
| `resume` | subdoc | AI-parsed skills, education, experience, projects (with `rawText` stripped from GET) |

### EmailTemplate

| Field | Type | Description |
|---|---|---|
| `category` | enum | Email category |
| `prompt` | string | Original prompt |
| `generatedEmail` | string | AI response |
| `modelUsed` | string | Model ID |
| `userId` | string | Owner |
| `metadata` | Mixed | Extra data |

### AuditLog

| Field | Type | Description |
|---|---|---|
| `action` | enum | Event type |
| `entityType` | string | Related model |
| `entityId` | string | Related record |
| `userId` | string | Who performed action |
| `metadata` | Mixed | Context |
| `ip` / `userAgent` | string | Request info |

---

## Audit Actions

The system tracks 32 distinct audit actions in `src/models/audit-log.ts`:

### Email Actions
| Action | Description |
|---|---|
| `email.generated` | AI email generated (single, batch, or schedule) |
| `email.regenerated` | Email regenerated with different model/settings |
| `email.sent` | Email delivered via Gmail SMTP |
| `email.send_failed` | SMTP delivery failed |
| `email.credentials_saved` | Gmail credentials saved to profile |
| `email.credentials_removed` | Gmail credentials deleted from profile |
| `email.credentials_migrated_to_v2` | Credentials migrated from v1 to v2 encryption |

### Auth Actions
| Action | Description |
|---|---|
| `auth.login` | Successful login |
| `auth.logout` | User logged out |
| `auth.signup` | New account created |
| `auth.failed_login` | Login attempt with invalid credentials |
| `auth.session_refresh` | JWT token refreshed |

### Session Actions
| Action | Description |
|---|---|
| `session.created` | New session created |
| `session.updated` | Session metadata updated |
| `session.deleted` | Session soft-deleted |
| `session.bulk_deleted` | All user sessions soft-deleted |
| `session.archived` | Session archived |
| `session.unarchived` | Session unarchived |

### Schedule Actions
| Action | Description |
|---|---|
| `schedule.created` | New schedule created |
| `schedule.updated` | Schedule metadata updated |
| `schedule.cancelled` | Schedule cancelled |
| `schedule.email_added` | Email item added to schedule |
| `schedule.email_sent` | Scheduled email delivered |
| `schedule.email_failed` | Scheduled email delivery failed |

### Telegram Actions
| Action | Description |
|---|---|
| `telegram.linked` | Telegram account linked to user |
| `telegram.unlinked` | Telegram account unlinked |
| `telegram.login_code_generated` | Login code generated for Telegram |
| `telegram.login_code_attempt` | Login code verification attempted |
| `telegram.message_received` | Message received from Telegram |
| `telegram.command_executed` | Bot command executed |
| `telegram.email_generated` | Email generated via Telegram |
| `telegram.email_sent` | Email sent via Telegram |
| `telegram.email_send_failed` | Email send failed via Telegram |
| `telegram.webhook_rejected` | Webhook request rejected |

### System Actions
| Action | Description |
|---|---|
| `model.switched` | AI model switched |
| `api.error` | API error occurred |
| `validation.error` | Input validation failed |

---

## AI Provider System

Strategy pattern with abstract base class:

```
AIProvider (interface)
  └── BaseAIProvider (abstract)
        └── NvidiaNIMProvider
```

Uses OpenAI SDK to call NVIDIA NIM API. Supports conversation history injection for session continuation.

### Models

| ID | Label | NVIDIA Model ID | Notes |
|---|---|---|---|
| `deepseek` | DeepSeek V4 Flash | `deepseek-ai/deepseek-v4-flash` | Default. Fast general-purpose drafting. |
| `nemotron` | Nemotron Super 49B | `nvidia/llama-3.3-nemotron-super-49b-v1.5` | NVIDIA reasoning model. |
| `gptOss` | GPT-OSS 20B | `openai/gpt-oss-20b` | OpenAI open-weight reasoning (Apache-2.0). |
| `mistralSmall` | Mistral Small 4 (119B) | `mistralai/mistral-small-4-119b-2603` | Hybrid instruct + reasoning, 256K ctx. Default temp 0.6. |
| `llamaMaverick` | Llama 4 Maverick 17B | `meta/llama-4-maverick-17b-128e-instruct` | Meta multimodal MoE, 1M ctx. |
| `minimaxM27` | MiniMax M2.7 | `minimaxai/minimax-m2.7` | Code/agent-tuned MoE (230B/10B). Default temp 1.0. |
| `llamaNemotronNano` | Llama Nemotron Nano 8B VL | `nvidia/llama-3.1-nemotron-nano-vl-8b-v1` | NVIDIA lightweight multimodal vision-language. |
| `nemotron3Ultra` | Nemotron 3 Ultra 550B | `nvidia/nemotron-3-ultra-550b-a55b` | NVIDIA flagship reasoning, 550B param MoE (55B active). |

### Prompt Engineering

The system prompt embeds Tree of Thought + DCE reasoning:
1. **DIVERGE** — Consider 3 different approaches (tone, structure, strategy)
2. **CONVERGE** — Select the best approach based on context
3. **EVALUATE** — Verify the email achieves its goal effectively

---

## Code Documentation Convention

Every source file has a standardized comment block at the **bottom of the file** explaining its purpose, how it works, and key integrations. This ensures readability for both technical and mid-technical team members.

### Format

```typescript
// ============================================================
// FILE: src/path/to/file.ts
// ============================================================
// PURPOSE: [1 sentence — what this file does]
// HOW IT WORKS: [2-3 sentences — the logic/flow explained simply]
// PROPS: [for components — key props and their types]
// [SECURITY: for sensitive files — security implications]
// INTEGRATION: [key dependencies and external services]
// ============================================================
```

### Sections

| Section | Required | Description |
|---|---|---|
| `FILE` | Yes | Relative path for quick navigation |
| `PURPOSE` | Yes | One clear sentence on what the file does |
| `HOW IT WORKS` | Yes | 2-3 sentences explaining the logic flow |
| `PROPS` | Components only | Key props with brief descriptions |
| `SECURITY` | Sensitive files | Security implications (e.g., "Server-only — handles encrypted credentials") |
| `INTEGRATION` | Yes | Dependencies, external services, and consumers |

### Examples

**Infrastructure file:**
```typescript
// ============================================================
// FILE: src/lib/crypto.ts
// ============================================================
// PURPOSE: Provides AES-256-GCM encryption/decryption for sensitive data (Gmail passwords).
// HOW IT WORKS: Derives a 32-byte encryption key from the auth secret using
//   scrypt. encrypt() generates a random 12-byte IV, encrypts the plaintext,
//   and returns a versioned string: "v1:<iv>:<authTag>:<ciphertext>". decrypt()
//   parses this format, validates hex encoding, and decrypts with auth tag
//   verification to detect tampering.
// [SECURITY] Server-only - handles encrypted credential storage
// INTEGRATION: Uses auth secret from config as encryption key source
// ============================================================
```

**React component:**
```typescript
// ============================================================
// FILE: src/components/send-email-dialog.tsx
// ============================================================
// PURPOSE: Modal dialog for composing and sending an email via Gmail SMTP.
// HOW IT WORKS: Opens with pre-filled subject and body from the generated email.
//   User enters recipient email, can edit subject/body, and clicks Send. Calls
//   /api/send-email via the API client. Shows success/error states. Supports
//   Escape key to close and backdrop click. Resets state on each open via key prop.
// PROPS: open (boolean), onClose (callback), defaultSubject, defaultBody
// INTEGRATION: API client (post to /api/send-email), UI components (Button, Input)
// ============================================================
```

---

## UI Design System

Based on Neubrutalist design specification in `skills/ui-skill.md`.

### Visual Tokens

| Token | Value |
|---|---|
| Border | `3px solid #000` |
| Shadow | `6px 6px 0 #000` |
| Radius | `8px` |
| Primary | `#ffd700` (Yellow) |
| Error | `#ff4d6d` (Pink) |
| Success | `#06d6a0` (Green) |
| Surface | `#f8f9fa` |
| Background | `#e8e6e1` |

### Component States

Every interactive component implements:
- **Default** — Strong border, hard shadow, flat color
- **Hover** — Shadow expands, element shifts `-2px, -2px`
- **Active/Pressed** — Shadow collapses, element shifts `4px, 4px`
- **Focus** — `4px solid yellow` outline
- **Disabled** — 50% opacity, no-pointer

### UI Primitives (src/components/ui/)

| Component | Props |
|---|---|
| `Button` | `variant` (primary/secondary/danger/ghost), `loading` |
| `Input` | `label`, `error`, standard input attrs |
| `Select` | `label`, `error`, `options: { value, label }[]` |
| `Card` | `hover` (adds interactive shadow), `CardHeader/CardBody/CardFooter` |
| `Skeleton` | `width`, `height`, `SkeletonCard`, `SkeletonList` |
| `EmptyState` | `icon`, `title`, `description`, `action` |
| `ContactAutocomplete` | `contacts`, `value`, `onChange`, standard input attrs — filters saved contacts by name/email |

### Email-sending UI classes (in `globals.css`)

| Class | Purpose |
|---|---|
| `.send-btn` / `.send-btn--inline` | Blue neubrutalist button on `ResponseDisplay` and `MessageBubble`. Inline variant is smaller. |
| `.send-btn-hint` | Underlined "Connect Gmail in Settings" link shown when the button is disabled. |
| `.response-actions` / `.message__actions` | Flex containers for the action row. |
| `.dialog-backdrop` | Existing dark overlay (50% black) for the send dialog and other modals. |
| `.dialog__header` | Flex row with a 2px black bottom border — separates title from body. |
| `.dialog__close` | 36×36 square button, turns pink on hover. |
| `.dialog__body` | Flex column with 16px gap for form fields. |
| `.dialog__title` | Existing 24px / 800 weight / uppercase title. |
| `.dialog__actions` | Existing flex row for footer buttons. |
| `.settings-badge` / `--success` / `--muted` | Pill-shaped status badges (e.g. "Connected" / "Not connected") with a 2px hard shadow and dot indicator. |
| `.settings-section__title-row` | Flex row that hosts the section title and a status badge. |

---

## Extending

### Adding an Email Category

1. Add to `z.enum([...])` in `src/modules/email/validation.ts`
2. Update `EmailCategory` type in `src/models/email-template.ts`
3. Update category enum in `src/models/session.ts`

### Adding an AI Model

1. Add an entry to `MODEL_IDS` (registry key → upstream NVIDIA model id) in `src/modules/ai/types.ts`.
2. Append the new key to `MODEL_IDS_KEYS` in the same file. The `ModelId` type and `modelIdSchema` are both derived from this tuple, so consumers (validation, UI) pick it up automatically.
3. Add a `{ name, description }` entry to `MODEL_LABELS` — the model selector renders both.
4. (Optional) Add a `MODEL_DEFAULTS` entry if the model needs a non-default `temperature` or `maxTokens`. The provider will apply these only when the caller has not overridden the value.
5. Mirror the new key into `nvidia.models` in `src/config/index.ts` to keep the config map in sync.
6. Update the **Models** table above.

### Adding a Protected API Route

```typescript
import { requireAuth } from "@/lib/auth/session";
import { ownedFilter } from "@/lib/auth/ownership";

export async function GET() {
  const user = await requireAuth();
  const data = await Model.find(ownedFilter(user.userId));
  return success(data);
}
```

### Adding a Protected Frontend Page

1. Create page file inside `src/app/(app)/` (inherits AuthGuard + AppShell)
2. Use `useCurrentUser()` hook for client-side user access
3. Use `useQuery` / `useMutation` from TanStack Query for data fetching

### New Mongoose Model with Ownership

```typescript
const schema = new Schema({
  userId: { type: String, required: true, index: true },
  // ... other fields
});
```

Every query against this model must use `ownedFilter(userId)`.

---

## Changelog

### 2026-07-02 — Contacts updation (commit `610a042`)

- **New Contacts management** — Settings page gains a **Contacts** tab (`ContactsSection`) for managing saved name + email pairs. Supports add, edit (inline), and delete with confirmation. Persisted to `Profile.contacts` array via `PATCH /api/profile`.
- **New `ContactAutocomplete` component** — Replaces native email inputs in `ResponseDisplay`, `MessageBubble`, `BulkRow`, and `SendEmailDialog`. Filters up to 5 contacts by case-insensitive substring match on name or email. Supports ArrowUp/ArrowDown/Enter/Escape keyboard navigation, click-to-select, and click-outside-to-close.
- **New validation** — `contactSchema` and `contactsUpdateSchema` in `src/modules/profile/validation.ts` enforce name (1-100 chars), valid email, and max 500 contacts per user.
- **Model update** — `IContact` interface and `contacts` field added to Profile schema in `src/models/profile.ts`.
- **API integration** — `updateContacts()` in `src/features/profile/api/profile.ts`. `sanitizeProfile()` passes contacts through. Profile service persists `contacts` field on update.
- **CSS** — New styles for contact autocomplete dropdown (`.contact-autocomplete`, `.contact-autocomplete__dropdown`, `.contact-autocomplete__option*`) and settings contacts list (`.settings-section__list`, `.settings-list-item`, `.settings-list-item__btn--edit/delete`). Removed redundant opacity overrides on recipient labels.
- Files changed: 14 files across components, hooks, models, services, validation, and CSS.

### 2026-07-01 — Email scheduling feature

- **New scheduling system** — Users can now schedule emails for future delivery with full timezone support. Schedule single emails from compose/session view or batch entries from bulk generation.
- **New database models** — `Schedule` (name, scheduledAt, timezone, status) and `ScheduledEmail` (recipient, subject, body, deliveryState) Mongoose schemas in `src/models/schedule.ts` and `src/models/scheduled-email.ts`.
- **New API routes** — 6 RESTful endpoints under `/api/schedules/` (list, create, detail, update, cancel, process) plus nested email item CRUD under `/api/schedules/:id/emails/`. Protected by `requireAuth()` and ownership enforcement.
- **New cron endpoint** — `GET/POST /api/cron/process-schedules` (protected by `CRON_SECRET`) atomically claims due items, generates AI content for batch entries, and sends via the user's Gmail SMTP.
- **New server module** — `src/modules/schedule/` with `service.ts` (CRUD + cron processor), `validation.ts` (Zod schemas), and `types.ts` (DTOs). Includes deduplication via sparse unique indexes and resumable delivery state machine.
- **New background worker** — `src/lib/schedule-worker.ts` starts an in-process worker via `src/instrumentation.ts` that checks due schedules every minute. Automatically disabled on Vercel (uses Vercel Cron instead).
- **New frontend feature** — `src/features/schedule/` with API client, TanStack Query hooks (list/detail/active + all mutations), `AddToScheduleDialog` (pick existing or create new schedule inline with progress UI), `ScheduleFormFields` (name/date/time/timezone inputs), and status utility functions.
- **New pages** — `/schedules` (list + create) and `/schedules/:id` (detail with email item cards, cancel, retry, remove actions) under `src/app/(app)/schedules/`.
- **Schedule button on batch** — `BulkRow` and `BulkSendBar` gain a "Schedule" button (`.bulk-card__btn--schedule` orange variant, `.send-btn--schedule`) that opens `AddToScheduleDialog` with all generated entries.
- **Schedule button on single compose** — `ResponseDisplay` success card offers scheduling via the shared dialog.
- **New CSS** — ~200 lines of schedule classes in `globals.css` (`.schedule-card`, `.schedule-status`, `.schedule-dialog__*`, `.schedule-form-fields`, progress bar, email body preview).
- **Validation tests** — `src/modules/schedule/validation.test.ts` covers schedule creation, single/batch payloads, snapshot edits, and cron defaults.
- **New env vars** — `CRON_SECRET` for securing the cron endpoint, `SCHEDULE_BACKGROUND_WORKER`, `SCHEDULE_WORKER_INTERVAL_MS`, `SCHEDULE_WORKER_MAX_SCHEDULES`, `SCHEDULE_WORKER_MAX_EMAILS_PER_SCHEDULE` for worker configuration.
- **Audit actions** — 6 new schedule-related audit actions: `schedule.created`, `schedule.updated`, `schedule.cancelled`, `schedule.email_added`, `schedule.email_sent`, `schedule.email_failed`.
- Files changed: 25+ files across API routes, components, hooks, services, models, pages, CSS, and tests.

### 2026-07-01 — Resume data edit feature (commit `df12ba3`)

- **New resume editor page** — `/settings/resume/edit` route with `ResumeEditorForm` component. Users can review and edit all parsed resume data (contact info, links, skills, education, experience, projects) before saving.
- **Modular editor components** — `ResumeEditorContact`, `ResumeEditorLinks`, `ResumeEditorSkills`, `ListSection` (reusable for education/experience/projects) in `src/features/profile/components/`.
- **Resume API update** — `PATCH /api/profile/resume` now accepts full resume data edits. New validation schema in `src/modules/profile/validation.ts`.
- **Dirty state tracking** — Form detects unsaved changes and prompts before navigation.
- **UI improvements** — 472 lines of new CSS for the resume editor interface.
- Files changed: 13 files across routes, components, hooks, services, and CSS.

### 2026-07-01 — Batch list fix + profile updates (commit `1a7820f`)

- **Optimistic update fix** — `useGenerateEntry` now updates the cache entry directly on success before invalidating queries, preventing batch list flicker.
- **GitHub field added** — Profile's Job Application section now includes a GitHub URL field.
- Files changed: 6 files across hooks, components, models, and validation.

### 2026-07-01 — Batch UI improvements (commit `abc4dc1`)

- **Bulk row UI refinements** — Improved styling and layout for batch entry cards.
- Files changed: 2 files (globals.css, bulk-row.tsx).

### 2026-06-30 — Batch configuration refactor (commit `027579a`)

- **New BatchSettingsPanel** — Extracted batch configuration into a dedicated collapsible panel component (`batch-settings-panel.tsx`) with category selector, row count stepper, Apply to All, and shared attachments.
- **New BatchHelpDialog** — Quick tips dialog with best practices for batch email generation (10 tips on optimal usage).
- **Batch compose view refactor** — Simplified `BatchComposeView` to use the new settings panel and help dialog components.
- **BatchSessionView improvements** — Updated layout and configuration handling.
- **Removed batch-sidebar** — Sidebar functionality merged into the new settings panel.
- Files changed: 6 files across components and CSS.

### 2026-06-30 — Session view button fix (commit `8d21955`)

- **Button styling fix** — Fixed oversized buttons in session view with proper neubrutalist styling.
- Files changed: 2 files (globals.css, session-view.tsx).

### 2026-06-27 — Registration rate limiting & bot protection

- **IP-based rate limiting on registration** — `POST /api/auth/register` and the `register()` server action now enforce 5 requests per IP per 60 seconds, plus a global bucket of 20 registrations per 60 seconds. Uses the existing `checkRateLimit()` infrastructure with a new `checkRegistrationRateLimit(ip)` wrapper.
- **Honeypot bot detection** — Both registration paths now check for a hidden `company` form field. Bot submissions that fill this field are silently discarded (returns 200 with no account created). The `RegisterForm` component renders the hidden input, off-screen and unfocusable.
- **Config centralization** — Rate limit constants for registration are defined in `src/config/index.ts` under `auth.rateLimit.registration` (IP: 5/min, global: 20/min).
- **New test suite** — `src/lib/rate-limit.test.ts` with 13 tests covering `checkRateLimit`, `checkRegistrationRateLimit` (per-IP isolation, global bucket), and `validateHoneypot` (empty, absent, filled, whitespace, non-string).
- Files changed: `src/lib/rate-limit.ts`, `src/config/index.ts`, `src/app/api/auth/register/route.ts`, `src/app/actions/auth.ts`, `src/components/auth/register-form.tsx`, `src/lib/rate-limit.test.ts`, `Documentation.md`.

### 2026-06-26 — UE features 1 (commit `7d7f72b`)

- **Tone toggle** — New Formal/Neutral/Casual tone selector in `GenerateForm`. Overrides the profile's `formalityLevel` per-generation. Passed as `tone` in the API request and applied in `buildProfileContext()`. New `.tone-toggle` and `.tone-btn` CSS classes.
- **Draft auto-save** — `layoutStore` gains `draft` field (prompt + category). Unsubmitted compose forms are persisted across navigation, restored on revisit with a "Draft restored" banner, and cleared on successful generation. New `.draft-restore-dismiss` CSS.
- **Session messages pagination** — `SessionView` now uses `useSessionMessages()` with `useInfiniteQuery` (20 per page, sorted descending). A "Load earlier messages" button appears when more pages are available. New `.session-detail__load-earlier` CSS. Messages API now supports `?sort=asc|desc`.
- **Optimistic rename** — `useUpdateSession` now applies optimistic updates to the sessions cache on rename, with rollback on error.
- **Keyboard shortcut** — `Cmd/Ctrl+K` navigates to the compose page from anywhere.
- **Session view button fix** — Fixed oversized buttons in session view with proper neubrutalist styling.
- **Profile default model in batch** — `BatchComposeView` now respects the profile's `preferredModel` as the default model selector value, with per-session override.
- **Character counter styling** — Prompt length counter color-codes based on usage: muted (<80%), warning yellow (>80%), danger red (>95%).
- Files changed: 15 files across API routes, components, hooks, services, stores, and CSS.

### 2026-06-26 — Subject fix on batch (commit `0df1fe7`)

- **Fixed subject duplication in batch email body** — `BulkPreviewDialog` body textarea now initializes from `parseEmailContent().body` (stripped) instead of raw `generatedContent`. `generateEntry()` in `bulk/service.ts` now passes `parsed.body` to `dispatchSendEmail()` so the SMTP body no longer contains the subject line as its first line. `BulkRow` inline preview also uses the parsed body.
- Files changed: `src/modules/bulk/service.ts`, `src/features/batch/components/bulk-preview-dialog.tsx`, `src/features/batch/components/bulk-row.tsx`

### 2026-06-24 — Width fix (commit `b9b7be2`)

- **Responsive width fixes** — Auth forms (login/register), send-email dialog, and bulk preview dialog width adjustments for better mobile and tablet display.
- **New CSS** added for responsive breakpoints across auth and dialog surfaces.
- Files changed: `src/app/globals.css`, `src/components/auth/login-form.tsx`, `src/components/auth/register-form.tsx`, `src/components/send-email-dialog.tsx`, `src/features/batch/components/bulk-preview-dialog.tsx`

### 2026-06-22 — Settings UI change (commit `3d52846`)

- **Settings page UI redesign** — Restructured layout with better spacing, new `Tabs` UI component added to `src/components/ui/tabs.tsx`, profile form updates.
- **New CSS** — 150+ lines of settings page and form styling.
- Files changed: `src/app/(app)/settings/page.tsx`, `src/app/globals.css`, `src/components/ui/index.ts`, `src/components/ui/tabs.tsx`, `src/features/profile/components/profile-form.tsx`

### 2026-06-22 — Optimality improvements (commit `29b03a4`)

- **Batch compose view optimization** — Refactored `BatchComposeView` for cleaner state management and reduced re-renders.
- **Auto-polling optimization** — `useBulkEntries` hook improved with smarter polling intervals and invalidation logic.
- Files changed: `src/features/batch/components/batch-compose-view.tsx`, `src/features/batch/hooks/use-bulk.ts`

### 2026-06-22 — Sending with attachments (commit `e375ad6`)

- **New attachment system** — Complete end-to-end file attachment support for email sending:
  - **New `POST /api/attachments/upload` route** — accepts multipart uploads, validates files (10 MB per file / 24 MB total / 20 file max, allowed MIME types: PDF, JPEG, PNG, GIF, WebP, DOCX, TXT, CSV), stores as Buffer, returns attachment IDs.
  - **New `AttachmentUpload` UI component** (`src/components/ui/attachment-upload.tsx`) — drag-and-drop or file picker with validation feedback, per-row and shared attachment support.
  - **New `AttachmentFile` / `NodemailerAttachment` types** — `src/utils/attachments.ts` with file validation (size, type, total), buffer conversion, form-data parsing, and file size formatting helpers.
  - **New `src/modules/attachments/service.ts`** — MongoDB-backed attachment storage with CRUD operations.
  - **API integration** — `sendEntry` in `bulk/service.ts` now accepts `NodemailerAttachment[]`. `dispatchSendEmail()` and `sendEmail()` in `src/modules/email/` forward attachments to Nodemailer transporter.
  - **Frontend** — `BulkRow` gets per-row `AttachmentUpload`. `BulkPreviewDialog` shows attachment count and passes them through on send. `BulkTable` / `BulkSendBar` support shared attachments via props. `sendEntryWithAttachments` and `uploadAttachments` API wrappers in `bulk.ts`.
  - **Send-email dialog** updated to support attachments.
  - **UI states** — Upload progress indicator, success/error feedback, attachment count display in preview dialog.
  - Files changed: 20 files across API routes, components, hooks, services, and utilities.

### 2026-06-22 — Session page prompt hide/expand (commit `8f6a979`)

- **Collapsible long prompts in session view** — `MessageBubble` now collapses user prompts longer than 12 lines with a "Show full prompt" toggle. Truncated view shows first 10 lines + ellipsis.
- **Active session visual indicator** — `.session-card--active` CSS class adds yellow background and border highlight for the currently selected session.
- Files changed: `src/app/globals.css`, `src/features/sessions/components/message-bubble.tsx`

### 2026-06-21 — Clear sessions feature (commits `91a885e`, `4b3b7e1`)

- **New "Clear All Sessions" feature** in Settings (`src/components/settings/clear-sessions-card.tsx`) — soft-deletes all active sessions with confirmation dialog. Shows session count, progress, and success/error feedback.
- **New `POST /api/sessions/clear` route** — `clearAllSessions()` in `src/modules/session/service.ts` does a bulk `updateMany` with `isDeleted: true` and `deletedAt` timestamp. Audited as `session.bulk_deleted`.
- **New `useClearAllSessions` hook** in `src/features/sessions/hooks/use-sessions.ts` — invalidates sessions cache on success.
- **CSS refinements** — Settings page gap increased to 32px, responsive breakpoints for mobile, title size adjustment.
- Files changed: 7 files across API route, component, hooks, service, model, and CSS.

### 2026-06-21 — Email extraction (commit `64bc03f`)

- **Auto email extraction from prompts** — New `extractEmailFromText()` utility in `src/modules/email/content.ts` uses regex to find the first email address in any text. Integrated into:
  - **Single compose** (`GenerateForm`) — extracts recipient from prompt, passes to `ResponseDisplay` as editable field.
  - **Batch compose** (`BulkRow`) — auto-fills recipient when typing a prompt containing an email address (only if recipient is empty).
  - **Session view** (`SessionView`) — extracts recipient from the preceding user message and passes it to `MessageBubble`.
  - **Message bubble** (`MessageBubble`) — shows editable recipient field with "To:" label for assistant messages.
  - **Telegram flow** (`compose.ts`, `send.ts`) — extracts recipient from the prompt, stores as `extractedRecipient` in Telegram state, and auto-fills the recipient field during the send flow with a "(auto-detected from prompt)" note.
  - **Send dialog** (`SendEmailDialog`) — accepts optional `defaultRecipient` prop, pre-fills the "To" field.
- **Database** — `TelegramState` model gets new `extractedRecipient` field.
- **CSS** — New `.response-recipient`, `.message-recipient` styling with labels, inputs, borders.
- **BulkRow refactor** — Split into Edit Mode and Display Mode with dedicated UIs. Display mode shows recipient, subject, and collapsible prompt. Edit mode gets inline generated preview toggle with subject/body display. New `.bulk-card--edit`, `.bulk-card__display-*`, `.bulk-card__preview-*` CSS classes.
- Files changed: 12 files across components, hooks, services, models, and CSS.

### 2026-06-17 — Batch email generation (compose + send) feature

- **New `ComposePage` component** (`src/components/compose-page.tsx`) — wraps the main page with a Single/Batch toggle. Reads `?mode=batch` and `?sessionId` from URL search params. Replaces the direct `GenerateForm` mount in `src/app/(app)/page.tsx`.
- **New `type` field on `Session`** model (`src/models/session.ts`) — `"single" | "batch"` discriminator. Batch sessions get auto-named `"Batch N"` on creation and show a `Batch` badge in `SessionCard`.
- **New `BatchSessionView`** (`src/features/batch/components/batch-session-view.tsx`) — rendered by `SessionView` when `session.type === "batch"`. Displays entries as a list with toolbar (category bulk-update) and `BulkSendBar`. Includes an "Open Batch" button that navigates to `/?mode=batch&sessionId=...`.
- **New `BatchComposeView`** (`src/features/batch/components/batch-compose-view.tsx`) — full compose UI with model selector, Add Rows (1–50), Mail Type selector with Apply to All, row count stats, and the `BulkTable`.
- **New `BulkTable`** (`src/features/batch/components/bulk-table.tsx`) — renders list of `BulkRow` cards with empty state and `BulkSendBar`.
- **New `BulkRow`** (`src/features/batch/components/bulk-row.tsx`) — per-entry card with editable category/prompt/recipient (when pending/failed), Generate, Preview, Regenerate, and Delete buttons. Shows status badges (spinner, Ready, Sent, Failed with error tooltip).
- **New `BulkSendBar`** (`src/features/batch/components/bulk-send-bar.tsx`) — bottom bar with total/ready/sent/failed counts and a Send All button. Iterates through generated entries with 12-second gaps between sends (5/min rate limit compliance). Shows progress bar with abort capability.
- **New `BulkPreviewDialog`** (`src/features/batch/components/bulk-preview-dialog.tsx`) — modal preview showing recipient, editable subject/body, and individual Send button. Shows success state after sending.
- **New `use-bulk` hooks** (`src/features/batch/hooks/use-bulk.ts`) — `useBulkEntries` (auto-polls every 2s while entries are generating/sending), `useCreateBatchSession`, `useCreateEntries`, `useUpdateEntry`, `useDeleteEntry`, `useGenerateEntry`, `useBatchUpdateCategory`, `useSendEntry`. All mutations invalidate the `["bulk-entries"]` query key on success.
- **New `bulk.ts` API client** (`src/features/batch/api/bulk.ts`) — typed fetch wrappers for all 8 bulk endpoints.
- **New `BulkEntry` Mongoose model** (`src/models/bulk-entry.ts`) — `IBulkEntry` schema with fields: `sessionId`, `userId`, `category`, `prompt`, `recipient`, `status` (pending/generating/generated/failed/sending/sent), `generatedContent`, `subject`, `modelUsed`, `errorMessage`, `sortOrder`. Indexed on `{ sessionId, sortOrder }` and `{ userId, status }`.
- **New API routes under `src/app/api/bulk/`**:
  - `POST /api/bulk/session` — creates a batch-typed session with auto-title.
  - `POST /api/bulk/entries` — creates one or more entries with auto-incrementing `sortOrder`.
  - `GET /api/bulk/entries?sessionId=` — lists all entries for a session sorted by sortOrder.
  - `PATCH /api/bulk/entries/:id` — updates category/prompt/recipient (only when pending/failed).
  - `DELETE /api/bulk/entries/:id` — removes an entry (hard delete).
  - `PATCH /api/bulk/entries/batch` — batch-updates category for all pending/failed entries in a session.
  - `POST /api/bulk/generate` — triggers AI generation per entry via `getAIProvider()` + profile context. Rate-limited.
  - `POST /api/bulk/send` — sends a generated entry via `dispatchSendEmail()` (Gmail SMTP, same credential path).
- **New `modules/bulk/` backend** (`src/modules/bulk/`) — `service.ts` (all CRUD + generate + send logic), `validation.ts` (Zod schemas for all endpoints), `types.ts` (BulkEntryData DTO).
- **Session sidebar integration** — `SessionCard` displays a `Batch` badge for batch sessions and hides message count. `SessionView` delegates to `BatchSessionView` when `session.type === "batch"`.
- **New UI classes in `globals.css`** — `.batch-compose`, `.batch-toolbar`, `.bulk-card` (with field grid, header, actions, status badges), `.bulk-send-bar` (with progress bar, stats), `.compose-page__toggle`, `.session-card__batch-badge`, `.bulk-table__empty`, `.bulk-list`.

### 2026-06-06b — Send via Email on session messages + visual styling

- **New `MessageBubble` component** (`src/features/sessions/components/message-bubble.tsx`) — extracted from `session-view.tsx` so the "Send via Email" action is available on every assistant message in `/sessions/:id` (not just the freshly generated one on `/`). User messages render without the action.
- **New `parseEmailContent()` helper** (`src/modules/email/content.ts`) — splits a generated email's content into `{ subject, body }` by detecting a leading `Subject: ...` line (case-insensitive, trimmed) and stripping a single trailing blank line. Falls back to the first non-empty line as the subject and caps at 200 chars. Reused by both `ResponseDisplay` and `MessageBubble` (DRY).
- **New unit tests** — `src/modules/email/content.test.ts` (9 cases) covers subject detection, case-insensitivity, blank-line stripping, length cap, empty input, and the strip-only-first-occurrence rule.
- **Neubrutalist styles** added to `globals.css` for the email-sending surfaces:
  - `.send-btn` (blue, hard shadow, hover lift) + `.send-btn--inline` (compact variant for inside message bubbles) + `.send-btn-hint` (underlined Settings link).
  - `.response-actions` / `.message__actions` (flex wrap containers).
  - `.dialog__header` (flex row with bottom border) + `.dialog__close` (36×36 pink-on-hover close button) + `.dialog__body` (form-area spacing).
  - `.settings-badge` / `--success` (green pill) / `--muted` (gray pill) + `.settings-section__title-row` (title + badge layout).
- **Dialog overlay class aligned** — `SendEmailDialog` now uses the project's existing `.dialog-backdrop` class instead of a separate `.dialog-overlay`.
- **No API / schema / audit changes** — pure presentation refactor on top of the prior round.

### 2026-06-06 — Per-user Gmail credentials + Send via Email

- **New `emailCredentials` subdoc on `Profile`** — stores `gmailAddress` and an AES-256-GCM encrypted `appPassword`. Both optional; absence means the user has not configured email sending.
- **AES-256-GCM at rest** — key derived from `AUTH_SECRET` via `scryptSync` in `src/lib/crypto.ts`. Storage format is `v1:iv:tag:ciphertext` (hex). No new env vars, no new npm packages.
- **Secret never returned by the API** — `sanitizeProfile()` is the single secret-stripping site: GET `/api/profile` returns only `emailCredentials: { gmailAddress, emailConfigured }`.
- **New `POST /api/send-email` route** — decrypts at the boundary, hands plaintext to `src/modules/email/sender.ts`, which builds a fresh Nodemailer transporter per send (explicit `smtp.gmail.com:465`, 10s connect / 15s socket timeouts, `logger: false, debug: false`). Rate-limited at 5 req/min per user. Decryption failures → `CREDENTIALS_DECRYPTION_FAILED` 500; auth failures → `CREDENTIALS_INVALID` 400.
- **New audit actions** — `email.sent`, `email.send_failed`, `email.credentials_saved`, `email.credentials_removed` (never log the password).
- **New `EmailCredentialsSection` (5th Settings section)** — masked password input, "Connected" green badge, "Remove" button with `window.confirm`, help link to Google App Passwords page, hint about 2-Step Verification.
- **New `Send via Email` button on `ResponseDisplay`** — disabled with tooltip + Settings link when credentials aren't configured; opens a `SendEmailDialog` modal otherwise.
- **Tests** — `src/lib/crypto.test.ts` (14 cases: round-trip, tamper, malformed, version mismatch) and `src/modules/email/sender.test.ts` (6 cases: transporter config, timeouts, no logger/debug, close on success and failure, `from` header shapes).
- **Vitest shim** — `vitest-shims/server-only.ts` and `vitest-shims/setup.ts` mock the undeclared `server-only` module and provide test env vars.
- **Local type declaration** — `src/types/nodemailer.d.ts` (no `@types/nodemailer` install needed).
- **Operator note** — rotating `AUTH_SECRET` invalidates all stored app passwords. Documented in the Settings hint.

### 2026-06-05 — Auth Simplification & Cleanup

- **Removed `@auth/mongodb-adapter`** — NextAuth no longer uses the MongoDB adapter. Authentication is handled purely via JWT strategy with credentials verified directly through Mongoose `User` model.
- **Removed direct `mongodb` dependency** — The `mongodb` package is no longer a direct dependency; Mongoose 9.x bundles its own internal driver.
- **Removed `src/lib/mongo-client.ts`** — The `MongoClient` singleton used solely by the adapter was deleted.
- **Fixed button variant** — `Edit Prompt & Generate` button in `session-view.tsx` changed from `"outline"` to `"secondary"` (matching the design system).
