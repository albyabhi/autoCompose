<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Quick Reference

### Commands

```bash
npm run dev       # Development server on http://localhost:3000
npm run build     # Production build
npm run lint      # ESLint (flat config with next/core-web-vitals + typescript)
npm run test      # Vitest run (single pass)
```

No `typecheck` script — run `npx tsc --noEmit` for type checking.

### Testing

- **Framework:** Vitest (not Jest)
- **Environment:** Node (configured in `vitest.config.ts`)
- **Test files:** `*.test.ts` co-located with source or in `__tests__/` dirs
- **Shims:** `vitest-shims/server-only.ts` stubs Next.js `server-only` import for tests; `vitest-shims/setup.ts` provides env defaults
- **Mocking:** Use `vi.hoisted()` + `vi.mock()` for module mocking (see `src/modules/email/sender.test.ts`)
- **Running a single test:** `npx vitest run src/path/to/file.test.ts`

### Path Aliases

`@/` maps to `src/` (configured in both `tsconfig.json` and `vitest.config.ts`).

### Code Documentation Convention

Every source file must have a standardized comment block at the **bottom of the file**:

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

Required sections: `FILE`, `PURPOSE`, `HOW IT WORKS`, `INTEGRATION`.
Optional: `PROPS` (components only), `SECURITY` (sensitive files like crypto, auth).

### UI Design System

All UI must follow **Neubrutalist design** — see `skills/ui-skill.md` for full spec.

Quick rules:
- Borders: `3px solid #000` (no subtle/transparent borders)
- Shadows: `6px 6px 0 #000` (hard edge, no blur)
- Radius: `8px` max (avoid pill shapes)
- Colors: Primary `#ffd700` (Yellow), Error `#ff4d6d` (Pink), Success `#06d6a0` (Green)
- Interactive states: hover shifts `-2px, -2px`, active shifts `4px, 4px` with shadow collapse
- Focus: `4px solid yellow` outline

### Auth & Ownership

- **Multi-tenant isolation:** Every document has `userId`. All queries MUST use `ownedFilter(userId)` from `src/lib/auth/ownership.ts`.
- **Auth pattern:** API routes use `requireAuth()` → returns `CurrentUser` with `userId`.
- **Key files:** `src/lib/auth/session.ts` (getServerSession, requireAuth), `src/lib/auth/ownership.ts` (ownedFilter).

### Architecture

- **Framework:** Next.js 16 App Router with TypeScript
- **Database:** MongoDB via Mongoose 9
- **AI:** NVIDIA NIM API (OpenAI SDK) with strategy pattern (`src/modules/ai/`)
- **State:** Zustand (layout), TanStack React Query (server data)
- **Auth:** NextAuth.js v5 (JWT + Credentials)
- **Route group:** `(app)` applies AuthGuard + AppShell to all authenticated pages

### Important Files

- `src/config/index.ts` — Zod-validated env config singleton
- `src/modules/email/service.ts` — Email generation + persistence
- `src/modules/bulk/service.ts` — Batch email operations
- `src/lib/crypto.ts` — Envelope encryption v2 with per-user DEKs (server-only)
- `src/lib/key-rotation.ts` — KEK rotation utilities for annual key rotation
- `src/lib/errors.ts` — AppError hierarchy
- `src/utils/api-response.ts` — success() / created() / failure() helpers

### Encryption & Credential Storage

- **Envelope encryption v2:** Each user's app password is encrypted with a unique Data Encryption Key (DEK). The DEK is encrypted with a Key Encryption Key (KEK) derived from `AUTH_SECRET + userId`. This isolates blast radius — compromising `AUTH_SECRET` alone does not expose any user's plaintext credentials.
- **Version detection:** `detectVersion()` inspects stored payload and routes to `decryptV1()` (legacy) or `decryptV2()` (envelope). Lazy migration converts v1 → v2 on next successful email send.
- **Key rotation:** `rotateKEK(oldSecret, newSecret)` re-encrypts all DEKs. Run annually. `getKeyStatus()` reports v1/v2 counts.
- **Migration script:** `npx tsx src/scripts/migrate-credentials-v2.ts [--dry-run]` for batch v1 → v2 conversion of inactive users.
- **Key files:** `src/lib/crypto.ts` (encrypt/decrypt v1+v2), `src/lib/key-rotation.ts` (KEK rotation), `src/scripts/migrate-credentials-v2.ts` (batch migration).
