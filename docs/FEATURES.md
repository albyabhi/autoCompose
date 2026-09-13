# FEATURES.md — Current State

## Compose (single)

`/` single mode (`GenerateForm`): prompt textarea (autofocus, 80%/95%
color-coded counter), 7-category selector with policy guidance, model
selector (defaults to profile `preferredModel`), tone toggle
(Formal/Neutral/Casual overriding `formalityLevel`), draft auto-save with
restore banner + Discard (cleared on success), recipient auto-extract from
prompt, response card with Send-via-Email and Schedule actions.

## Batch

`?mode=batch` (`BatchComposeView` + `BatchSettingsPanel`): mail-type
selector, Apply-to-All, 1–50 row stepper, CSV import
(`recipient,prompt,category` with format sample + template download,
50 rows/import, skip-invalid/import-valid, toolbar Mail Type fallback),
shared attachments, help dialog.
Per-row (`BulkRow`): edit/display modes, category/prompt/recipient editing
(pending/failed), Generate/Preview/Regenerate/Delete/Schedule, status
badges, inline preview with parsed subject/body, per-row attachments.
`BulkPreviewDialog` (editable subject/body + attachment count + Send),
`BulkSendBar` (counts, Send All with ~12s spacing, progress + abort,
Schedule All). Batch sessions (`type: "batch"`, `"Batch N"` titles, badge)
open in `BatchSessionView`. Auto-poll every 2s while active.

## Sessions

Create (`NewSessionDialog`), infinite-scroll list with search, inline
rename (optimistic + rollback), archive toggle, soft delete, Clear All
(Settings, audited), detail view with paginated messages (20/page desc,
Load-earlier), collapsible long prompts, active-card highlight,
per-assistant-message Send-via-Email + Schedule, `?sessionId` reopen,
`Cmd/Ctrl+K` shortcut.

## Scheduling

`/schedules` list + create (name/date/time/timezone), `/:id` detail (item
cards, cancel, retry, remove), `AddToScheduleDialog` shared by single
compose, session messages, and batch (existing-or-new picker, progress,
skip-count). Lifecycle `ACTIVE → SENT`, or `EXPIRED`/`CANCELLED`.
Processing: cron endpoint + in-process worker + manual trigger; batch
items generate content at send time; per-item retry resets
`failed → ready`.

## Profile / Contacts / Resume

Settings sections: Personal, Professional (student vs working-professional
fields), Writing Preferences, Job Application (resume URL, LinkedIn,
GitHub, portfolio), AI Settings (`preferredModel`), Email Credentials
(Gmail + 16-char App Password, Connected badge, masked input, remove with
confirm, 2SV help), Contacts tab (add/inline-edit/delete, ≤500), Resume
(upload PDF/DOCX/TXT with per-upload model override, AI-extracted
skills/education/experience/projects + links, full editor at
`/settings/resume/edit` with dirty-state guard).

## Email Sending

Gmail App Password delivery from compose, session messages, batch rows,
scheduled items, and Telegram. `SendEmailDialog` (recipient auto-fill,
subject/body from `parseEmailContent`, attachments). Disabled + Settings
hint when unconfigured. Audited (`email.sent` / `email.send_failed`).

## Telegram Bot

Link via Settings login code (generate/revoke), unlink, status.
Commands, callbacks, compose + send flows with inline keyboards, recipient
auto-detect (`extractedRecipient`), AI generation + SMTP send through the
same backend, webhook (secret + idempotency) + health endpoints, per-user
rate limiting.

## AI Models

9 models (labels in `AGENTS.md` / `ARCHITECTURE.md`); per-generation
override; profile default; resume-parse default with override and
`parsedByModel` audit; background fastest-model recommendation.

## Cross-cutting

Audit trail (32 actions), registration rate limiting + honeypot, schedule
worker + benchmark worker via `instrumentation.ts`, attachment upload
endpoint + UI, contacts autocomplete, tone/draft/keyboard/email-extract
compose refinements.
