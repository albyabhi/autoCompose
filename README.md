# AutoCompose

AI-powered professional email composition tool built with Next.js 16 App Router, MongoDB, NVIDIA NIM, and a Telegram bot integration.

## Features

- **AI Email Generation** — Generate professional emails across 7 categories (job application, leave request, sick leave, resignation, complaint, meeting request, custom) using 8 AI models via NVIDIA NIM
- **Email Sending** — Send generated emails directly through your Gmail account via SMTP (App Password authentication)
- **Resume Parsing** — Upload PDF/DOCX/TXT resumes and extract structured data (skills, education, experience, projects) using AI
- **Session Management** — Track email generation sessions with conversation history for iterative refinement
- **Telegram Bot** — Generate and send emails entirely through Telegram with inline keyboards
- **User Profiles** — Manage personal info, professional details, writing preferences, and job application links

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript |
| Database | MongoDB (Mongoose 9) |
| Auth | NextAuth.js v5 (JWT + Credentials) |
| AI | NVIDIA NIM API (OpenAI SDK) |
| Telegram | grammY Bot Framework |
| State | Zustand, TanStack React Query |
| Validation | Zod |
| Styling | Neubrutalist CSS |
| Testing | Vitest |

## Getting Started

### Prerequisites

- Node.js 22+
- MongoDB Atlas cluster (or local MongoDB)
- NVIDIA NIM API key

### Installation

```bash
git clone <repository-url>
cd AutoCompose
npm install
```

### Environment Variables

Copy `.env.local.example` to `.env.local` and fill in:

```bash
cp .env.local.example .env.local
```

| Variable | Required | Description |
|---|---|---|
| `MONGODB_URI` | Yes | MongoDB connection string |
| `NVIDIA_API_KEY` | Yes | NVIDIA NIM API key |
| `NVIDIA_BASE_URL` | Yes | NVIDIA API base URL |
| `AUTH_SECRET` | Yes | NextAuth secret (generate with `openssl rand -base64 32`) |
| `AUTH_URL` | No | Auth URL (defaults to `http://localhost:3000`) |
| `NODE_ENV` | No | `development`, `production`, or `test` (default: `development`) |
| `NEXT_PUBLIC_APP_URL` | No | Public app URL (defaults to `http://localhost:3000`) |
| `TELEGRAM_BOT_TOKEN` | No | Telegram bot token from BotFather |
| `TELEGRAM_BOT_USERNAME` | No | Telegram bot username (without @) |
| `TELEGRAM_WEBHOOK_SECRET` | No | Telegram webhook secret (generate with `openssl rand -hex 32`) |

### Run

```bash
npm run dev       # Development server on http://localhost:3000
npm run build     # Production build
npm start         # Production server
npm run lint      # Run ESLint
npm run test      # Run Vitest tests
```

## Project Structure

```
src/
├── app/                    # Next.js App Router
│   ├── (app)/              # Authenticated pages (with AppShell)
│   ├── api/                # API routes
│   ├── auth/               # Auth error pages
│   ├── login/              # Login page
│   └── register/           # Registration page
├── components/             # Shared React components
│   ├── auth/               # Auth-related components
│   ├── settings/           # Settings page components
│   └── ui/                 # Reusable UI primitives
├── features/               # Feature-based modules
│   ├── layout/             # App shell (header, sidebar)
│   ├── profile/            # Profile management
│   └── sessions/           # Session management
├── hooks/                  # Custom React hooks
├── lib/                    # Infrastructure layer
│   ├── auth/               # Auth + ownership system
│   └── ...                 # DB, errors, logger, crypto, etc.
├── models/                 # Mongoose schemas
├── modules/                # Backend business logic
│   ├── ai/                 # AI provider (strategy pattern)
│   ├── email/              # Email generation + sending
│   ├── message/            # Message CRUD
│   ├── profile/            # Profile management
│   ├── resume/             # Resume parsing
│   ├── session/            # Session management
│   └── telegram/           # Telegram bot
├── types/                  # TypeScript declarations
└── utils/                  # Utility functions
```

## API Endpoints

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `POST` | `/api/generate` | Required | Generate AI email |
| `POST` | `/api/send-email` | Required | Send email via Gmail SMTP |
| `GET` | `/api/profile` | Required | Get user profile |
| `PATCH` | `/api/profile` | Required | Update user profile |
| `POST` | `/api/profile/resume` | Required | Upload and parse resume |
| `GET` | `/api/profile/resume` | Required | Get parsed resume |
| `DELETE` | `/api/profile/resume` | Required | Delete resume |
| `POST` | `/api/sessions` | Required | Create session |
| `GET` | `/api/sessions` | Required | List sessions (paginated) |
| `GET` | `/api/sessions/:id` | Required | Get session with messages |
| `PATCH` | `/api/sessions/:id` | Required | Update session |
| `DELETE` | `/api/sessions/:id` | Required | Soft-delete session |
| `PATCH` | `/api/sessions/:id/archive` | Required | Toggle archive |
| `GET` | `/api/sessions/:id/messages` | Required | Get paginated messages |
| `POST` | `/api/auth/register` | Public | Register new account |
| `GET` | `/api/auth/me` | Required | Get current user |
| `POST` | `/api/telegram/login-code` | Required | Generate login code |
| `DELETE` | `/api/telegram/login-code` | Required | Revoke login code |
| `DELETE` | `/api/telegram/link` | Required | Unlink Telegram |
| `GET` | `/api/telegram/status` | Required | Get Telegram status |
| `POST` | `/api/telegram/webhook` | Public | Telegram webhook |
| `GET` | `/api/telegram/health` | Public | Telegram health check |

## AI Models

| ID | Label | Description |
|---|---|---|
| `deepseek` | DeepSeek V4 Flash | Fast general-purpose drafting (default) |
| `nemotron` | Nemotron Super 49B | NVIDIA reasoning model |
| `gptOss` | GPT-OSS 20B | OpenAI open-weight reasoning |
| `mistralSmall` | Mistral Small 4 (119B) | Hybrid instruct + reasoning, 256K context |
| `llamaMaverick` | Llama 4 Maverick 17B | Meta multimodal MoE, 1M context |
| `minimaxM27` | MiniMax M2.7 | Code/agent-tuned MoE |
| `llamaNemotronNano` | Llama Nemotron Nano 8B VL | NVIDIA lightweight multimodal |
| `nemotron3Ultra` | Nemotron 3 Ultra 550B | NVIDIA flagship reasoning, 550B params |

## Code Documentation

Every source file has a standardized comment block at the **bottom of the file** explaining its purpose, how it works, and key integrations. See [Documentation.md](./Documentation.md) for the full convention and examples.

## Learn More

- [Next.js Documentation](https://nextjs.org/docs)
- [NVIDIA NIM API](https://docs.nvidia.com/nim/)
- [grammY Bot Framework](https://grammy.dev/)
- [Full Documentation](./Documentation.md)
