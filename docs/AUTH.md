# AUTH.md — Current State

## Mechanism

NextAuth.js v5, JWT strategy, single Credentials provider (`src/auth.ts`):
email + password → `User.findOne({ email })` → `bcrypt.compare` →
JWT (`id`, `role`, `provider`) → session (`user.id`, `user.role`).
Pages: sign-in `/login`, error `/auth/error`. No MongoDB adapter; no raw
`mongodb` driver dependency. Registration hashes with bcrypt and enforces
password complexity + confirm match.

## Server Helpers (`src/lib/auth/`)

| Helper | Purpose |
|---|---|
| `session.ts` | `getServerSession()` (cached), `requireAuth()` → `CurrentUser` or 401 |
| `ownership.ts` | `ownedFilter(userId)`, `requireOwnership()`, `assertOwnership()` — mandatory on every user-data query |
| `current-user.ts` | `getCurrentUser()` — session enriched with `onboardingCompleted`, `profileCompleted`; served by `GET /api/auth/me` |
| `guards.ts` | `withAuth` / `withOptionalAuth` route wrappers |
| `types.ts` | `CurrentUser` interface |

Client: `useSession()` (+ `SessionProvider` wrapper, `AuthGuard` gate) and
profile-status via `/api/auth/me`.

## Enforcement Chain

```
Route → requireAuth() → service(userId) → ownedFilter(userId) → MongoDB
```

Registration additionally: per-IP (5/min) + global (20/min) limits via
`checkRegistrationRateLimit(ip)` and hidden `company` honeypot
(`validateHoneypot`) — bot fills are silently dropped. Same rules in the
`register()` server action used by `RegisterForm`.

## Credential Storage (Gmail App Passwords)

Envelope encryption v2 (`src/lib/crypto.ts`, server-only, AES-256-GCM):

- `encryptV2(plain, userId)`: random 32-byte DEK encrypts the password;
  KEK (`scrypt(AUTH_SECRET, userId + "kek-salt-v1")`) encrypts the DEK.
  Stored: `{ encryptedDek, encryptedData, dekVersion }` on
  `Profile.emailCredentials` alongside `gmailAddress`.
- Legacy v1 (`v1:iv:tag:ct`, global key) decrypts read-only;
  `detectVersion()` routes; successful sends lazily migrate v1 → v2
  (audited `email.credentials_migrated_to_v2`).
- `rotateKEK(oldSecret, newSecret)` (`src/lib/key-rotation.ts`) re-wraps
  DEKs for annual rotation; `getKeyStatus()` reports v1/v2 counts; batch
  script `src/scripts/migrate-credentials-v2.ts`.

Invariants: written only by `updateProfile()`; decrypted only at the
send boundary (`dispatchSendEmail` path); `sanitizeProfile()` is the only
place secrets are stripped from API output; audits never log plaintext;
`from` is always the user's own Gmail; rotating `AUTH_SECRET` requires
users to re-enter passwords.

## Telegram Linking

`POST /api/telegram/login-code` (generate) → user enters code in bot →
`telegram.linked`; `DELETE /login-code` revokes;
`DELETE /telegram/link` unlinks; `GET /telegram/status` reports state.
Audited: `linked`, `unlinked`, `login_code_generated`,
`login_code_attempt`.

## Cron / Webhook Secrets

- `/api/cron/process-schedules`: `CRON_SECRET` (`Authorization: Bearer`
  for GET; `Bearer` or `x-cron-secret` for POST) → else
  `CRON_UNAUTHORIZED` 401. No user session.
- `/api/telegram/webhook`: `TELEGRAM_WEBHOOK_SECRET`-verified, idempotent
  (`TelegramUpdate`), per-user rate-limited; rejections audited
  (`telegram.webhook_rejected`).
