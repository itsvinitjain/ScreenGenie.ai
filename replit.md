# ScreenGenie.ai

## Overview

AI-driven interview screening platform for HR teams. pnpm workspace monorepo using TypeScript.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **Frontend**: React + Vite, TailwindCSS, Shadcn UI, Lucide React icons
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **AI**: OpenAI SDK (GPT-4o streaming, TTS, evaluation)
- **Build**: esbuild (CJS bundle)
- **Charts**: Recharts
- **Animations**: Framer Motion

## Structure

```text
artifacts-monorepo/
├── artifacts/
│   ├── api-server/         # Express API server
│   └── screengenie/        # React + Vite frontend (ScreenGenie.ai)
├── lib/
│   ├── api-spec/           # OpenAPI spec + Orval codegen config
│   ├── api-client-react/   # Generated React Query hooks
│   ├── api-zod/            # Generated Zod schemas from OpenAPI
│   └── db/                 # Drizzle ORM schema + DB connection
├── scripts/                # Utility scripts
├── pnpm-workspace.yaml
├── tsconfig.base.json
├── tsconfig.json
└── package.json
```

## Database Schema

- **users** - HR users (id, email, name, company, created_at)
- **jobs** - Job postings (id, hr_id FK->users, title, description, skills, status, created_at)
- **candidates** - Job candidates (id, job_id FK->jobs, name, email, phone, status, score, resume_url, created_at)
- **interviews** - Interview records (id, candidate_id FK->candidates, scheduled_at, status, attempts, transcript, feedback, voice_gender, experience_level, questions, duration_minutes, coding_enabled, created_at)
- **sessions** - AI interview sessions (id, interview_id FK->interviews CASCADE, candidate_name, status, current_strictness, questions_asked, overall_score, feedback, started_at, ended_at, tab_switch_count, focus_lost_count, id_verified, id_verification_data, proctoring_flags, created_at)
- **session_messages** - Interview conversation messages (id, session_id FK->sessions CASCADE, role, content, question_number, time_allotted, created_at)

### Status Enums
- Job status: OPEN, CLOSED, DRAFT
- Candidate status: PENDING, INVITED, SCHEDULED, INTERVIEWED, HIRED, REJECTED
- Interview status: SCHEDULED, IN_PROGRESS, COMPLETED, CANCELLED

## API Endpoints

All routes are under `/api`:
- `GET /api/healthz` - Health check
- `GET /api/dashboard/stats` - Dashboard statistics
- `GET/POST /api/users` - User CRUD
- `GET/PUT /api/users/:id`
- `GET/POST /api/jobs` - Job CRUD
- `GET/PUT/DELETE /api/jobs/:id`
- `POST /api/jobs/:id/trigger-invites` - Batch update PENDING candidates to INVITED, mock email logs
- `POST /api/jobs/:id/evaluate` - Run AI evaluation on INTERVIEWED candidates (random scores, mock feedback/transcript)
- `GET /api/jobs/:id/results` - Get candidates with interview data (LATERAL join for latest interview)
- `GET/POST /api/candidates` - Candidate CRUD (supports `?jobId=` filter)
- `GET/PUT /api/candidates/:id`
- `POST /api/candidates/bulk` - Bulk import candidates from CSV
- `GET /api/schedule/:candidateId` - Get candidate + job info for scheduling page
- `POST /api/schedule/:candidateId` - Submit interview schedule (idempotent — updates existing interview if present)
- `GET/POST /api/interviews` - Interview CRUD (supports `?candidateId=` filter)
- `GET/PUT /api/interviews/:id`
- `POST /api/interviews/:id/start` - Increment attempts + set IN_PROGRESS (403 if attempts >= 2)
- `POST /api/interviews/:id/end` - Mark COMPLETED + set candidate to INTERVIEWED
- `POST /api/sessions` - Create AI interview session (body: interviewId, candidateName)
- `GET /api/sessions/:id` - Get session with interview, messages, timing info
- `POST /api/sessions/:id/next-question` - Stream next AI interviewer question (SSE)
- `POST /api/sessions/:id/message` - Submit candidate message + stream AI response (SSE)
- `POST /api/sessions/:id/speak` - Text-to-speech for AI interviewer voice
- `POST /api/sessions/:id/transcribe` - Transcribe candidate audio (Whisper)
- `POST /api/sessions/:id/proctor-event` - Record proctoring events (tab switch, focus lost, etc.)
- `POST /api/sessions/:id/code-submission` - Submit and analyze code during coding phase
- `POST /api/sessions/:id/end` - End session, generate 9-dimension AI evaluation, update candidate/interview
- `POST /api/code/execute` - Execute code via Wandbox sandbox (supports 20 languages: JS, TS, Python, Java, C/C++, Go, Rust, Ruby, PHP, Swift, Kotlin, Scala, Perl, R, Haskell, Lua, Bash, SQL, C#)

## Frontend Pages

- **Dashboard** (`/`) - Overview with stat cards, applicant chart, quick actions
- **Jobs** (`/jobs`) - Job listings table with search, create/edit
- **New Job** (`/jobs/new`) - Job creation form
- **Job Detail** (`/jobs/:jobId`) - Job info card with Pipeline tab (CSV uploader, candidate table, "Trigger Interview Invites") and Results tab (AI evaluation, ranked leaderboard, "View Report" modal with score/feedback/transcript)
- **Candidates** (`/candidates`) - Candidate table with status badges, scores, job filter
- **Schedule** (`/schedule/:candidateId`) - Public scheduling page for candidates with date/time picker + AI Interview Settings (experience level, duration, voice gender, coding toggle, custom questions)
- **Interview Room** (`/interview/:interviewId`) - Full AI interview: Tech Check Lobby (camera/mic/screen share) → 5s prestart countdown → Active interview (JarvisOrb/InterviewerAvatar, SSE streaming, TTS/STT, CameraProctor, StrictnessMeter, resizable CodeEditor split pane, timer with auto-end) → Thank You with AI evaluation (score/verdict/feedback). Locked state when attempts >= 2
- **Settings** (`/settings`) - User profile/company settings form

## Mock Email Utility

`artifacts/api-server/src/lib/email.ts` — logs to console: `Sending email to [email] with link: /schedule/[candidateId]`

## Dev Proxy

The Vite dev server proxies `/api` requests to `http://localhost:8080` (Express API server). This is configured in `artifacts/screengenie/vite.config.ts` under `server.proxy`. Both the generated API client (`@workspace/api-client-react`) and custom fetch calls in hooks use relative `/api/...` paths that rely on this proxy.

## Key Commands

- `pnpm run typecheck` - Full typecheck
- `pnpm --filter @workspace/api-spec run codegen` - Regenerate API client/schemas
- `pnpm --filter @workspace/db run push` - Push DB schema changes
- `pnpm --filter @workspace/screengenie run dev` - Run frontend dev server
- `pnpm --filter @workspace/api-server run dev` - Run API server

## TypeScript & Composite Projects

Every package extends `tsconfig.base.json` which sets `composite: true`. The root `tsconfig.json` lists all packages as project references.

- **Always typecheck from the root** — run `pnpm run typecheck`
- **`emitDeclarationOnly`** — only emit `.d.ts` files during typecheck
- **Project references** — when package A depends on package B, A's `tsconfig.json` must list B in its `references` array

## Packages

### `artifacts/screengenie` (`@workspace/screengenie`)
React + Vite frontend for ScreenGenie.ai. Uses Shadcn UI components, Lucide React icons, Recharts, and Framer Motion.

### `artifacts/api-server` (`@workspace/api-server`)
Express 5 API server with routes for users, jobs, candidates, interviews, and dashboard stats. Includes OpenAI-powered AI interview lib (interviewAI.ts, audio.ts, openai.ts).

### `lib/db` (`@workspace/db`)
Database layer with Drizzle ORM. Schema files: users.ts, jobs.ts, candidates.ts, interviews.ts, sessions.ts, sessionMessages.ts.

### `lib/api-spec` (`@workspace/api-spec`)
OpenAPI 3.1 spec and Orval codegen config.

### `lib/api-zod` (`@workspace/api-zod`)
Generated Zod schemas from OpenAPI spec.

### `lib/api-client-react` (`@workspace/api-client-react`)
Generated React Query hooks from OpenAPI spec.
