# DATABASE.md — Current State

- **Engine:** MongoDB via Mongoose 9. Connection: cached singleton
  (`src/lib/db.ts`, pool 1–10, 5s selection / 45s socket timeouts).
- **Tenancy rule:** every user-owned document has `userId`; all queries use
  `ownedFilter(userId)` (`src/lib/auth/ownership.ts`). No cross-user reads.

## Collections

### User (`src/models/user.ts`)

Auth identity: `name`, `email` (unique), `passwordHash` (bcryptjs),
`role` (default `"user"`), `avatar?`. Verified directly in
`src/auth.ts` credentials provider; no MongoDB adapter.

### Profile (`src/models/profile.ts`)

One per user (`userId` unique). Sections:

| Section | Fields |
|---|---|
| `personal` | `fullName` (required), `phone?`, `location?` |
| `professional` | `type?` (`student`/`working_professional`), `designation?`, `department?`, `organization?`, `college?`, `degree?` |
| `preferences` | `formalityLevel` (`formal`/`semi-formal`/`casual`, default `semi-formal`), `preferredTone` (default `professional`), `defaultSignature?`, `preferredLanguage?` (default `English`), `preferredModel?` |
| `jobApplication` | `resumeUrl?`, `linkedIn?`, `github?`, `portfolio?` |
| `emailCredentials` | `gmailAddress?`, `encryptedAppPassword?` (v1 string or v2 payload), `encryptedDek?` (v2), `dekVersion?` (v2). Never returned raw — `sanitizeProfile()` exposes only `{ gmailAddress, emailConfigured }`. |
| `contacts` | `{ id, name, email }[]` (≤500, validated) |
| `resume` | `rawText?` (never in GET), `name?`, `email?`, `phone?`, `linkedin?`, `github?`, `portfolio?`, `parsedByModel?`, `skills[]`, `education[]` (`degree`, `institution?`, `year?`), `experience[]` (`company`, `role?`, `duration?`, `description?`), `projects[]` (`name`, `description?`, `url?`) |

### Session (`src/models/session.ts`)

`title`, `category` (7 enums), `type` (`single` default / `batch`),
`userId` (indexed), `metadata?`, `isArchived`, `isDeleted`, `deletedAt?`.
Indexes: `{ userId, isDeleted, createdAt: -1 }`, text index on `title`.

### Message (`src/models/message.ts`)

`sessionId` (ref), `role` (`user`/`assistant`), `content`, `modelUsed?`
(assistant), `metadata?`. Index `{ sessionId, createdAt }`.

### BulkEntry (`src/models/bulk-entry.ts`)

`sessionId` (ref batch session), `userId`, `category`, `prompt` (≤5000),
`recipient`, `status` (`pending/generating/generated/failed/sending/sent`),
`generatedContent?`, `subject?`, `modelUsed?`, `errorMessage?`,
`sortOrder`. Indexes `{ sessionId, sortOrder }`, `{ userId, status }`.

### Schedule (`src/models/schedule.ts`)

`userId`, `name` (≤120), `scheduledAt` (UTC Date, indexed), `timezone`,
`status` (`active/sent/expired/cancelled`). Index
`{ userId, status, scheduledAt }`.

### ScheduledEmail (`src/models/scheduled-email.ts`)

`scheduleId` (ref), `userId`, `sourceType` (`single`/`batch`),
`sourceSessionId?`, `sourceMessageId?` (sparse unique w/ scheduleId),
`sourceBulkEntryId?` (sparse unique w/ scheduleId), `to`, `subject?`
(≤200), `body?` (≤20000), `category?`, `prompt?` (≤5000), `modelId?`,
`deliveryState` (`awaiting_content/ready/sending/sent/failed`),
`claimedAt?`, `sentAt?`, `errorCode?`, `errorMessage?`, `sortOrder`.
Indexes `{ scheduleId, sortOrder }`, `{ userId, deliveryState }` + the two
sparse unique dedup indexes.

### EmailTemplate (`src/models/email-template.ts`)

`category`, `prompt`, `generatedEmail`, `modelUsed`, `userId`, `metadata?`.
Persisted single-generation record.

### Attachment (via `src/modules/attachments/service.ts`)

MongoDB-backed storage for uploaded files (Buffer). Enforced limits: 10 MB
per file, 24 MB total, ≤20 files; MIME allowlist PDF/JPEG/PNG/GIF/WebP/
DOCX/TXT/CSV.

### TelegramState / TelegramUpdate (`src/models/telegram-state.ts`, `telegram-update.ts`)

Bot conversation state per user/chat: flow step, draft prompt/category,
`extractedRecipient`, link codes, plus webhook update idempotency keys.

### AuditLog (`src/models/audit-log.ts`)

Immutable trail: `action` (32 values — email/auth/session/schedule/
telegram/system; enumerated in `ARCHITECTURE.md` cross-cutting and
`FEATURES.md`), `entityType?`, `entityId?`, `userId?`, `metadata`,
`ip?`, `userAgent?`, `createdAt` only. Indexes on `createdAt`, `action`,
`userId`.
