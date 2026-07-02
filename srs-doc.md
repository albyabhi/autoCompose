# Software Requirements Specification (SRS)

## AutoCompose — AI-Powered Professional Email Composition System

| Field | Value |
|---|---|
| **Document Version** | 1.0 |
| **Date** | 2026-07-02 |
| **Status** | Approved |
| **Project** | AutoCompose |
| **Repository** | github.com/AutoCompose |

---

## Table of Contents

1. [Introduction](#1-introduction)
2. [Overall Description](#2-overall-description)
3. [System Features and Functional Requirements](#3-system-features-and-functional-requirements)
4. [External Interface Requirements](#4-external-interface-requirements)
5. [Non-Functional Requirements](#5-non-functional-requirements)
6. [Data Requirements](#6-data-requirements)
7. [System Architecture](#7-system-architecture)
8. [Security Requirements](#8-security-requirements)
9. [Appendices](#9-appendices)

---

## 1. Introduction

### 1.1 Purpose

This document defines the complete software requirements for **AutoCompose**, an AI-powered professional email composition system. It serves as the authoritative reference for system behavior, architecture, interfaces, constraints, and quality attributes. The intended audience includes developers, testers, stakeholders, and future maintainers.

### 1.2 Scope

AutoCompose is a multi-tenant web application that enables users to compose, generate, schedule, and send professional emails using AI models via the NVIDIA NIM API. The system supports:

- Single and batch email generation across 7 email categories
- 8 selectable AI models with profile-aware prompt engineering
- Direct email delivery via user-authenticated Gmail SMTP
- Scheduled email delivery with timezone support and automated cron processing
- Resume parsing and profile-driven personalization
- Telegram bot integration for mobile email composition
- Multi-tenant data isolation with per-user credential encryption

### 1.3 Definitions, Acronyms, and Abbreviations

| Term | Definition |
|---|---|
| SRS | Software Requirements Specification |
| AI | Artificial Intelligence |
| NIM | NVIDIA Inference Microservice |
| SMTP | Simple Mail Transfer Protocol |
| JWT | JSON Web Token |
| AES-256-GCM | Advanced Encryption Standard (256-bit) in Galois/Counter Mode |
| DEK | Data Encryption Key |
| KEK | Key Encryption Key |
| GDPR | General Data Protection Regulation |
| RBAC | Role-Based Access Control |

### 1.4 References

| Document | Location |
|---|---|
| Documentation.md | `./Documentation.md` |
| AGENTS.md | `./AGENTS.md` |
| UI Design System | `./skills/ui-skill.md` |
| NVIDIA NIM API Docs | https://docs.nvidia.com/nim/ |
| Next.js 16 Docs | https://nextjs.org/docs |
| grammY Bot Framework | https://grammy.dev/ |

### 1.5 Overview

The remainder of this document is organized into: overall description, functional requirements, interface requirements, non-functional requirements, data requirements, system architecture, and security requirements.

---

## 2. Overall Description

### 2.1 Product Perspective

AutoCompose is a self-contained web application built on the Next.js 16 App Router framework. It operates as a multi-tenant SaaS system where each user's data is strictly isolated via ownership filters applied at the database query level.

```
┌──────────────────────────────────────────────────────────────┐
│                      Client Layer                             │
│  Browser (React 19)  ←→  Telegram Bot (grammY)              │
└──────────────────────────┬───────────────────────────────────┘
                           │ HTTPS / Webhook
┌──────────────────────────▼───────────────────────────────────┐
│                    Application Layer                           │
│  Next.js 16 App Router (API Routes + Server Components)       │
│  ┌─────────┐ ┌──────────┐ ┌──────────┐ ┌──────────────────┐ │
│  │ Auth    │ │ Email    │ │ Schedule │ │ Telegram         │ │
│  │ Guard   │ │ Service  │ │ Worker   │ │ Bot Handler      │ │
│  └─────────┘ └──────────┘ └──────────┘ └──────────────────┘ │
└──────────────────────────┬───────────────────────────────────┘
                           │
┌──────────────────────────▼───────────────────────────────────┐
│                     Data Layer                                 │
│  MongoDB (Mongoose 9)  ←→  NVIDIA NIM API (OpenAI SDK)       │
│  Gmail SMTP (Nodemailer)                                      │
└──────────────────────────────────────────────────────────────┘
```

### 2.2 Product Functions

| Function | Description |
|---|---|
| AI Email Generation | Generate professional emails from user prompts using profile context and category-specific AI instructions |
| Batch Email Generation | Create, generate, preview, and send multiple email drafts simultaneously |
| Email Delivery | Send generated emails through the user's Gmail account via SMTP |
| Email Scheduling | Defer email delivery to a future date/time with timezone support |
| Resume Parsing | Extract structured data from uploaded resumes using AI |
| Session Management | Track email generation sessions with conversation history |
| Profile Management | Store personal, professional, and writing preference data for AI context |
| Telegram Bot | Generate and send emails via Telegram with inline keyboard workflows |
| User Authentication | Secure account-based access with JWT and bcrypt password hashing |
| Audit Logging | Track all significant system events for security and compliance |

### 2.3 User Classes and Characteristics

| User Class | Access Level | Description |
|---|---|---|
| Guest | Public pages | Can register and log in; no access to core features |
| Authenticated User | All features | Primary user; can generate, send, schedule emails, manage profiles |
| Admin | System management | (Role field defined; administrative features not yet implemented) |

### 2.4 Operating Environment

| Component | Requirement |
|---|---|
| Runtime | Node.js 22+ |
| Framework | Next.js 16 (App Router) |
| Database | MongoDB 6+ (Atlas or local) |
| AI Provider | NVIDIA NIM API |
| Email Provider | Gmail SMTP (App Password) |
| Browser | Modern browsers (Chrome, Firefox, Safari, Edge) |
| Mobile | Responsive design; Telegram bot for mobile access |

### 2.5 Design and Implementation Constraints

| Constraint | Detail |
|---|---|
| TypeScript | Strict mode enabled; all source files in TypeScript |
| Neubrutalist UI | All UI must follow the Neubrutalist design system (see `skills/ui-skill.md`) |
| Multi-tenancy | Every database query must use `ownedFilter(userId)` for data isolation |
| Server-only crypto | Encryption/decryption functions are server-only (no client-side access) |
| In-memory rate limiting | Rate limiter resets on server restart; not distributed |
| Attachment storage | In-memory only; 30-minute TTL; not persisted across restarts |
| Single-process worker | Schedule worker runs per Node.js process; no distributed coordination |

### 2.6 Assumptions and Dependencies

| Assumption/Dependency | Detail |
|---|---|
| NVIDIA NIM API availability | System requires continuous access to NVIDIA NIM for email generation |
| Gmail SMTP access | Users must have a Gmail account with App Password (2-Step Verification enabled) |
| MongoDB availability | System requires persistent MongoDB connection for all data operations |
| Node.js 22+ | Server runtime requirement; leverages modern Node.js APIs |
| Next.js 16 | Framework with App Router; breaking changes from prior versions |

---

## 3. System Features and Functional Requirements

### 3.1 User Authentication & Account Management

#### FR-001: User Registration
- **Priority:** High
- **Description:** Users can create accounts with email/password credentials.
- **Input:** Name, email, password, confirmPassword, honeypot field
- **Processing:**
  - Validate input via Zod schema (name, email format, password complexity: min 8 chars, uppercase, lowercase, number, special char)
  - Check password match
  - Apply honeypot detection (hidden `company` field)
  - Enforce rate limiting: 5 requests/IP/60s, 20 requests/global/60s
  - Hash password with bcrypt (12 rounds)
  - Create User document in MongoDB
  - Auto-sign-in after registration
- **Output:** 201 with user data (id, name, email)
- **Error codes:** `VALIDATION_ERROR`, `DUPLICATE_EMAIL`, `RATE_LIMIT`

#### FR-002: User Login
- **Priority:** High
- **Description:** Users authenticate via email/password through NextAuth.js v5.
- **Input:** Email, password
- **Processing:**
  - Look up user by email
  - Verify password hash via bcrypt
  - Generate JWT token with user ID and role
  - Record `auth.login` audit event
- **Output:** JWT session with user data
- **Error:** `UNAUTHORIZED` (401)

#### FR-003: Session Management
- **Priority:** High
- **Description:** JWT-based session management with automatic refresh.
- **Processing:**
  - JWT stored as HTTP-only cookie
  - `getServerSession()` caches session lookup
  - `requireAuth()` throws `UnauthorizedError` if no valid session
  - `getCurrentUser()` provides graceful fallback (returns null)
- **Output:** `CurrentUser` with userId, name, email, role, onboardingCompleted, profileCompleted

#### FR-004: Password Hashing
- **Priority:** High
- **Description:** Passwords are hashed using bcrypt with 12 salt rounds before storage.
- **Constraint:** Raw passwords are never stored; `passwordHash` field only

### 3.2 Profile Management

#### FR-005: Profile CRUD
- **Priority:** High
- **Description:** Users can manage a multi-section profile that feeds into AI prompt context.
- **Sections:**
  - **Personal:** fullName, phone, location
  - **Professional:** type, designation, department, organization, college, degree
  - **Preferences:** formalityLevel (formal/semi-formal/casual), preferredTone (professional/friendly/neutral/warm/direct), defaultSignature, preferredLanguage, preferredModel
  - **Job Application:** resumeUrl, linkedIn, github, portfolio
- **Input:** Partial updates via `PATCH /api/profile`
- **Processing:**
  - Validate each section with Zod schemas
  - Merge partial updates into existing profile (upsert pattern)
  - Sanitize sensitive fields before API response
- **Output:** Sanitized profile with `emailCredentials: { gmailAddress, emailConfigured }` (password never returned)

#### FR-006: Email Credentials Management
- **Priority:** High
- **Description:** Users can store Gmail credentials for email sending.
- **Input:** `gmailAddress` (string), `appPassword` (16-character Google App Password)
- **Processing:**
  - Validate password length (exactly 16 chars after whitespace strip)
  - Encrypt with AES-256-GCM envelope encryption (v2) using per-user DEK
  - Store `gmailAddress` and `encryptedAppPassword` (v2 object) on Profile
  - Record `email.credentials_saved` audit event
- **Security:** Password never returned by API; `sanitizeProfile()` strips encrypted blob

#### FR-007: Resume Upload & Parsing
- **Priority:** Medium
- **Description:** Users can upload resumes (PDF/DOCX/TXT) for AI-powered data extraction.
- **Input:** File upload via `POST /api/profile/resume` (multipart FormData, max 10MB)
- **Processing:**
  - Detect file type and extract text (PDF via pdfjs-dist, DOCX via mammoth, TXT raw)
  - Send extracted text to AI model with structured extraction prompt
  - Extract: name, email, phone, LinkedIn, GitHub, portfolio, skills (max 15), education (max 5), experience (max 10), projects (max 10)
  - Merge AI extraction with regex fallbacks
  - Validate against Zod schema
  - Persist to `Profile.resume` subdocument
  - Stream progress updates via NDJSON
- **Output:** Parsed resume data
- **Constraint:** `rawText` excluded from GET responses

#### FR-008: Resume Data Editing
- **Priority:** Medium
- **Description:** Users can review and edit parsed resume data at `/settings/resume/edit`.
- **Features:**
  - Modular editor components for contact info, links, skills, education, experience, projects
  - Dirty state tracking with navigation guard
  - Full CRUD on resume sub-sections
- **Input:** `PATCH /api/profile/resume` with structured resume data

### 3.3 AI Email Generation

#### FR-009: Single Email Generation
- **Priority:** High
- **Description:** Generate a single professional email from a user prompt.
- **Input:** `POST /api/generate` with prompt, category, modelId, optional tone, optional sessionId
- **Processing:**
  - Authenticate user, apply rate limiting (10 requests/60s per user)
  - Validate input via Zod schema (prompt 10–5000 chars, category, modelId)
  - Resolve category (session category overrides request category)
  - Load user profile, build AI-ready context (3600 char budget)
  - For existing sessions: load bounded conversation history (max 8 messages, 6000 chars)
  - For new sessions: create session with auto-generated title
  - Build system prompt with Tree of Thought + DCE reasoning:
    1. DIVERGE — Consider 3 different approaches
    2. CONVERGE — Select best approach based on context
    3. EVALUATE — Verify email achieves its goal
  - Call AI provider with system prompt + history + user prompt
  - Save EmailTemplate record + Message entries (user + assistant)
  - Record audit event with metadata (model, duration, tokens)
- **Output:** 201 with content, modelUsed, sessionId
- **Error codes:** `VALIDATION_ERROR`, `RATE_LIMIT`, `AI_PROVIDER_ERROR`

#### FR-010: Batch Email Generation
- **Priority:** High
- **Description:** Generate multiple email drafts simultaneously.
- **Input:** `POST /api/bulk/generate` with entryId, modelId
- **Processing:**
  - Validate entry exists and belongs to user
  - Set status to "generating"
  - Call AI provider with profile context
  - Parse email content (subject/body extraction)
  - Store result on BulkEntry
  - Update status to "generated" or "failed"
- **Output:** Updated BulkEntry with status and generatedContent
- **Constraint:** Rate-limited per user

#### FR-011: Email Category System
- **Priority:** High
- **Description:** 7 predefined email categories with category-specific AI instructions.
- **Categories:**
  | Category | Label | Profile Sections Injected |
  |---|---|---|
  | `job_application` | Job Application | Personal, Professional, Job Application |
  | `leave_request` | Leave Request | Personal, Professional |
  | `sick_leave` | Sick Leave | Personal, Professional |
  | `resignation` | Resignation | Personal, Professional |
  | `complaint` | Complaint | Personal, Professional |
  | `meeting_request` | Meeting Request | Personal, Professional |
  | `custom` | Custom | Personal, Professional, Preferences |
- **Each category provides:** display label, profile sections to inject, prompt guidance, specific AI instruction

#### FR-012: AI Model Selection
- **Priority:** High
- **Description:** Users can choose from 8 AI models for email generation.
- **Models:**
  | ID | Label | Upstream Model | Notes |
  |---|---|---|---|
  | `deepseek` | DeepSeek V4 Flash | deepseek-ai/deepseek-v4-flash | Default. Fast general-purpose |
  | `nemotron` | Nemotron Super 49B | nvidia/llama-3.3-nemotron-super-49b-v1.5 | NVIDIA reasoning |
  | `gptOss` | GPT-OSS 20B | openai/gpt-oss-20b | OpenAI open-weight (Apache-2.0) |
  | `mistralSmall` | Mistral Small 4 (119B) | mistralai/mistral-small-4-119b-2603 | Hybrid instruct+reasoning, temp 0.6 |
  | `llamaMaverick` | Llama 4 Maverick 17B | meta/llama-4-maverick-17b-128e-instruct | Meta multimodal MoE, 1M ctx |
  | `minimaxM27` | MiniMax M2.7 | minimaxai/minimax-m2.7 | Code/agent-tuned, temp 1.0 |
  | `llamaNemotronNano` | Llama Nemotron Nano 8B VL | nvidia/llama-3.1-nemotron-nano-vl-8b-v1 | NVIDIA lightweight multimodal |
  | `nemotron3Ultra` | Nemotron 3 Ultra 550B | nvidia/nemotron-3-ultra-550b-a55b | NVIDIA flagship, 550B param MoE |
- **Default:** User's `preferredModel` from profile settings
- **Override:** Per-generation override without changing saved preference

#### FR-013: Tone Selection
- **Priority:** Medium
- **Description:** Users can select tone per generation (overrides profile formality).
- **Options:** Formal / Neutral (semi-formal) / Casual
- **Default:** User's profile `formalityLevel`
- **Behavior:** Clicking a tone overrides per-generation; not persisted

#### FR-014: Conversation History
- **Priority:** Medium
- **Description:** Session-based conversation history for iterative refinement.
- **Processing:**
  - Messages stored with role (user/assistant), content, modelUsed
  - History bounded to max 8 messages, 6000 characters for AI context
  - Paginated message retrieval (20 per page, descending order)
  - "Load earlier messages" button for historical context

### 3.4 Email Sending

#### FR-015: Single Email Sending
- **Priority:** High
- **Description:** Send a generated email through the user's Gmail account via SMTP.
- **Input:** `POST /api/send-email` with to, subject, body
- **Processing:**
  - Authenticate user, apply rate limiting (5 requests/60s per user)
  - Validate input via Zod schema (to email, subject 1–200 chars, body 1–20000 chars)
  - Fetch encrypted Gmail credentials from Profile
  - Detect v1 vs v2 encryption format
  - Decrypt credentials (v2: DEK → KEK → plaintext; v1: legacy single key)
  - Build fresh Nodemailer transporter (smtp.gmail.com:465, SSL, 10s connect/15s socket timeout)
  - Send email, close transporter in `finally` block
  - Record audit event (email.sent or email.send_failed)
- **Output:** 200 with `{ sent: true, messageId }`
- **Error codes:** `CREDENTIALS_NOT_CONFIGURED`, `CREDENTIALS_INVALID`, `CREDENTIALS_DECRYPTION_FAILED`, `SEND_FAILED`, `RATE_LIMIT`

#### FR-016: Batch Email Sending
- **Priority:** High
- **Description:** Send multiple generated emails in sequence.
- **Input:** `POST /api/bulk/send` with entryId
- **Processing:**
  - Validate entry exists, belongs to user, and has generated content
  - Dispatch via `dispatchSendEmail()` (same credential path as single send)
  - Update entry status (sending → sent or failed)
- **Constraint:** 12-second gap between sends to respect 5/min rate limit

#### FR-017: Attachment Support
- **Priority:** Medium
- **Description:** Users can attach files to emails.
- **Input:** Multipart FormData with file attachments
- **Processing:**
  - Validate file types: PDF, JPEG, PNG, GIF, WebP, DOCX, TXT, CSV
  - Validate sizes: 10 MB per file, 24 MB total, max 20 files
  - Store in-memory with 30-minute TTL
  - Forward to Nodemailer as attachments
- **Constraint:** In-memory storage only; not persisted across restarts

#### FR-018: Email Content Parsing
- **Priority:** Medium
- **Description:** Automatic subject/body extraction from generated email content.
- **Processing:**
  - Detect leading `Subject: ...` line (case-insensitive)
  - Strip subject line and trailing blank line
  - Fallback: first non-empty line as subject (capped at 200 chars)
  - Apply to both single compose and batch entry previews

### 3.5 Email Scheduling

#### FR-019: Schedule Creation
- **Priority:** High
- **Description:** Users can create schedules for deferred email delivery.
- **Input:** `POST /api/schedules` with name, scheduledAt (UTC), timezone
- **Processing:**
  - Validate schedule date is in the future
  - Create Schedule document with status "active"
  - Record `schedule.created` audit event
- **Output:** Schedule data with id, name, scheduledAt, timezone, status

#### FR-020: Schedule Email Management
- **Priority:** High
- **Description:** Users can add, edit, retry, and remove emails from schedules.
- **Operations:**
  - `POST /api/schedules/:id/emails` — Add emails (single or batch source)
  - `PATCH /api/schedules/:id/emails/:emailId` — Edit recipient/subject/body or retry failed
  - `DELETE /api/schedules/:id/emails/:emailId` — Remove not-yet-sent items
- **Deduplication:** Unique sparse indexes on `{scheduleId, sourceMessageId}` and `{scheduleId, sourceBulkEntryId}` prevent duplicate scheduling
- **Source types:**
  - `single`: Snapshots recipient/subject/body at scheduling time
  - `batch`: Stores `sourceBulkEntryId` with `deliveryState: "awaiting_content"`; AI generates content at send time

#### FR-021: Automated Schedule Processing
- **Priority:** High
- **Description:** Background worker or cron job processes due schedules automatically.
- **Architecture:**
  ```
  src/instrumentation.ts → startScheduleWorker() → setInterval(tick)
                                                          ↓
                                                  processDueSchedules()
                                                          ↓
                                                  dispatchSendEmail()
  ```
- **Processing flow:**
  1. Find schedules where `scheduledAt <= now` and `status === "active"`
  2. Atomically claim up to `maxItems` email items (set `deliveryState: "sending"`)
  3. For `awaiting_content` items: generate content via AI provider
  4. Send each item via user's Gmail SMTP
  5. Mark items as "sent" or "failed" with error details
  6. Mark schedule as "sent" or "expired" if past-due
- **Configuration:**
  | Env Var | Default | Description |
  |---|---|---|
  | `SCHEDULE_BACKGROUND_WORKER` | `true` | Enable/disable worker |
  | `SCHEDULE_WORKER_INTERVAL_MS` | `60000` | Tick interval (min 5000ms) |
  | `SCHEDULE_WORKER_MAX_SCHEDULES` | `5` | Max due schedules per tick |
  | `SCHEDULE_WORKER_MAX_EMAILS_PER_SCHEDULE` | `10` | Max emails per schedule per tick |
- **Behavior:**
  - Singleton: one worker per Node.js process
  - Non-blocking: uses `unref()` timers
  - Overlapping protection: skips tick if previous still running
  - Vercel-aware: disabled on Vercel (uses Vercel Cron instead)

#### FR-022: Schedule Lifecycle
- **Priority:** High
- **Description:** Schedules follow a defined state machine.
- **States:**
  ```
  Create → ACTIVE → (cron picks up at scheduledAt) → SENT
                      ↓ (past due, no items sent)    → EXPIRED
                      ↓ (user cancels)               → CANCELLED
  ```
- **Transitions:**
  - `ACTIVE → SENT`: All items processed successfully
  - `ACTIVE → EXPIRED`: Past-due with no items sent
  - `ACTIVE → CANCELLED`: User-initiated cancellation

### 3.6 Session Management

#### FR-023: Session CRUD
- **Priority:** High
- **Description:** Users can create, list, view, rename, archive, and soft-delete sessions.
- **Operations:**
  - `POST /api/sessions` — Create session (title, category)
  - `GET /api/sessions` — List sessions (paginated, searchable, archive filter)
  - `GET /api/sessions/:id` — Get session with all messages
  - `PATCH /api/sessions/:id` — Rename session
  - `DELETE /api/sessions/:id` — Soft-delete (sets `isDeleted: true`)
  - `PATCH /api/sessions/:id/archive` — Toggle archive
  - `POST /api/sessions/clear` — Bulk soft-delete all user sessions
- **Session types:** `single` (default) or `batch`
- **Features:**
  - Infinite scroll with `useInfiniteQuery`
  - Optimistic rename with rollback on error
  - Active session visual indicator
  - Batch badge for batch sessions

#### FR-024: Message Management
- **Priority:** High
- **Description:** Messages are stored per session with role-based content.
- **Fields:** sessionId, role (user/assistant), content, modelUsed, metadata
- **Features:**
  - Paginated retrieval (20 per page, descending)
  - "Load earlier messages" button
  - Collapsible long prompts (>12 lines)
  - "Send via Email" action on assistant messages

### 3.7 Batch Email Operations

#### FR-025: Batch Session Management
- **Priority:** High
- **Description:** Dedicated batch mode for bulk email generation.
- **Operations:**
  - `POST /api/bulk/session` — Create batch session (auto-named "Batch N")
  - `POST /api/bulk/entries` — Create one or more entries
  - `GET /api/bulk/entries?sessionId=` — List entries sorted by sortOrder
  - `PATCH /api/bulk/entries/:id` — Update pending/failed entry
  - `DELETE /api/bulk/entries/:id` — Delete entry
  - `PATCH /api/bulk/entries/batch` — Batch-update category for all pending/failed entries
- **Entry fields:** sessionId, userId, category, prompt, recipient, status, generatedContent, subject, modelUsed, errorMessage, sortOrder
- **Status flow:** `pending → generating → generated / failed → sending → sent`

#### FR-026: Batch Generation UI
- **Priority:** High
- **Description:** Row-based batch compose interface with per-row operations.
- **Features:**
  - `BatchSettingsPanel`: Mail Type selector, Apply to All, row stepper (1–50), shared attachments
  - `BulkRow`: Category/prompt/recipient editing, Generate, Preview, Regenerate, Delete
  - `BulkPreviewDialog`: Subject/body editor with individual Send button
  - `BulkSendBar`: Total/ready/sent/failed counts, "Send All" with progress bar and abort
  - Auto-polling: polls every 2s while entries have "generating" or "sending" status

### 3.8 Telegram Bot Integration

#### FR-027: Telegram Bot Commands
- **Priority:** Medium
- **Description:** Users can interact with AutoCompose via Telegram bot.
- **Commands:**
  | Command | Description |
  |---|---|
  | `/start` | Welcome message; with payload triggers account linking |
  | `/menu` | Show main menu (Compose + Help) |
  | `/compose` | Start email composition flow |
  | `/cancel` | Cancel current operation |
  | `/help` | Show help information |
  | `/status` | Show account info and link status |

#### FR-028: Telegram Account Linking
- **Priority:** Medium
- **Description:** Users can link their Telegram account to AutoCompose.
- **Flow:**
  1. User clicks "Connect Telegram" in Settings
  2. System generates random 8-char base36 code, bcrypt-hashes it, stores with 10min TTL
  3. Returns plaintext code + deep link URL
  4. User opens deep link in Telegram (triggers `/start` with payload)
  5. Bot scans all users with non-expired codes, verifies via bcrypt
  6. Links Telegram chatId to user account
- **Rate limiting:** 5 code generations per hour per user

#### FR-029: Telegram Email Composition Flow
- **Priority:** Medium
- **Description:** Multi-step email composition via Telegram inline keyboards.
- **Flow:**
  1. `startCompose()` — Reset state, show category keyboard
  2. `handleCategorySelection()` — Save category, prompt for details
  3. `handlePromptMessage()` — Validate prompt (10–5000 chars), generate email via AI
  4. `handleRegenerate()` — Re-generate using same prompt
  5. Review keyboard: Send / To me / Regenerate / Menu

#### FR-030: Telegram Email Sending Flow
- **Priority:** Medium
- **Description:** Multi-step email sending via Telegram.
- **Flow:**
  1. `handleSendStart()` — Validate credentials, check rate limit
  2. `handleSendToMe()` — Shortcut using user's Gmail address
  3. `handleRecipientInput()` — Validate email
  4. `handleSubjectInput()` — Accept custom subject or auto-detected
  5. `handleSendConfirm()` — Dispatch email via SMTP
- **Rate limiting:** 10 sends/hour via Telegram

#### FR-031: Telegram Conversation State
- **Priority:** Medium
- **Description:** Multi-step conversation state with optimistic concurrency control.
- **State machine:** idle → selecting_category → awaiting_prompt → browsing_sessions → awaiting_recipient → awaiting_subject → awaiting_send_confirm
- **Storage:** `TelegramState` model with 24-hour TTL index
- **Concurrency:** Version-based optimistic locking prevents race conditions
- **Idempotency:** Duplicate updateId detection via MongoDB insert with 10-minute TTL

### 3.9 Audit Logging

#### FR-032: Audit Trail
- **Priority:** High
- **Description:** All significant system events are recorded in an audit log.
- **32 predefined actions:**
  - Email: generated, regenerated, sent, send_failed, credentials_saved, credentials_removed, credentials_migrated_to_v2
  - Auth: login, logout, signup, failed_login, session_refresh
  - Session: created, updated, deleted, bulk_deleted, archived, unarchived
  - Schedule: created, updated, cancelled, email_added, email_sent, email_failed
  - Telegram: linked, unlinked, login_code_generated, login_code_attempt, message_received, command_executed, email_generated, email_sent, email_send_failed, webhook_rejected
  - System: model.switched, api.error, validation.error
- **Fields:** action, entityType, entityId, userId, metadata, ip, userAgent, createdAt
- **Behavior:** Fire-and-forget; failures logged but do not propagate

---

## 4. External Interface Requirements

### 4.1 User Interface

#### UI-001: Neubrutalist Design System
- **Priority:** High
- **Description:** All UI follows a bold, high-contrast Neubrutalist aesthetic.
- **Visual tokens:**
  | Token | Value |
  |---|---|
  | Border | `3px solid #000` |
  | Shadow | `6px 6px 0 #000` (hard edge, no blur) |
  | Radius | `8px` max |
  | Primary | `#ffd700` (Yellow) |
  | Error | `#ff4d6d` (Pink) |
  | Success | `#06d6a0` (Green) |
  | Surface | `#f8f9fa` |
  | Background | `#e8e6e1` |
- **Interactive states:**
  - Default: Strong border, hard shadow, flat color
  - Hover: Shadow expands, element shifts `-2px, -2px`
  - Active/Pressed: Shadow collapses, element shifts `4px, 4px`
  - Focus: `4px solid yellow` outline
  - Disabled: 50% opacity, no-pointer

#### UI-002: Responsive Layout
- **Priority:** High
- **Description:** AppShell with responsive sidebar navigation.
- **Breakpoints:**
  - Desktop: Full sidebar + content area
  - Mobile (<768px): Sidebar collapses to flyout with backdrop overlay
- **Features:**
  - Persistent sidebar state via Zustand store
  - Keyboard shortcut: `Cmd/Ctrl+K` navigates to compose
  - User menu in sidebar footer

#### UI-003: UI Primitives
- **Priority:** High
- **Description:** Reusable component library.
- **Components:**
  | Component | Features |
  |---|---|
  | Button | Variants: primary/secondary/danger/ghost, loading state |
  | Input | Label, error state, forwardRef |
  | Select | Label, error, options array |
  | Card | Composable Card/CardHeader/CardBody/CardFooter, hover modifier |
  | Skeleton | Loading placeholders (Skeleton, SkeletonCard, SkeletonList) |
  | EmptyState | Icon, title, description, optional action |
  | Tabs | Context-based tab system (Tabs, TabsList, TabTrigger, TabContent) |
  | AttachmentUpload | Drag-and-drop with validation, file list, size formatting |

### 4.2 API Interfaces

#### API-001: RESTful API Architecture
- **Priority:** High
- **Description:** All API routes follow RESTful conventions with consistent response format.
- **Response format:**
  ```json
  {
    "success": true,
    "data": { ... }
  }
  ```
- **Error format:**
  ```json
  {
    "success": false,
    "error": {
      "code": "ERROR_CODE",
      "message": "Human-readable message"
    }
  }
  ```
- **Helpers:** `success()`, `created()`, `failure()` from `src/utils/api-response.ts`

#### API-002: Complete API Endpoint Reference
- **Priority:** High

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `POST` | `/api/generate` | Required | Generate AI email |
| `POST` | `/api/send-email` | Required | Send email via Gmail SMTP |
| `GET` | `/api/profile` | Required | Get user profile + readiness |
| `PATCH` | `/api/profile` | Required | Update user profile |
| `POST` | `/api/profile/resume` | Required | Upload and parse resume |
| `GET` | `/api/profile/resume` | Required | Get parsed resume |
| `PATCH` | `/api/profile/resume` | Required | Update resume data |
| `DELETE` | `/api/profile/resume` | Required | Delete resume |
| `POST` | `/api/sessions` | Required | Create session |
| `GET` | `/api/sessions` | Required | List sessions (paginated) |
| `GET` | `/api/sessions/:id` | Required | Get session with messages |
| `PATCH` | `/api/sessions/:id` | Required | Update session |
| `DELETE` | `/api/sessions/:id` | Required | Soft-delete session |
| `PATCH` | `/api/sessions/:id/archive` | Required | Toggle archive |
| `GET` | `/api/sessions/:id/messages` | Required | Get paginated messages |
| `POST` | `/api/sessions/clear` | Required | Bulk soft-delete all sessions |
| `POST` | `/api/auth/register` | Public | Register new account |
| `GET` | `/api/auth/me` | Required | Get current user |
| `POST` | `/api/attachments/upload` | Required | Upload file attachments |
| `POST` | `/api/bulk/session` | Required | Create batch session |
| `POST` | `/api/bulk/entries` | Required | Create bulk entries |
| `GET` | `/api/bulk/entries` | Required | List bulk entries |
| `PATCH` | `/api/bulk/entries/:id` | Required | Update bulk entry |
| `DELETE` | `/api/bulk/entries/:id` | Required | Delete bulk entry |
| `PATCH` | `/api/bulk/entries/batch` | Required | Batch update category |
| `POST` | `/api/bulk/generate` | Required | Generate entry via AI |
| `POST` | `/api/bulk/send` | Required | Send entry via Gmail SMTP |
| `GET` | `/api/schedules` | Required | List schedules (paginated) |
| `POST` | `/api/schedules` | Required | Create a schedule |
| `GET` | `/api/schedules/active` | Required | List active future schedules |
| `GET` | `/api/schedules/:id` | Required | Get schedule with email items |
| `PATCH` | `/api/schedules/:id` | Required | Update schedule |
| `DELETE` | `/api/schedules/:id` | Required | Cancel/delete a schedule |
| `POST` | `/api/schedules/:id/emails` | Required | Add emails to schedule |
| `PATCH` | `/api/schedules/:id/emails/:emailId` | Required | Edit/retry scheduled email |
| `DELETE` | `/api/schedules/:id/emails/:emailId` | Required | Remove scheduled email |
| `POST` | `/api/schedules/:id/process` | Required | Manual trigger single schedule |
| `GET/POST` | `/api/cron/process-schedules` | Cron Secret | Internal cron tick |
| `POST` | `/api/telegram/webhook` | Public | Telegram webhook |
| `GET` | `/api/telegram/health` | Public | Telegram health check |
| `POST` | `/api/telegram/login-code` | Required | Generate login code |
| `DELETE` | `/api/telegram/login-code` | Required | Revoke login code |
| `GET` | `/api/telegram/status` | Required | Get Telegram status |
| `DELETE` | `/api/telegram/link` | Required | Unlink Telegram |

### 4.3 Hardware Interfaces

None. AutoCompose is a cloud-hosted web application.

### 4.4 Software Interfaces

| Interface | Technology | Purpose |
|---|---|---|
| NVIDIA NIM API | OpenAI SDK | AI model inference for email generation |
| MongoDB | Mongoose 9 ODM | Persistent data storage |
| Gmail SMTP | Nodemailer | Email delivery via user's Gmail account |
| Telegram Bot API | grammY SDK | Bot integration for mobile access |
| NextAuth.js v5 | JWT + Credentials | Authentication and session management |

---

## 5. Non-Functional Requirements

### 5.1 Performance

| ID | Requirement | Metric |
|---|---|---|
| NFR-001 | API response time | < 200ms for CRUD operations (excluding AI calls) |
| NFR-002 | AI generation latency | < 30 seconds per email (model-dependent) |
| NFR-003 | Email sending latency | < 5 seconds per email (SMTP round-trip) |
| NFR-004 | Schedule processing | Processes due schedules within 60 seconds of `scheduledAt` |
| NFR-005 | Batch send throughput | 1 email per 12 seconds (rate limit compliance) |
| NFR-006 | Concurrent users | Supports 100+ concurrent users (MongoDB connection pool: 10) |

### 5.2 Scalability

| ID | Requirement | Detail |
|---|---|---|
| NFR-007 | Horizontal scaling | Next.js stateless; scales via multiple instances |
| NFR-008 | Database scaling | MongoDB Atlas supports auto-scaling |
| NFR-009 | AI provider scaling | NVIDIA NIM handles model scaling |
| NFR-010 | Rate limiting | Per-user in-memory; not distributed (single-instance only) |

### 5.3 Reliability

| ID | Requirement | Detail |
|---|---|---|
| NFR-011 | Data persistence | MongoDB replica set for durability |
| NFR-012 | Graceful degradation | AI failures return user-friendly errors; do not crash |
| NFR-013 | Schedule reliability | Cron processing is idempotent; retries are safe |
| NFR-014 | Connection management | MongoDB connection pooling with automatic reconnection |

### 5.4 Availability

| ID | Requirement | Detail |
|---|---|---|
| NFR-015 | Uptime target | 99.5% (excludes scheduled maintenance) |
| NFR-016 | Recovery time | < 5 minutes for service restart |
| NFR-017 | Backup strategy | MongoDB Atlas automated backups |

### 5.5 Security

| ID | Requirement | Detail |
|---|---|---|
| NFR-018 | Authentication | JWT-based with HTTP-only cookies |
| NFR-019 | Password hashing | bcrypt with 12 salt rounds |
| NFR-020 | Credential encryption | AES-256-GCM envelope encryption (v2) |
| NFR-021 | Data isolation | Multi-tenant via `ownedFilter(userId)` on all queries |
| NFR-022 | Rate limiting | Per-user and per-IP rate limiting on sensitive endpoints |
| NFR-023 | Honeypot detection | Hidden form field for bot detection on registration |
| NFR-024 | Audit logging | All significant events recorded with IP and user agent |
| NFR-025 | Input validation | Zod schemas on all API inputs |
| NFR-026 | HTTPS | Required in production |
| NFR-027 | Secret rotation | AUTH_SECRET rotation invalidates all stored credentials |

### 5.6 Maintainability

| ID | Requirement | Detail |
|---|---|---|
| NFR-028 | Code documentation | Every source file has standardized comment block at bottom |
| NFR-029 | TypeScript | Strict mode; full type coverage |
| NFR-030 | Testing | Vitest framework; co-located test files |
| NFR-031 | Linting | ESLint with next/core-web-vitals + typescript config |
| NFR-032 | Module organization | Feature-based modules with clear separation of concerns |

### 5.7 Usability

| ID | Requirement | Detail |
|---|---|---|
| NFR-033 | Responsive design | Mobile, tablet, desktop, ultra-wide support |
| NFR-034 | Accessibility | Keyboard navigation, focus indicators, semantic HTML |
| NFR-035 | Empty states | Every empty state has explanation + call to action |
| NFR-036 | Error states | Errors explain issue, cause, and resolution |
| NFR-037 | Loading states | Skeletons and progress indicators for all async operations |
| NFR-038 | Draft persistence | Unsaved compose forms persist across navigation |

---

## 6. Data Requirements

### 6.1 Data Models

#### 6.1.1 User

| Field | Type | Constraints |
|---|---|---|
| `name` | string | Required |
| `email` | string | Unique, indexed |
| `passwordHash` | string | bcrypt hash |
| `avatar` | string | Optional |
| `role` | enum | `user` \| `admin`, default: `user` |
| `provider` | enum | `credentials` \| `oauth` |
| `emailVerified` | Date | Optional |
| `onboardingCompleted` | boolean | Default: false |
| `telegram` | subdoc | chatId (unique, partial index), username, linkedAt, enabled |
| `telegramLoginCode` | string | Select: false |
| `telegramLoginCodeExpiresAt` | Date | Select: false |

#### 6.1.2 Profile

| Field | Type | Constraints |
|---|---|---|
| `userId` | string | Unique, indexed |
| `personal` | subdoc | fullName, phone, location |
| `professional` | subdoc | type, designation, department, organization, college, degree |
| `preferences` | subdoc | formalityLevel, preferredTone, defaultSignature, preferredLanguage, preferredModel |
| `jobApplication` | subdoc | resumeUrl, linkedIn, github, portfolio |
| `emailCredentials` | subdoc | gmailAddress, encryptedAppPassword (v2 object), encryptedDek, dekVersion |
| `resume` | subdoc | rawText, name, email, phone, linkedin, github, portfolio, parsedByModel, skills[], education[], experience[], projects[] |

#### 6.1.3 Session

| Field | Type | Constraints |
|---|---|---|
| `title` | string | Indexed (text) |
| `type` | enum | `single` \| `batch`, default: `single` |
| `category` | enum | Email category |
| `userId` | string | Indexed |
| `metadata` | Mixed | Extensible |
| `isArchived` | boolean | Indexed |
| `isDeleted` | boolean | Indexed |
| `deletedAt` | Date | When soft-deleted |

**Indexes:** `{ userId: 1, isDeleted: 1, createdAt: -1 }`, `{ userId: 1, isArchived: 1 }`, text index on `title`

#### 6.1.4 Message

| Field | Type | Constraints |
|---|---|---|
| `sessionId` | ObjectId | Ref Session, indexed |
| `role` | enum | `user` \| `assistant` |
| `content` | string | |
| `modelUsed` | string | Assistant only |
| `metadata` | Mixed | Extensible |

**Index:** `{ sessionId: 1, createdAt: 1 }`

#### 6.1.5 BulkEntry

| Field | Type | Constraints |
|---|---|---|
| `sessionId` | ObjectId | Ref Session, indexed |
| `userId` | string | Indexed |
| `category` | enum | Email category |
| `prompt` | string | Max 5000 chars |
| `recipient` | string | Email address |
| `status` | enum | `pending` \| `generating` \| `generated` \| `failed` \| `sending` \| `sent` |
| `generatedContent` | string | Optional |
| `subject` | string | Optional |
| `modelUsed` | string | Optional |
| `errorMessage` | string | Optional |
| `sortOrder` | number | Display ordering |

**Indexes:** `{ sessionId: 1, sortOrder: 1 }`, `{ userId: 1, status: 1 }`

#### 6.1.6 Schedule

| Field | Type | Constraints |
|---|---|---|
| `userId` | string | Indexed |
| `name` | string | Max 120 chars |
| `scheduledAt` | Date | Indexed (UTC) |
| `timezone` | string | IANA timezone |
| `status` | enum | `active` \| `sent` \| `expired` \| `cancelled`, indexed |

**Index:** `{ userId: 1, status: 1, scheduledAt: 1 }`

#### 6.1.7 ScheduledEmail

| Field | Type | Constraints |
|---|---|---|
| `scheduleId` | ObjectId | Ref Schedule, indexed |
| `userId` | string | Indexed |
| `sourceType` | enum | `single` \| `batch` |
| `sourceSessionId` | ObjectId | Optional |
| `sourceMessageId` | ObjectId | Sparse unique |
| `sourceBulkEntryId` | ObjectId | Unique (partial) |
| `to` | string | Recipient email |
| `subject` | string | Max 200 chars |
| `body` | string | Max 20000 chars |
| `category` | enum | Optional |
| `prompt` | string | Max 5000 chars |
| `modelId` | enum | Optional |
| `deliveryState` | enum | `awaiting_content` \| `ready` \| `sending` \| `sent` \| `failed`, indexed |
| `claimedAt` | Date | Optional |
| `sentAt` | Date | Optional |
| `errorCode` | string | Optional |
| `errorMessage` | string | Optional |
| `sortOrder` | number | Display ordering |

**Indexes:** `{ scheduleId: 1, sortOrder: 1 }`, `{ userId: 1, deliveryState: 1 }`, unique sparse on `{ scheduleId, sourceMessageId }` and `{ scheduleId, sourceBulkEntryId }`

#### 6.1.8 EmailTemplate

| Field | Type | Constraints |
|---|---|---|
| `category` | enum | Indexed |
| `prompt` | string | |
| `generatedEmail` | string | |
| `modelUsed` | string | |
| `userId` | string | Indexed |
| `metadata` | Mixed | |

**Indexes:** `createdAt`, `{ userId: 1, createdAt: -1 }`

#### 6.1.9 AuditLog

| Field | Type | Constraints |
|---|---|---|
| `action` | enum | Indexed |
| `entityType` | string | Indexed |
| `entityId` | string | Indexed |
| `userId` | string | Indexed |
| `metadata` | Mixed | |
| `ip` | string | |
| `userAgent` | string | |
| `createdAt` | Date | Indexed |

**Indexes:** `createdAt`, `{ action: 1, createdAt: -1 }`, `{ userId: 1, createdAt: -1 }`

#### 6.1.10 TelegramState

| Field | Type | Constraints |
|---|---|---|
| `chatId` | string | Unique |
| `userId` | string | Indexed |
| `step` | enum | 7-step state machine |
| `category` | string | |
| `draftId` | string | |
| `draftSnapshot` | Mixed | |
| `pendingSendTo` | string | |
| `pendingSubject` | string | |
| `extractedRecipient` | string | |
| `pageOffset` | number | |
| `pendingInput` | string | |
| `version` | number | Optimistic concurrency |

**TTL:** 24-hour auto-expiry on `updatedAt`
**Index:** `{ userId: 1, updatedAt: -1 }`

#### 6.1.11 TelegramUpdate

| Field | Type | Constraints |
|---|---|---|
| `updateId` | number | Unique |
| `receivedAt` | Date | TTL: 10 minutes |

### 6.2 Data Retention

| Data | Retention | Mechanism |
|---|---|---|
| User accounts | Indefinite | Manual deletion |
| Sessions | Indefinite (soft-deleted) | `isDeleted` flag |
| Messages | Indefinite | Cascade with session |
| Audit logs | Indefinite | MongoDB |
| TelegramState | 24 hours | TTL index |
| TelegramUpdate | 10 minutes | TTL index |
| Attachments | 30 minutes | In-memory TTL |
| Rate limit counters | 60 seconds | Sliding window |

---

## 7. System Architecture

### 7.1 High-Level Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│                        UI Layer                                   │
│  AppShell (Header + Sidebar) → Feature Pages                     │
│    ├── / (compose)          │  ComposePage (Single/Batch toggle) │
│    ├── /dashboard           │  Workspace home                    │
│    ├── /sessions/[id]       │  SessionView or BatchSessionView   │
│    ├── /settings            │  ProfileForm (4 sections)          │
│    ├── /schedules           │  Schedule list and creation        │
│    └── /schedules/[id]      │  Schedule detail                   │
│  AuthGuard wraps all (app) routes                                │
│  Telegram Bot (grammY) ←→ Webhook                                │
└──────────────────────────────┬───────────────────────────────────┘
                               │ API calls via TanStack Query
┌──────────────────────────────▼───────────────────────────────────┐
│                     API Routes (Next.js)                          │
│  POST /api/generate      → rate-limit → validate → service → AI  │
│  POST /api/send-email    → requireAuth → decrypt → SMTP          │
│  POST|GET /api/schedules → requireAuth → CRUD                    │
│  POST /api/bulk/*        → requireAuth → bulk operations         │
│  POST /api/telegram/*    → webhook/auth                          │
│  GET /api/cron/*         → cron-secret → batch send              │
└──────────────────────────┬───────────────────────────────────────┘
          ┌────────────────┼────────────────────┐
          ▼                ▼                    ▼
     ┌──────────┐    ┌──────────┐        ┌──────────┐
     │ MongoDB  │    │ NVIDIA   │        │ Gmail    │
     │ Models   │    │ NIM API  │        │ SMTP     │
     └──────────┘    └──────────┘        └──────────┘
```

### 7.2 Module Structure

```
src/
├── app/                    # Next.js App Router
│   ├── (app)/              # Authenticated pages (AuthGuard + AppShell)
│   ├── api/                # API routes
│   ├── actions/            # Server actions
│   ├── auth/               # Auth error pages
│   ├── login/              # Login page
│   └── register/           # Registration page
├── components/             # Shared React components
│   ├── auth/               # Auth components (AuthGuard, LoginForm, RegisterForm, UserButton)
│   ├── settings/           # Settings components (ClearSessionsCard)
│   └── ui/                 # UI primitives (Button, Input, Card, Select, Skeleton, etc.)
├── features/               # Feature-based modules
│   ├── layout/             # AppShell (header, sidebar, Zustand store)
│   ├── batch/              # Batch email generation UI + hooks + API
│   ├── profile/            # Profile management UI + hooks + API
│   ├── schedule/           # Schedule management UI + hooks + API
│   └── sessions/           # Session management UI + hooks + API
├── hooks/                  # Custom React hooks
├── lib/                    # Infrastructure layer
│   ├── auth/               # Auth + ownership system
│   └── ...                 # DB, errors, logger, crypto, rate-limit, audit
├── models/                 # Mongoose schemas (11 models)
├── modules/                # Backend business logic
│   ├── ai/                 # AI provider (strategy pattern)
│   ├── attachments/        # In-memory attachment storage
│   ├── bulk/               # Batch email CRUD + generate + send
│   ├── email/              # Email generation + sending + categories
│   ├── message/            # Message CRUD
│   ├── profile/            # Profile management + context builder
│   ├── resume/             # Resume parsing (PDF/DOCX/TXT)
│   ├── schedule/           # Schedule CRUD + cron processing
│   ├── session/            # Session management + AI context
│   └── telegram/           # Telegram bot (commands, callbacks, flows, webhooks)
├── scripts/                # Migration scripts
├── types/                  # TypeScript declarations
└── utils/                  # Utility functions
```

### 7.3 AI Provider Architecture

Strategy pattern with abstract base class:

```
AIProvider (interface)
  └── BaseAIProvider (abstract)
        └── NvidiaNIMProvider (concrete)
```

- **BaseAIProvider:** Builds system prompts with Tree of Thought + DCE reasoning, injects profile context, formats user prompts
- **NvidiaNIMProvider:** Uses OpenAI SDK configured with NVIDIA NIM API endpoints; supports all 8 models with per-model temperature/maxTokens defaults
- **Factory:** Lazy singleton pattern; `getAIProvider()` returns the appropriate provider instance

### 7.4 Encryption Architecture

Envelope encryption (v2) with legacy v1 support:

```
v2 Flow:
  Plaintext → DEK (random 32-byte) → encrypted data
  DEK → KEK (AUTH_SECRET + userId salt) → encrypted DEK
  Store: { version: "v2", encryptedDek, encryptedData, dekVersion }

v1 Flow (legacy):
  Plaintext → KEY (AUTH_SECRET derived) → encrypted data
  Store: "v1:iv:tag:ciphertext"
```

- **Security benefit:** Compromising AUTH_SECRET alone does not expose any user's plaintext credentials
- **Migration:** `migrateV1ToV2()` decrypts with legacy key, re-encrypts with per-user DEK
- **Detection:** `detectVersion()` inspects stored payload and routes to correct decryptor
- **Key rotation:** `rotateKEK(oldSecret, newSecret)` re-encrypts all DEKs; run annually

### 7.5 Schedule Processing Architecture

```
src/instrumentation.ts → startScheduleWorker() → setInterval(tick)
                                                          ↓
                                                  processDueSchedules()
                                                          ↓
                                              Atomically claim items
                                                          ↓
                                              Generate AI content (if batch)
                                                          ↓
                                              Send via Gmail SMTP
                                                          ↓
                                              Update delivery states
                                                          ↓
                                              Mark schedule terminal
```

- **Vercel deployment:** Uses Vercel Cron (`vercel.json`) to call `GET /api/cron/process-schedules` every minute
- **Self-hosted:** In-process worker via `src/lib/schedule-worker.ts`
- **Atomicity:** MongoDB `findOneAndUpdate` with `deliveryState` preconditions prevents race conditions

---

## 8. Security Requirements

### 8.1 Authentication & Authorization

| Requirement | Implementation |
|---|---|
| JWT-based authentication | NextAuth.js v5 with HTTP-only cookies |
| Password hashing | bcrypt with 12 salt rounds |
| Multi-tenant isolation | `ownedFilter(userId)` on all database queries |
| Role-based access | User/Admin roles defined (admin features not yet implemented) |
| Session caching | `getServerSession()` caches session lookups |

### 8.2 Data Protection

| Requirement | Implementation |
|---|---|
| Credential encryption | AES-256-GCM envelope encryption (v2) with per-user DEKs |
| Password never returned | `sanitizeProfile()` strips encrypted blob from API responses |
| Server-only crypto | `import "server-only"` on crypto module |
| No secrets in logs | Audit logs record metadata only; never log passwords |
| AUTH_SECRET rotation | Invalidates all stored credentials; documented in Settings |

### 8.3 Network Security

| Requirement | Implementation |
|---|---|
| HTTPS | Required in production |
| Rate limiting | Per-user (5/min for sends, 10/min for generates) and per-IP (5/min registration) |
| Honeypot detection | Hidden form field on registration; bots silently discarded |
| Input validation | Zod schemas on all API inputs |
| CORS | Next.js default (same-origin) |

### 8.4 Audit & Monitoring

| Requirement | Implementation |
|---|---|
| Audit logging | 32 predefined events with IP, userAgent, metadata |
| Error tracking | Structured logging with levels (debug, info, warn, error) |
| Failure recording | All SMTP failures logged with error codes |
| Login tracking | Failed login attempts recorded |

### 8.5 Telegram Security

| Requirement | Implementation |
|---|---|
| Webhook verification | Constant-time `X-Telegram-Bot-API-Secret-Token` comparison |
| Account linking | bcrypt-hashed login codes with 10-minute TTL |
| Idempotency | Duplicate updateId detection via MongoDB with 10-minute TTL |
| Rate limiting | Per-action limits (5 code gen/hr, 20 generates/hr, 10 sends/hr) |

---

## 9. Appendices

### Appendix A: Environment Variables

| Variable | Required | Default | Description |
|---|---|---|---|
| `MONGODB_URI` | Yes | — | MongoDB connection string |
| `NVIDIA_API_KEY` | Yes | — | NVIDIA NIM API key |
| `NVIDIA_BASE_URL` | No | `https://integrate.api.nvidia.com/v1` | NVIDIA API base URL |
| `AUTH_SECRET` | Yes | — | NextAuth secret (min 32 chars) |
| `AUTH_URL` | No | `http://localhost:3000` | Auth URL |
| `NODE_ENV` | No | `development` | Environment mode |
| `NEXT_PUBLIC_APP_URL` | No | `http://localhost:3000` | Public app URL |
| `CRON_SECRET` | No | — | Cron endpoint protection |
| `SCHEDULE_BACKGROUND_WORKER` | No | `true` | Enable background worker |
| `SCHEDULE_WORKER_INTERVAL_MS` | No | `60000` | Worker tick interval |
| `SCHEDULE_WORKER_MAX_SCHEDULES` | No | `5` | Max schedules per tick |
| `SCHEDULE_WORKER_MAX_EMAILS_PER_SCHEDULE` | No | `10` | Max emails per schedule |
| `TELEGRAM_BOT_TOKEN` | No | — | Telegram bot token |
| `TELEGRAM_BOT_USERNAME` | No | — | Telegram bot username |
| `TELEGRAM_WEBHOOK_SECRET` | No | — | Webhook secret |

### Appendix B: Dependency Versions

| Package | Version | Purpose |
|---|---|---|
| next | 16.2.7 | Web framework |
| react | 19.2.4 | UI library |
| react-dom | 19.2.4 | React DOM renderer |
| mongoose | ^9.6.3 | MongoDB ODM |
| next-auth | ^5.0.0-beta.31 | Authentication |
| openai | ^6.42.0 | NVIDIA NIM client |
| grammy | ^1.43.0 | Telegram bot framework |
| nodemailer | ^7.0.13 | SMTP email sending |
| zod | ^4.4.3 | Schema validation |
| zustand | ^5.0.14 | Client state management |
| @tanstack/react-query | ^5.101.0 | Server state management |
| bcryptjs | ^3.0.3 | Password hashing |
| mammoth | ^1.12.0 | DOCX parsing |
| pdf-parse | ^2.4.5 | PDF parsing |
| typescript | ^5 | Type system |
| vitest | ^3.2.4 | Testing framework |
| eslint | ^9 | Linting |

### Appendix C: API Error Codes

| Code | Status | Meaning |
|---|---|---|
| `VALIDATION_ERROR` | 400 | Input validation failed |
| `DUPLICATE_EMAIL` | 409 | Email already registered |
| `UNAUTHORIZED` | 401 | Authentication required |
| `FORBIDDEN` | 403 | Access denied |
| `NOT_FOUND` | 404 | Resource not found |
| `RATE_LIMIT` | 429 | Too many requests |
| `AI_PROVIDER_ERROR` | 502 | AI API error |
| `CREDENTIALS_NOT_CONFIGURED` | 400 | Gmail credentials not set |
| `CREDENTIALS_INVALID` | 400 | Gmail rejected credentials |
| `CREDENTIALS_DECRYPTION_FAILED` | 500 | Stored credentials can't be decrypted |
| `SEND_FAILED` | 502 | SMTP/network error |
| `SCHEDULE_EXPIRED` | 400 | Schedule date is in the past |
| `SCHEDULE_NOT_ACTIVE` | 400 | Cannot modify non-active schedule |
| `EMAIL_ALREADY_SENT` | 400 | Cannot modify sent email |
| `EMAIL_ALREADY_SCHEDULED` | 409 | Email already in schedule (dedup) |
| `CRON_UNAUTHORIZED` | 401 | Missing/invalid cron secret |
| `INTERNAL_ERROR` | 500 | Unexpected error |

### Appendix D: Changelog Summary

| Date | Feature | Key Changes |
|---|---|---|
| 2026-07-01 | Email Scheduling | Schedule CRUD, cron processing, delivery state machine, background worker |
| 2026-07-01 | Resume Editor | Editable resume data, modular editor components |
| 2026-07-01 | Batch Fixes | Optimistic update fix, GitHub field, UI refinements |
| 2026-06-30 | Batch Config | BatchSettingsPanel, BatchHelpDialog |
| 2026-06-27 | Registration Security | IP rate limiting, honeypot bot detection |
| 2026-06-26 | UE Features | Tone toggle, draft auto-save, session pagination, keyboard shortcut |
| 2026-06-22 | Attachments | File attachment system with validation and storage |
| 2026-06-22 | Settings UI | Redesigned settings page with tabs |
| 2026-06-21 | Clear Sessions | Bulk session deletion feature |
| 2026-06-21 | Email Extraction | Auto email address extraction from prompts |
| 2026-06-17 | Batch Generation | Full batch email generation and sending |
| 2026-06-06 | Email Sending | Gmail credentials + Send via Email |
| 2026-06-05 | Auth Cleanup | Removed MongoDB adapter, simplified auth |

---

*End of Document*
