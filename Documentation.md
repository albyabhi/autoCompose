# AutoCompose Documentation

AI-powered professional email composition tool built with Next.js 16 App Router, MongoDB, NVIDIA NIM, and a Neubrutalist design system.

---

## Architecture Overview

```
┌──────────────────────────────────────────────────────────────────┐
│                        UI Layer                                   │
│  AppShell (Header + Sidebar) → Feature Pages                     │
│    ├── / (compose)          │  GenerateForm + ResponseDisplay     │
│    ├── /dashboard           │  Workspace home                    │
│    ├── /sessions/[id]       │  SessionView + message history     │
│    └── /settings            │  ProfileForm (4 sections)          │
│  AuthGuard wraps all (app) routes                                │
└──────────────────────────────┬───────────────────────────────────┘
                               │ API calls via TanStack Query
┌──────────────────────────────▼───────────────────────────────────┐
│                     API Routes (Next.js)                          │
│  POST /api/generate    → rate-limit → validate → service → AI    │
│  POST /api/sessions    → requireAuth → createSession             │
│  GET  /api/sessions    → requireAuth → listSessions (paginated)  │
│  GET  /api/sessions/:id → requireAuth → getSession + messages    │
│  PATCH /api/sessions/:id → requireAuth → updateSession           │
│  DELETE /api/sessions/:id → requireAuth → deleteSession (soft)   │
│  PATCH /api/sessions/:id/archive → requireAuth → toggleArchive   │
│  GET  /api/sessions/:id/messages → requireAuth → getMessages     │
│  GET  /api/profile      → requireAuth → getProfile               │
│  PATCH /api/profile     → requireAuth → updateProfile            │
│  GET  /api/auth/me      → getCurrentUser (enriched)              │
└──────────────────────────────┬───────────────────────────────────┘
          ┌────────────────────┼────────────────────┐
          ▼                    ▼                    ▼
     ┌──────────┐       ┌──────────┐        ┌──────────┐
     │ MongoDB   │       │ NVIDIA   │        │ Audit    │
     │ Models    │       │ NIM API  │        │ Logs     │
     └──────────┘       └──────────┘        └──────────┘
```

---

## Project Structure

```
src/
├── app/                          # Next.js App Router
│   ├── (app)/                    # Route group — all authenticated pages
│   │   ├── layout.tsx            # AuthGuard + AppShell (shared)
│   │   ├── page.tsx              # / — Compose page
│   │   ├── dashboard/page.tsx    # /dashboard
│   │   ├── sessions/
│   │   │   ├── page.tsx          # /sessions — history list
│   │   │   └── [id]/page.tsx     # /sessions/:id — detail + messages
│   │   └── settings/page.tsx     # /settings — profile form
│   ├── api/                      # API routes
│   │   ├── auth/
│   │   │   ├── [...nextauth]/    # NextAuth v5 handlers
│   │   │   ├── register/route.ts
│   │   │   └── me/route.ts       # Current user (enriched)
│   │   ├── generate/route.ts     # POST /api/generate
│   │   ├── profile/route.ts      # GET/PATCH profile
│   │   └── sessions/             # Session CRUD + messages
│   ├── globals.css               # Neubrutalist design system
│   ├── layout.tsx                # Root layout (providers)
│   └── login | register | auth/  # Auth pages (no AppShell)
│
├── components/                   # Shared components
│   ├── auth/
│   │   ├── session-provider.tsx  # NextAuth SessionProvider wrapper
│   │   ├── auth-guard.tsx        # Protected route wrapper
│   │   ├── user-button.tsx       # Avatar + dropdown menu
│   │   ├── login-form.tsx
│   │   └── register-form.tsx
│   ├── ui/                       # Reusable UI primitives
│   │   ├── button.tsx            # Variants: primary/secondary/danger/ghost
│   │   ├── input.tsx             # With label + error state
│   │   ├── select.tsx            # With label + error state
│   │   ├── card.tsx              # Card, CardHeader, CardBody, CardFooter
│   │   ├── skeleton.tsx          # Loading placeholders
│   │   ├── empty-state.tsx       # Empty state with icon + action
│   │   └── index.ts
│   ├── generate-form.tsx         # Prompt input + category + model selector
│   ├── model-selector.tsx
│   ├── response-display.tsx      # Loading/error/empty/success states
│   └── providers.tsx             # TanStack Query provider
│
├── features/                     # Feature-based modules
│   ├── layout/                   # App shell
│   │   ├── stores/layout-store.ts  # Zustand store (sidebar state)
│   │   └── components/
│   │       ├── app-shell.tsx     # Header + Sidebar + Content
│   │       ├── header.tsx        # Logo, page title, user menu
│   │       └── sidebar.tsx       # Nav items + session list
│   ├── sessions/                 # Session management
│   │   ├── types.ts
│   │   ├── api/sessions.ts        # Fetch wrappers
│   │   ├── hooks/use-sessions.ts  # TanStack Query hooks
│   │   └── components/
│   │       ├── session-card.tsx   # Inline rename, archive, delete
│   │       ├── session-list.tsx   # Infinite scroll list
│   │       ├── session-view.tsx   # Full session with messages
│   │       └── new-session-dialog.tsx
│   └── profile/                  # Profile management
│       ├── api/profile.ts
│       ├── hooks/use-profile.ts
│       └── components/profile-form.tsx  # 4-section settings form
│
├── hooks/
│   └── use-current-user.ts       # Client-side CurrentUser hook
│
├── lib/                          # Infrastructure layer
│   ├── auth/                     # Auth + ownership system
│   │   ├── types.ts              # CurrentUser interface
│   │   ├── session.ts            # getServerSession, requireAuth (cached)
│   │   ├── current-user.ts       # getCurrentUser with profile status
│   │   ├── ownership.ts          # ownedFilter, requireOwnership, assertOwnership
│   │   └── guards.ts             # withAuth / withOptionalAuth wrappers
│   ├── api-client.ts             # Typed fetch wrapper
│   ├── dal.ts                    # Legacy DAL (delegates to auth/)
│   ├── db.ts                     # Mongoose cached singleton connection
│   ├── errors.ts                 # AppError hierarchy
│   ├── logger.ts                 # Level-based structured logging
│   ├── audit.ts                  # Audit log service
│   └── rate-limit.ts             # In-memory sliding window
│
├── models/                       # Mongoose schemas
│   ├── user.ts
│   ├── profile.ts
│   ├── email-template.ts
│   ├── audit-log.ts
│   ├── session.ts                # title, category, userId, isArchived, isDeleted
│   └── message.ts                # sessionId, role, content, modelUsed
│
├── modules/                      # Backend services
│   ├── ai/                       # AI provider (strategy pattern)
│   │   ├── types.ts
│   │   ├── provider.ts           # BaseAIProvider with ToT/DCE prompt
│   │   ├── providers/nvidia.ts   # NVIDIA NIM via OpenAI SDK
│   │   └── factory.ts
│   ├── email/                    # Email generation
│   │   ├── validation.ts
│   │   └── service.ts            # Orchestrates AI + persistence + messages
│   ├── profile/                  # Profile CRUD
│   │   ├── types.ts
│   │   ├── validation.ts
│   │   ├── service.ts            # Uses ownedFilter() guards
│   │   └── context-builder.ts
│   ├── session/                  # Session CRUD
│   │   ├── types.ts
│   │   ├── validation.ts
│   │   ├── service.ts            # Paginated, searchable, archived filter
│   │   └── ai-context.ts         # Build conversation history for AI
│   └── message/                  # Message CRUD
│       └── service.ts
│
├── config/
│   └── index.ts                  # Zod-validated env config singleton
├── types/
│   └── next-auth.d.ts            # Session type augmentation
├── utils/
│   ├── api-response.ts           # success() / created() / failure()
│   └── validation.ts             # validate() wrapper
└── auth.ts                       # NextAuth v5 config (JWT + credentials)
```

---

## Setup

### Prerequisites

- Node.js 22+
- MongoDB Atlas cluster (or local MongoDB)
- NVIDIA NIM API key

### Installation

```bash
npm install
```

### Environment Variables

Copy `.env.local.example` to `.env.local` and fill in:

| Variable | Description |
|---|---|
| `MONGODB_URI` | MongoDB connection string |
| `NVIDIA_API_KEY` | NVIDIA NIM API key |
| `NVIDIA_BASE_URL` | NVIDIA API base URL |
| `AUTH_SECRET` | NextAuth secret (generate with `openssl rand -base64 32`) |
| `NODE_ENV` | `development`, `production`, or `test` |
| `NEXT_PUBLIC_APP_URL` | Public app URL |

### Run

```bash
npm run dev       # Development server on :3000
npm run build     # Production build
npm start         # Production server
```

---

## Route Structure

| Path | Auth | Layout | Description |
|---|---|---|---|
| `/` | Required | AppShell + AuthGuard | Compose email |
| `/dashboard` | Required | AppShell + AuthGuard | Workspace home |
| `/sessions` | Required | AppShell + AuthGuard | Session history (paginated) |
| `/sessions/:id` | Required | AppShell + AuthGuard | Session detail + messages |
| `/settings` | Required | AppShell + AuthGuard | Profile management |
| `/login` | Public | Centered card | Sign in |
| `/register` | Public | Centered card | Create account |
| `/auth/error` | Public | Minimal | Auth error display |

The `(app)` route group applies a unified `AuthGuard` + `AppShell` layout to all authenticated pages, providing persistent header, sidebar, and session context.

---

## API Reference

### `POST /api/generate`

Generate an email with optional session persistence.

**Request Body:**

```json
{
  "prompt": "Write a leave request email for 3 days off",
  "category": "leave_request",
  "modelId": "deepseek",
  "sessionId": "665a1b2c..." (optional)
}
```

**Response (201):**

```json
{
  "success": true,
  "data": {
    "content": "Subject: Leave Request\n\nDear [Manager's Name],...",
    "modelUsed": "deepseek-ai/deepseek-v4-flash",
    "id": "template-id",
    "sessionId": "session-id" (if sessionId was provided)
  }
}
```

When `sessionId` is provided, the prompt and response are saved as messages in the session, and previous conversation history is injected into the AI context.

### `POST /api/sessions`

Create a new session.

```json
{ "title": "Leave Request for Tomorrow", "category": "leave_request" }
```

### `GET /api/sessions`

List sessions with pagination, search, and archive filtering.

| Query | Type | Default | Description |
|---|---|---|---|
| `page` | int | 1 | Page number |
| `pageSize` | int | 20 | Items per page (max 100) |
| `search` | string | — | Filter by title |
| `isArchived` | bool | — | Filter archived state |

### `GET /api/sessions/:id`

Get session with all messages.

### `PATCH /api/sessions/:id`

Rename session.

```json
{ "title": "Updated Title" }
```

### `DELETE /api/sessions/:id`

Soft delete (sets `isDeleted: true`).

### `PATCH /api/sessions/:id/archive`

Toggle archive.

```json
{ "archived": true }
```

### `GET /api/sessions/:id/messages`

Get paginated messages for a session.

| Query | Type | Default | Description |
|---|---|---|---|
| `page` | int | 1 | Page number |
| `pageSize` | int | 50 | Items per page (max 100) |

### `GET /api/profile`

Get current user's profile.

### `PATCH /api/profile`

Update profile sections.

```json
{
  "personal": { "fullName": "John Doe", "phone": "...", "location": "..." },
  "professional": { "designation": "...", "organization": "..." },
  "preferences": { "formalityLevel": "formal", "preferredTone": "professional" },
  "jobApplication": { "resumeUrl": "...", "linkedIn": "...", "portfolio": "..." }
}
```

### `GET /api/auth/me`

Get enriched current user (`CurrentUser` with `onboardingCompleted` + `profileCompleted`).

### Error Codes

| Code | Status | Meaning |
|---|---|---|
| `VALIDATION_ERROR` | 400 | Input validation failed |
| `UNAUTHORIZED` | 401 | Authentication required |
| `NOT_FOUND` | 404 | Resource not found |
| `RATE_LIMIT` | 429 | Too many requests |
| `AI_PROVIDER_ERROR` | 502 | AI API error |
| `INTERNAL_ERROR` | 500 | Unexpected error |

---

## Frontend Architecture

### Global State

- **Auth**: NextAuth v5 with JWT — `useSession()` for client, `auth()` for server
- **CurrentUser**: `useCurrentUser()` hook — enriches session with profile status via `/api/auth/me`
- **Layout**: Zustand store — sidebar open/close, mobile state, active view
- **Server data**: TanStack Query — caching, revalidation, optimistic updates, infinite scroll

### AppShell Layout

```
┌──────────────────────────────────────────────────┐
│ Header                                            │
│ [☰] AutoCompose / PageTitle    [UserAvatar Name] │
├──────────┬───────────────────────────────────────┤
│ Sidebar  │ Content Area                           │
│          │                                        │
│ ▦ Dashboard │  ┌─────────────────────────────┐   │
│ ✎ Compose   │  │  Page-specific content      │   │
│ ☰ History   │  │                             │   │
│ ⚙ Settings  │  └─────────────────────────────┘   │
│ ────────    │                                    │
│ SESSIONS    │                                    │
│ [+]         │                                    │
│ ┌────────┐  │                                    │
│ │ Card 1  │  │                                    │
│ │ Card 2  │  │                                    │
│ │ Card 3  │  │                                    │
└──────────┴───────────────────────────────────────┘
```

- **Responsive**: Sidebar collapses to flyout on mobile (< 768px)
- **Persistent**: Sidebar state preserved across navigation
- **Infinite scroll**: Session list loads more on scroll via `useInfiniteQuery`

### Session Management

| Feature | Implementation |
|---|---|
| Create | `NewSessionDialog` → `useCreateSession` mutation |
| List | `useInfiniteSessions` with infinite scroll |
| Rename | Inline input on `SessionCard` → `useUpdateSession` |
| Archive | `useToggleArchive` mutation |
| Delete | `useDeleteSession` mutation (soft delete) |
| Messages | `SessionView` loads via `useSession(id)` |
| AI Context | `getMessageHistory()` builds conversation for AI |

### Profile Management

| Section | Fields |
|---|---|
| Personal | Full Name, Phone, Location |
| Professional | Designation, Department, Organization, College, Degree |
| Writing Preferences | Formality Level, Preferred Tone, Signature, Language |
| Job Application | Resume URL, LinkedIn, Portfolio |

Each section has independent dirty-state detection and save button. Uses TanStack Query for fetch + mutation with automatic cache invalidation.

---

## Auth & Ownership System

### Multi-Tenant Isolation

Every document has a `userId` field. All queries use `ownedFilter(userId)` which auto-injects `{ userId }` into the MongoDB filter. This prevents any data leakage between users.

### Enforcement Chain

```
API Route → requireAuth() → returns CurrentUser
  → Service receives userId
    → ownedFilter(userId) applied to query
      → MongoDB returns only owned documents
```

### Key Files

| File | Purpose |
|---|---|
| `lib/auth/types.ts` | `CurrentUser` interface |
| `lib/auth/session.ts` | `getServerSession()`, `requireAuth()` (cached) |
| `lib/auth/current-user.ts` | `getCurrentUser()` with profile status |
| `lib/auth/ownership.ts` | `ownedFilter()`, `requireOwnership()`, `assertOwnership()` |
| `lib/auth/guards.ts` | `withAuth()` API route wrapper |

---

## Database Models

### Session

| Field | Type | Description |
|---|---|---|
| `title` | string | Session display name |
| `category` | enum | Email category |
| `userId` | string (indexed) | Owner |
| `metadata` | Mixed | Extensible data |
| `isArchived` | boolean | Archive flag |
| `isDeleted` | boolean | Soft delete flag |
| `deletedAt` | Date | When soft-deleted |

Indexes: `{ userId: 1, isDeleted: 1, createdAt: -1 }`, text index on `title`.

### Message

| Field | Type | Description |
|---|---|---|
| `sessionId` | ObjectId (ref Session) | Parent session |
| `role` | "user" \| "assistant" | Message author |
| `content` | string | Message body |
| `modelUsed` | string | AI model (assistant only) |
| `metadata` | Mixed | Extensible data |

Index: `{ sessionId: 1, createdAt: 1 }`.

### Profile

| Field | Type | Description |
|---|---|---|
| `userId` | string (unique) | Owner |
| `personal` | subdoc | Name, phone, location |
| `professional` | subdoc | Designation, org, education |
| `preferences` | subdoc | Tone, formality, signature, language |
| `jobApplication` | subdoc | Resume, LinkedIn, portfolio URLs |

### EmailTemplate

| Field | Type | Description |
|---|---|---|
| `category` | enum | Email category |
| `prompt` | string | Original prompt |
| `generatedEmail` | string | AI response |
| `modelUsed` | string | Model ID |
| `userId` | string | Owner |
| `metadata` | Mixed | Extra data |

### AuditLog

| Field | Type | Description |
|---|---|---|
| `action` | enum | Event type |
| `entityType` | string | Related model |
| `entityId` | string | Related record |
| `userId` | string | Who performed action |
| `metadata` | Mixed | Context |
| `ip` / `userAgent` | string | Request info |

---

## AI Provider System

Strategy pattern with abstract base class:

```
AIProvider (interface)
  └── BaseAIProvider (abstract)
        └── NvidiaNIMProvider
```

Uses OpenAI SDK to call NVIDIA NIM API. Supports conversation history injection for session continuation.

### Models

| ID | Label | NVIDIA Model ID |
|---|---|---|
| `deepseek` | DeepSeek V4 Flash | `deepseek-ai/deepseek-v4-flash` |
| `nemotron` | Nemotron Super 49B | `nvidia/llama-3.3-nemotron-super-49b-v1.5` |

### Prompt Engineering

The system prompt embeds Tree of Thought + DCE reasoning:
1. **DIVERGE** — Consider 3 different approaches (tone, structure, strategy)
2. **CONVERGE** — Select the best approach based on context
3. **EVALUATE** — Verify the email achieves its goal effectively

---

## UI Design System

Based on Neubrutalist design specification in `skills/ui-skill.md`.

### Visual Tokens

| Token | Value |
|---|---|
| Border | `3px solid #000` |
| Shadow | `6px 6px 0 #000` |
| Radius | `8px` |
| Font | `Space Grotesk` |
| Primary | `#ffd700` (Yellow) |
| Error | `#ff4d6d` (Pink) |
| Success | `#06d6a0` (Green) |
| Surface | `#f8f9fa` |
| Background | `#e8e6e1` |

### Component States

Every interactive component implements:
- **Default** — Strong border, hard shadow, flat color
- **Hover** — Shadow expands, element shifts `-2px, -2px`
- **Active/Pressed** — Shadow collapses, element shifts `4px, 4px`
- **Focus** — `4px solid yellow` outline
- **Disabled** — 50% opacity, no-pointer

### UI Primitives (src/components/ui/)

| Component | Props |
|---|---|
| `Button` | `variant` (primary/secondary/danger/ghost), `loading` |
| `Input` | `label`, `error`, standard input attrs |
| `Select` | `label`, `error`, `options: { value, label }[]` |
| `Card` | `hover` (adds interactive shadow), `CardHeader/CardBody/CardFooter` |
| `Skeleton` | `width`, `height`, `SkeletonCard`, `SkeletonList` |
| `EmptyState` | `icon`, `title`, `description`, `action` |

---

## Extending

### Adding an Email Category

1. Add to `z.enum([...])` in `src/modules/email/validation.ts`
2. Update `EmailCategory` type in `src/models/email-template.ts`
3. Update category enum in `src/models/session.ts`

### Adding an AI Model

1. Add to `MODEL_IDS` and `MODEL_LABELS` in `src/modules/ai/types.ts`
2. Update `modelIdSchema` in the same file

### Adding a Protected API Route

```typescript
import { requireAuth } from "@/lib/auth/session";
import { ownedFilter } from "@/lib/auth/ownership";

export async function GET() {
  const user = await requireAuth();
  const data = await Model.find(ownedFilter(user.userId));
  return success(data);
}
```

### Adding a Protected Frontend Page

1. Create page file inside `src/app/(app)/` (inherits AuthGuard + AppShell)
2. Use `useCurrentUser()` hook for client-side user access
3. Use `useQuery` / `useMutation` from TanStack Query for data fetching

### New Mongoose Model with Ownership

```typescript
const schema = new Schema({
  userId: { type: String, required: true, index: true },
  // ... other fields
});
```

Every query against this model must use `ownedFilter(userId)`.
