# PROJECT_CONTEXT.md — Current State

## What This Project Is

AutoCompose is an AI-powered professional email composition and delivery
tool. Users describe what they need; the app generates a polished email
with AI, then lets them send it immediately, in batches, or on a schedule
— from the web UI or entirely through Telegram.

## Core Capabilities (present today)

- Single email generation across 7 categories with per-generation tone and
  model override.
- Batch generation: multi-row compose, per-row generate/preview/regenerate/
  send, Send All with rate-limit spacing, shared + per-row attachments.
- Delivery through the user's own Gmail (App Password, encrypted at rest),
  with attachments, from compose, session history, batch, schedule, and
  Telegram.
- Scheduling with timezone support, cron + background-worker processing,
  retry of failed items, dedup protection.
- Session history with messages, search, archive, soft delete, clear-all,
  and batch-type sessions.
- Profile with personal/professional/writing-preference/job-application/
  AI-settings/email-credentials/contacts sections; resume upload + AI parse
  + full editor; recipient autocomplete from contacts.
- Telegram bot: link via login code, compose → generate → send flows with
  inline keyboards, recipient auto-detect.
- Fastest-model recommendation refreshed by a background benchmark worker.

## Tech Stack (present today)

Next.js 16 App Router, React 19, TypeScript 5, Mongoose 9 + MongoDB,
NextAuth v5 JWT + Credentials, NVIDIA NIM (OpenAI SDK), grammY, Zustand,
TanStack React Query, Zod, Nodemailer, pdfjs-dist + mammoth, Vitest 3,
Neubrutalist CSS. See `ARCHITECTURE.md` for the module map.

## Users and Tenancy

Single-tenant-per-user SaaS shape: every document carries `userId`; all
access is ownership-scoped (`ownedFilter`). No organizations/teams, no
roles beyond the `role` field on the user token (default `"user"`).

## Non-Goals (as built today)

No team workspaces, no non-Gmail providers, no Redis/distributed rate
limiting (in-memory only), no per-minute Vercel Cron on Hobby (daily
limit — needs Pro/Enterprise or external cron for per-minute delivery).

## Entry Points

- Web: `/` (compose, `?mode=batch` + `?sessionId`), `/dashboard`,
  `/sessions`, `/sessions/:id`, `/schedules`, `/schedules/:id`,
  `/settings`, `/settings/resume/edit`, `/login`, `/register`.
- API: see `API.md`. Telegram: bot webhook + health/status/link routes.
