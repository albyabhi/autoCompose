# DEVELOPMENT.md — Current State

## Prerequisites

- Node.js 22+
- MongoDB Atlas cluster (or local MongoDB)
- NVIDIA NIM API key

## Install and Run

```bash
npm install
cp .env.local.example .env.local   # then fill in values
npm run dev       # http://localhost:3000
npm run build
npm start
npm run lint      # ESLint
npm run test      # Vitest single pass
npx tsc --noEmit  # typecheck (no script alias)
npx vitest run src/path/to/file.test.ts  # single test
```

## Environment Variables

| Variable | Required | Default | Description |
|---|---|---|---|
| `MONGODB_URI` | Yes | — | MongoDB connection string (`mongodb://` or `mongodb+srv://`) |
| `NVIDIA_API_KEY` | Yes | — | NVIDIA NIM API key |
| `NVIDIA_BASE_URL` | Yes | `https://integrate.api.nvidia.com/v1` | NVIDIA API base URL |
| `AUTH_SECRET` | Yes (32+ chars) | dev fallback (non-prod) | NextAuth secret; also KEK input for credential encryption |
| `AUTH_URL` | No | `http://localhost:3000` | Auth base URL |
| `CRON_SECRET` | No (16+ chars) | — | Protects `/api/cron/process-schedules` |
| `SCHEDULE_BACKGROUND_WORKER` | No | `true` | `false` disables in-process schedule worker |
| `SCHEDULE_WORKER_INTERVAL_MS` | No | `60000` | Schedule tick interval (min 5000) |
| `SCHEDULE_WORKER_MAX_SCHEDULES` | No | `5` | Max due schedules per tick |
| `SCHEDULE_WORKER_MAX_EMAILS_PER_SCHEDULE` | No | `10` | Max emails per schedule per tick |
| `SCHEDULE_WORKER_INITIAL_DELAY_MS` | No | `1000` | Delay before first schedule tick |
| `AI_MODEL_BENCHMARK_ENABLED` | No | enabled | `false` disables model benchmark worker |
| `AI_MODEL_BENCHMARK_INTERVAL_MS` | No | `600000` (10 min) | Benchmark tick interval (min 60000) |
| `AI_MODEL_BENCHMARK_INITIAL_DELAY_MS` | No | `5000` | Delay before first benchmark tick |
| `NODE_ENV` | No | `development` | `development` / `production` / `test` |
| `NEXT_PUBLIC_APP_URL` | No | `http://localhost:3000` | Public app URL |
| `TELEGRAM_BOT_TOKEN` | No | — | Bot token from BotFather |
| `TELEGRAM_BOT_USERNAME` | No | — | Bot username (without @) |
| `TELEGRAM_WEBHOOK_SECRET` | No | — | Webhook secret (16+ chars) |

Config is validated once via Zod in `src/config/index.ts` (`getConfig()`).
Production fails fast on invalid env; development warns and continues.

## Daily Workflows

- **Protected API route**: `requireAuth()` → `validate(schema)` →
  `ownedFilter(userId)` on every query → `success()/created()/failure()`.
- **Protected page**: place under `src/app/(app)/` (inherits AuthGuard +
  AppShell); client data via TanStack Query; user via session/`/api/auth/me`.
- **New Mongoose model**: include `userId: { type: String, required: true,
  index: true }`; query only through `ownedFilter(userId)`.
- **New email category**: extend the Zod enum in
  `src/modules/email/validation.ts` plus `EmailCategory` in
  `src/models/email-template.ts` and the session category enum.
- **New AI model**: add to `MODEL_IDS` + `MODEL_IDS_KEYS` in
  `src/modules/ai/types.ts` (derives `ModelId` + `modelIdSchema`), add
  `MODEL_LABELS` entry, optional `MODEL_DEFAULTS`, mirror into
  `nvidia.models` in `src/config/index.ts`.
- **Credential migration**: `npx tsx src/scripts/migrate-credentials-v2.ts
  [--dry-run] [--older-than-days=90]`.
- **Manual schedule trigger**: `POST /api/schedules/:id/process` (authed).
