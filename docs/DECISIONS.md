# DECISIONS.md — Current State (decisions and their present rationale)

1. **Next.js App Router + colocated API routes** — one deployable unit for
   pages, API, and cron/worker entry points; `(app)` group centralizes
   AuthGuard + AppShell.
2. **MongoDB + Mongoose with `userId` on everything** — flexible profile/
   resume/schedule shapes; tenancy enforced in code via `ownedFilter`
   rather than separate databases.
3. **NextAuth v5 JWT + Credentials, no adapter** — stateless sessions;
   passwords verified with bcrypt against the `User` model. No
   `@auth/mongodb-adapter` or raw `mongodb` dependency to maintain.
4. **NVIDIA NIM via OpenAI SDK + strategy pattern** — single `AIProvider`
   contract; 8-model registry derived from one tuple so validation, UI,
   and config stay in sync; per-model temperature defaults; ToT+DCE system
   prompt shared in `BaseAIProvider`.
5. **Background fastest-model benchmark** — in-memory recommendation
   refreshed every 10 min; selection prefers lowest avg latency, then
   success rate, p95, recency, with a minimum success-rate gate.
6. **Envelope encryption v2 for Gmail App Passwords** — per-user DEK
   wrapped by a KEK (`AUTH_SECRET + userId`); limits blast radius vs a
   single global key. v1 retained read-only with lazy migration on send
   plus a batch migration script and annual KEK rotation.
7. **Fresh Nodemailer transporter per send** — `smtp.gmail.com:465`,
   10s connect / 15s socket timeouts, no logger/debug, `from` = the
   user's own Gmail; plaintext lives only for the request. Same dispatch
   path for single, bulk, schedule, and Telegram sends.
8. **In-memory sliding-window rate limits** — 5/min/user on send/generate
   paths, 5/min/IP + 20/min global on registration, plus honeypot
   `company` field. Accepted trade-off: resets on restart, no Redis.
9. **Schedule delivery state machine + atomic claims** — `Schedule`
   (`active/sent/expired/cancelled`) with `ScheduledEmail`
   (`awaiting_content/ready/sending/sent/failed`); cron claims a bounded
   batch, generates batch content at send time, decrypts per item. Sparse
   unique indexes prevent double-scheduling the same source.
10. **Dual delivery triggers (worker + cron)** — in-process worker for
    local/self-hosted; Vercel Cron for production (worker auto-disabled
    on Vercel). Manual `POST /:id/process` for tests/immediate runs.
11. **Uniform API envelope + AppError hierarchy** — every route returns
    the same shape; machine-readable codes drive client handling.
12. **Zustand for ephemeral UI, React Query for server data** — draft
    auto-save/persistence in the store; caching, polling, optimistic
    updates, infinite scroll in Query.
13. **Contacts as profile sub-array + autocomplete everywhere** — ≤500
    validated contacts replace raw email inputs across compose, session,
    batch, and send dialog.
14. **MongoDB-backed attachments with strict allowlist** — 10 MB/file,
    24 MB total, ≤20 files, 8 MIME types; buffers forwarded to Nodemailer.
