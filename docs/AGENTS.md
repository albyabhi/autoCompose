<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# AGENTS.md — Agent Quick Reference (current state)

> Detailed references: `ARCHITECTURE.md`, `PROJECT_CONTEXT.md`, `DEVELOPMENT.md`,
> `API.md`, `DATABASE.md`, `CONVENTIONS.md`, `DECISIONS.md`, `FEATURES.md`,
> `AUTH.md`, `ERROR_HANDLING.md`. History lives in `CHANGELOG.md`.

## Commands

```bash
npm run dev       # Development server on http://localhost:3000
npm run build     # Production build
npm start         # Production server
npm run lint      # ESLint (flat config with next/core-web-vitals + typescript)
npm run test      # Vitest run (single pass)
```

No `typecheck` script — run `npx tsc --noEmit` for type checking.
Run a single test: `npx vitest run src/path/to/file.test.ts`.

## Testing

- **Framework:** Vitest (not Jest), Node environment (`vitest.config.ts`).
- **Test files:** `*.test.ts` co-located with source.
- **Shims:** `vitest-shims/server-only.ts` stubs the `server-only` import;
  `vitest-shims/setup.ts` provides env defaults.
- **Mocking:** Use `vi.hoisted()` + `vi.mock()` (see `src/modules/email/sender.test.ts`).

## Path Aliases

`@/` maps to `src/` (in `tsconfig.json` and `vitest.config.ts`).

## Code Documentation Convention

Every source file must end with a standardized comment block (see `CONVENTIONS.md`):

```typescript
// ============================================================
// FILE: src/path/to/file.ts
// ============================================================
// PURPOSE: [1 sentence]
// HOW IT WORKS: [2-3 sentences]
// PROPS: [components only]
// [SECURITY: sensitive files]
// INTEGRATION: [key dependencies]
// ============================================================
```

Required: `FILE`, `PURPOSE`, `HOW IT WORKS`, `INTEGRATION`.
Optional: `PROPS` (components), `SECURITY` (crypto/auth/credentials).

## UI Design System

Neubrutalist design — full spec in `skills/ui-skill.md`:

- Borders: `3px solid #000`; shadows: `6px 6px 0 #000`; radius ≤ `8px`.
- Colors: primary `#ffd700`, error `#ff4d6d`, success `#06d6a0`.
- Hover shifts `-2px,-2px`; active shifts `4px,4px` with shadow collapse.
- Focus: `4px solid yellow` outline.

## Email Categories

7 categories in `src/modules/email/categories.ts`:
`job_application`, `leave_request`, `sick_leave`, `resignation`,
`complaint`, `meeting_request`, `custom`.
Each maps to profile sections injected into AI prompts.

## AI Models

8 NVIDIA NIM models, registry in `src/modules/ai/types.ts`
(`MODEL_IDS` / `MODEL_LABELS`), mirrored in `src/config/index.ts`:
`deepseek` (default), `nemotron`, `gptOss`, `mistralSmall`,
`llamaMaverick`, `minimaxM27`, `llamaNemotronNano`, `nemotron3Ultra`.
Background benchmark worker (`src/lib/model-benchmark-worker.ts`) tracks the
fastest model (`src/modules/ai/model-recommendation/`).

## Auth & Ownership

- Every document has `userId`. All queries MUST use
  `ownedFilter(userId)` from `src/lib/auth/ownership.ts`.
- API routes use `requireAuth()` → `CurrentUser` (`src/lib/auth/session.ts`).
- See `AUTH.md`.

## Architecture (summary)

Next.js 16 App Router + TypeScript. MongoDB via Mongoose 9. NVIDIA NIM via
OpenAI SDK with strategy pattern (`src/modules/ai/`). Zustand (layout) +
TanStack React Query (server data). NextAuth.js v5 JWT + Credentials.
`(app)` route group applies AuthGuard + AppShell. grammY Telegram bot
(`src/modules/telegram/`). Cron/in-process-worker schedule delivery
(`src/modules/schedule/` + `src/lib/schedule-worker.ts`). Resume parsing
via pdfjs-dist + mammoth (`src/modules/resume/`). Attachments
(`src/modules/attachments/` + `src/utils/attachments.ts`).

## Important Files

- `src/config/index.ts` — Zod-validated env config singleton
- `src/modules/email/service.ts` — generation + persistence
- `src/modules/email/categories.ts` — 7 categories + prompt policies
- `src/modules/email/sender.ts` — Nodemailer transport (fresh per send)
- `src/modules/bulk/service.ts` — batch operations
- `src/modules/schedule/service.ts` — schedule CRUD + cron processing
- `src/modules/resume/service.ts` — resume parse + AI extraction
- `src/modules/attachments/service.ts` — attachment storage
- `src/modules/telegram/bot.ts` — grammY bot init
- `src/modules/telegram/ai-bridge.ts` — Telegram → email bridge
- `src/modules/ai/model-recommendation/` — fastest-model benchmark
- `src/lib/crypto.ts` — envelope encryption v2 (server-only)
- `src/lib/key-rotation.ts` — KEK rotation
- `src/lib/errors.ts` — AppError hierarchy
- `src/lib/rate-limit.ts` — sliding-window limiter + honeypot
- `src/lib/schedule-worker.ts`, `src/lib/model-benchmark-worker.ts` — workers
- `src/instrumentation.ts` — startup hook starting both workers
- `src/utils/api-response.ts` — `success()` / `created()` / `failure()`

## Encryption & Credentials (summary)

- Envelope encryption v2: per-user DEK encrypted by a KEK derived from
  `AUTH_SECRET + userId`. See `AUTH.md` and `src/lib/crypto.ts`.
- `detectVersion()` routes v1 (legacy) vs v2; lazy v1 → v2 migration on send.
- `rotateKEK(oldSecret, newSecret)` re-encrypts DEKs (annual rotation).
- Migration script: `npx tsx src/scripts/migrate-credentials-v2.ts
  [--dry-run] [--older-than-days=90]`.
