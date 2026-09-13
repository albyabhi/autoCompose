# CHANGELOG.md — History (moved out of state docs)

> The state docs (`AGENTS.md`, `ARCHITECTURE.md`, `PROJECT_CONTEXT.md`,
> `DEVELOPMENT.md`, `API.md`, `DATABASE.md`, `CONVENTIONS.md`,
> `DECISIONS.md`, `FEATURES.md`, `AUTH.md`, `ERROR_HANDLING.md`) describe
> the current state only. All dated changes, commit notes, and action
> history live here.

## 2026-09-08 — Batch settings auto-hide fix

- Fixed Batch Settings + CSV format auto-collapsing when opened: sentinel
  observer in `batch-compose-view.tsx` now collapses only on real
  scroll-down into rows (ignores in-panel growth), expanded panel uses
  `max-height: none` so format/preview never clips, CSV format `<details>`
  is controlled and independent of the panel toggle.

## 2026-09-08 — Batch CSV import

- New `Import from CSV` in `BatchSettingsPanel`: `recipient,prompt,category`
  (category optional → toolbar Mail Type fallback) with format sample +
  template download, 50 rows / 1 MB cap, skip-invalid/import-valid preview.
- New `src/features/batch/utils/csv-parser.ts` (+ tests) and
  `src/features/batch/components/batch-csv-import.tsx`; wiring in
  `batch-compose-view.tsx` via existing `POST /api/bulk/entries`.
  No backend/API change; CSV rows behave like manual rows.

## 2026-08-31 — Prompt update email contact (`4532a6c`)

- One-line prompt tweak in `src/modules/ai/provider.ts` (recipient/contact
  handling in generation prompt).

## 2026-08-28 — Clean code v7 (`57e0e99`)

- Removed `TODO.md`, `implementation_plan.md`, `project-srs.tex`,
  `proxy.ts`; deleted `src/components/ui/index.ts`,
  `src/features/batch/types.ts`, `src/features/sessions/types.ts`,
  `src/hooks/use-current-user.ts`.
- Cleanup pass across API routes, components, hooks, stores, lib
  (auth/ownership/session, crypto, db, errors, key-rotation), models,
  AI/bulk modules.

## 2026-08-22 — Code clean up (`c0c14e6`)

- Dependency/metadata refresh (`package.json`, `package-lock.json`) and
  `Documentation.md` version touch-up.

## 2026-08-04 — Include mail (`7c47640`)

- Profile context builder now includes email/contact evidence in AI
  prompts (`context-builder.ts`, category policy tweak in
  `categories.ts`, provider tweak); expanded `context-builder.test.ts`;
  minor `profile-form.tsx` fix.

## 2026-07-23 — Font size issue (`498d0fa`)

- Global font-size normalization in `src/app/globals.css` (237+/236−).

## 2026-07-12 — Fastest model selection (`7a264b7`)

- New model-recommendation subsystem: `benchmark.ts`, `select.ts`
  (latency-first selection with success-rate gate), `state.ts`,
  `types.ts` under `src/modules/ai/model-recommendation/`.
- New `src/lib/model-benchmark-worker.ts` (10-min refresh, env-tunable)
  started from `src/instrumentation.ts`; `src/lib/timeout.ts` helper;
  fastest-model affordance in `GenerateForm`/`ModelSelector`.

## 2026-07-07 — Small UI issue (`aed8649`)

- Dialog fixes in `bulk-preview-dialog.tsx` and
  `add-to-schedule-dialog.tsx` + 2 lines in `globals.css`.

---

> Entries dated 2026-07-02 and earlier are moved verbatim from `Documentation.md`.

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
