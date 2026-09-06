# CONVENTIONS.md — Current State

## File Footer Convention (required)

Every source file ends with:

```typescript
// ============================================================
// FILE: src/path/to/file.ts
// ============================================================
// PURPOSE: [1 sentence]
// HOW IT WORKS: [2-3 sentences]
// PROPS: [components only — key props + types]
// [SECURITY: sensitive files]
// INTEGRATION: [dependencies, services, consumers]
// ============================================================
```

Required: `FILE`, `PURPOSE`, `HOW IT WORKS`, `INTEGRATION`.
`PROPS` for components; `SECURITY` for crypto/auth/credential paths.

## API Conventions

- Route shape: `requireAuth()` → `validate(zodSchema)` →
  `checkRateLimit(...)` where applicable → service with
  `ownedFilter(userId)` → `success()/created()` or `failure()`.
- Envelope: `{ success: true, data }` / `{ success: false, error: { code,
  message, details? } }`. Never leak secrets in `data` or logs.
- Throw `AppError` subclasses from services; routes translate via
  `failure()` (see `ERROR_HANDLING.md`).

## Data Conventions

- `userId: string` on every user-owned document; `ownedFilter`,
  `requireOwnership`, `assertOwnership` are the onlytenancy mechanism.
- Soft delete for sessions (`isDeleted` + `deletedAt`); hard delete for
  bulk entries and cancelled schedules (+ their items).
- Secrets: `encryptedAppPassword` written only by `updateProfile()`,
  decrypted only at the send boundary; `sanitizeProfile()` is the single
  stripping site; `rawText` never leaves the resume GET.

## Frontend Conventions

- Server data: TanStack Query (`useQuery`/`useMutation`/
  `useInfiniteQuery`); cache keys `["profile"]`, `["bulk-entries"]`,
  sessions keys; invalidate on mutation; optimistic rename with rollback;
  2s polling while bulk entries are `generating`/`sending`.
- Layout/global UI: Zustand `layoutStore` (sidebar, active view, compose
  draft auto-save with restore banner + discard, cleared on success).
- Protected pages live under `src/app/(app)/` (AuthGuard + AppShell).
  `Cmd/Ctrl+K` → compose. `UserButton` lives in the sidebar footer.
- Recipient inputs use `ContactAutocomplete` (contacts filtered by
  name/email substring, ≤5 shown, full keyboard support).
- Email bodies go through `parseEmailContent()` (strip leading
  `Subject:` line); prompts go through `extractEmailFromText()` for
  recipient auto-fill.

## UI / CSS Conventions

Neubrutalist (`skills/ui-skill.md`, tokens below). Interactive elements
implement default/hover/active/focus/disabled. Shared dialog classes
(`.dialog-backdrop`, `.dialog__header/body/title/actions/close`),
`settings-badge`, `.send-btn`, schedule/bulk/resume class families in
`globals.css`. Primitives in `src/components/ui/`: Button
(primary/secondary/danger/ghost + loading), Input/Select (label + error),
Card (+Header/Body/Footer), Skeleton, EmptyState, ContactAutocomplete,
AttachmentUpload.

| Token | Value |
|---|---|
| Border | `3px solid #000` |
| Shadow | `6px 6px 0 #000` |
| Radius | `8px` max |
| Primary / Error / Success | `#ffd700` / `#ff4d6d` / `#06d6a0` |
| Surface / Background | `#f8f9fa` / `#e8e6e1` |
