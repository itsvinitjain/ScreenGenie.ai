# ScreenGenie.ai — Complete Project Manifest

## 1. Project Overview

**ScreenGenie.ai** is an AI-driven HR interview screening SaaS platform built as a pnpm monorepo. It enables HR managers to create job postings, import candidates via CSV, send interview invitations, conduct live proctored video interviews, and evaluate candidates with AI-generated scoring and feedback.

**Tech Stack:**
- **Frontend:** React 18 + Vite + TypeScript + Tailwind CSS + Shadcn UI + Wouter (routing) + TanStack React Query
- **Backend:** Express 5 + TypeScript
- **Database:** PostgreSQL + Drizzle ORM
- **API Contract:** OpenAPI 3.1.0 → Orval codegen → Zod schemas + React Query hooks
- **UI Libraries:** Lucide React (icons), Framer Motion (animations), Recharts (charts)
- **Monorepo:** pnpm workspaces with shared libraries

---

## 2. Complete File Tree

```
ScreenGenie_MVP/
├── package.json                          # Root workspace config
├── pnpm-workspace.yaml                   # pnpm workspace declaration
├── tsconfig.base.json                    # Shared TypeScript config
├── tsconfig.json                         # Root TypeScript references
├── .npmrc                                # pnpm settings
├── .replit                               # Replit run configuration
├── .replitignore                         # Replit ignore patterns
├── .gitignore
├── replit.md                             # Project documentation
│
├── artifacts/
│   ├── api-server/                       # ── EXPRESS 5 BACKEND ──
│   │   ├── package.json
│   │   ├── build.ts                      # esbuild bundler config
│   │   ├── tsconfig.json
│   │   ├── .replit-artifact/
│   │   │   └── artifact.toml             # Replit artifact config
│   │   └── src/
│   │       ├── index.ts                  # Server entry point (PORT binding)
│   │       ├── app.ts                    # Express app setup (CORS, JSON, router mount)
│   │       ├── lib/
│   │       │   └── email.ts              # Mock email sender utility
│   │       ├── middlewares/
│   │       │   └── .gitkeep
│   │       └── routes/
│   │           ├── index.ts              # Central router aggregator
│   │           ├── health.ts             # GET /api/health
│   │           ├── users.ts              # GET/POST /api/users, GET/PUT /api/users/:id
│   │           ├── jobs.ts               # Full job CRUD + evaluate + results
│   │           ├── candidates.ts         # Candidate CRUD + bulk CSV import
│   │           ├── interviews.ts         # Interview CRUD + start/end lifecycle
│   │           ├── schedule.ts           # Public scheduling endpoints
│   │           └── dashboard.ts          # GET /api/dashboard/stats
│   │
│   └── screengenie/                      # ── REACT + VITE FRONTEND ──
│       ├── package.json
│       ├── index.html                    # Vite HTML entry
│       ├── vite.config.ts                # Vite config (proxy, base path)
│       ├── components.json               # Shadcn UI config
│       ├── tsconfig.json
│       ├── requirements.yaml             # Feature requirements
│       ├── .replit-artifact/
│       │   └── artifact.toml
│       ├── public/
│       │   ├── favicon.svg
│       │   └── opengraph.jpg
│       └── src/
│           ├── main.tsx                  # React DOM entry
│           ├── App.tsx                   # Router + providers setup
│           ├── index.css                 # Tailwind + global styles
│           ├── lib/
│           │   └── utils.ts              # cn() utility
│           ├── hooks/
│           │   ├── use-mobile.tsx         # Responsive breakpoint hook
│           │   └── use-toast.ts           # Toast notification hook
│           ├── components/
│           │   ├── layout/
│           │   │   ├── AppLayout.tsx      # Sidebar + main content layout
│           │   │   └── Sidebar.tsx        # Navigation sidebar
│           │   └── ui/                   # ~50 Shadcn UI components
│           │       ├── button.tsx
│           │       ├── card.tsx
│           │       ├── dialog.tsx
│           │       ├── table.tsx
│           │       ├── calendar.tsx
│           │       ├── progress.tsx
│           │       ├── badge.tsx
│           │       ├── toast.tsx
│           │       ├── toaster.tsx
│           │       ├── modal.tsx
│           │       └── ... (40+ more)
│           └── pages/
│               ├── Dashboard.tsx          # HR dashboard with stats + charts
│               ├── Jobs.tsx               # Job listings table
│               ├── NewJob.tsx             # Create job form
│               ├── JobDetail.tsx          # Job detail + Pipeline/Results tabs
│               ├── JobResults.tsx         # AI evaluation leaderboard + report modal
│               ├── Candidates.tsx         # All candidates table
│               ├── Schedule.tsx           # Public candidate scheduling page
│               ├── InterviewRoom.tsx      # Full interview room (lobby → active → end)
│               ├── Settings.tsx           # User/company settings
│               └── not-found.tsx          # 404 page
│
├── lib/
│   ├── api-spec/                         # ── OPENAPI SPECIFICATION ──
│   │   ├── package.json
│   │   ├── orval.config.ts               # Orval codegen config
│   │   └── openapi.yaml                  # OpenAPI 3.1.0 spec (source of truth)
│   │
│   ├── api-client-react/                 # ── GENERATED REACT QUERY CLIENT ──
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   ├── src/
│   │   │   ├── index.ts                  # Re-exports
│   │   │   ├── custom-fetch.ts           # Custom fetch with base URL
│   │   │   └── generated/
│   │   │       ├── api.ts                # Generated React Query hooks
│   │   │       └── api.schemas.ts        # Generated TypeScript types
│   │   └── dist/                         # Compiled output
│   │
│   ├── api-zod/                          # ── GENERATED ZOD VALIDATORS ──
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   ├── src/
│   │   │   ├── index.ts
│   │   │   └── generated/
│   │   │       ├── api.ts                # Generated Zod schemas
│   │   │       └── types/                # Individual type modules
│   │   │           ├── index.ts
│   │   │           ├── candidate.ts
│   │   │           ├── job.ts
│   │   │           ├── interview.ts
│   │   │           ├── user.ts
│   │   │           ├── evaluatedCandidate.ts
│   │   │           ├── evaluationResponse.ts
│   │   │           ├── scheduleInfo.ts
│   │   │           ├── submitScheduleBody.ts
│   │   │           ├── triggerInvitesResponse.ts
│   │   │           └── ... (15+ more)
│   │   └── dist/                         # Compiled output
│   │
│   └── db/                               # ── DATABASE LAYER ──
│       ├── package.json
│       ├── drizzle.config.ts             # Drizzle Kit config
│       ├── tsconfig.json
│       ├── src/
│       │   ├── index.ts                  # DB connection + Drizzle instance export
│       │   └── schema/
│       │       ├── index.ts              # Schema barrel export
│       │       ├── users.ts              # Users table
│       │       ├── jobs.ts               # Jobs table
│       │       ├── candidates.ts         # Candidates table
│       │       └── interviews.ts         # Interviews table
│       └── dist/                         # Compiled output
│
└── scripts/
    ├── package.json
    ├── tsconfig.json
    ├── post-merge.sh                     # Post-merge environment reconciliation
    └── src/
        └── hello.ts
```

---

## 3. Database Schema (Drizzle ORM)

### users
```typescript
export const usersTable = pgTable("users", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
  company: text("company").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
```

### jobs
```typescript
export const jobsTable = pgTable("jobs", {
  id: serial("id").primaryKey(),
  hrId: integer("hr_id").notNull().references(() => usersTable.id),
  title: text("title").notNull(),
  description: text("description").notNull(),
  skills: text("skills").notNull(),        // Comma-separated skill tags
  status: text("status").notNull().default("OPEN"),  // OPEN | CLOSED
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
```

### candidates
```typescript
export const candidatesTable = pgTable("candidates", {
  id: serial("id").primaryKey(),
  jobId: integer("job_id").notNull().references(() => jobsTable.id),
  name: text("name").notNull(),
  email: text("email").notNull(),
  phone: text("phone"),
  status: text("status").notNull().default("PENDING"),
    // PENDING → INVITED → SCHEDULED → INTERVIEWED → HIRED | REJECTED
  score: integer("score"),                 // AI-assigned 0–100
  resumeUrl: text("resume_url"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
```

### interviews
```typescript
export const interviewsTable = pgTable("interviews", {
  id: serial("id").primaryKey(),
  candidateId: integer("candidate_id").notNull().references(() => candidatesTable.id),
  scheduledAt: timestamp("scheduled_at").notNull(),
  status: text("status").notNull().default("SCHEDULED"),
    // SCHEDULED → IN_PROGRESS → COMPLETED
  attempts: integer("attempts").notNull().default(0),  // Max 2 allowed
  transcript: text("transcript"),          // AI-generated interview transcript
  feedback: text("feedback"),              // AI-generated evaluation feedback
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
```

### Entity Relationships

```
User (HR Manager)
  │
  └──< Job (1:N — one HR user creates many jobs)
        │
        └──< Candidate (1:N — one job has many candidates)
              │
              └──< Interview (1:N — one candidate can have multiple interview attempts)
```

- **User → Job:** `jobs.hr_id` references `users.id`. Each HR manager owns their job postings.
- **Job → Candidate:** `candidates.job_id` references `jobs.id`. Candidates are scoped to a specific job.
- **Candidate → Interview:** `interviews.candidate_id` references `candidates.id`. Each interview attempt is tracked separately. The system enforces a max of 2 attempts via atomic SQL (`WHERE attempts < 2`).

---

## 4. Frontend Routes (Wouter — React SPA)

| Route | Page Component | Description |
|-------|---------------|-------------|
| `/` | `Dashboard.tsx` | HR overview dashboard with stat cards (total jobs, candidates, interviews, hire rate), applicant trend chart (Recharts), and quick-action buttons |
| `/jobs` | `Jobs.tsx` | Searchable job listings table with status badges, candidate counts, creation dates. "New Job" button |
| `/jobs/new` | `NewJob.tsx` | Job creation form with title, description, skills (tag input), auto-assigns to current HR user |
| `/jobs/:jobId` | `JobDetail.tsx` | Job info card + tabbed interface: **Pipeline tab** (CSV uploader, candidate table, "Trigger Interview Invites") and **Results tab** (AI evaluation dashboard) |
| `/candidates` | `Candidates.tsx` | All-candidates table with status badges, scores, job association. Filterable by job |
| `/schedule/:candidateId` | `Schedule.tsx` | Public-facing scheduling page. Candidate picks interview date/time from calendar. Creates interview record |
| `/interview/:interviewId` | `InterviewRoom.tsx` | Full interview experience: Tech Check Lobby → Active Interview → Thank You |
| `/settings` | `Settings.tsx` | User profile and company settings form |
| `*` | `not-found.tsx` | 404 catch-all page |

---

## 5. API Route Breakdown (Express 5)

All routes are prefixed with `/api`.

### Health
| Method | Endpoint | Handler File | Description |
|--------|----------|-------------|-------------|
| `GET` | `/api/health` | `health.ts` | Returns `{ status: "ok", timestamp }` |

### Dashboard
| Method | Endpoint | Handler File | Description |
|--------|----------|-------------|-------------|
| `GET` | `/api/dashboard/stats` | `dashboard.ts` | Returns aggregate stats: total jobs, candidates, interviews, hire rate, monthly trend data |

### Users
| Method | Endpoint | Handler File | Description |
|--------|----------|-------------|-------------|
| `GET` | `/api/users` | `users.ts` | List all users |
| `POST` | `/api/users` | `users.ts` | Create a user (name, email, company) |
| `GET` | `/api/users/:id` | `users.ts` | Get user by ID |
| `PUT` | `/api/users/:id` | `users.ts` | Update user |

### Jobs
| Method | Endpoint | Handler File | Description |
|--------|----------|-------------|-------------|
| `GET` | `/api/jobs` | `jobs.ts` | List all jobs with candidate counts (LEFT JOIN + GROUP BY) |
| `POST` | `/api/jobs` | `jobs.ts` | Create a job |
| `GET` | `/api/jobs/:id` | `jobs.ts` | Get single job with candidate count |
| `PUT` | `/api/jobs/:id` | `jobs.ts` | Update job |
| `DELETE` | `/api/jobs/:id` | `jobs.ts` | Delete job |
| `POST` | `/api/jobs/:id/trigger-invites` | `jobs.ts` | Batch-update all PENDING candidates to INVITED. Logs mock emails via `email.ts` |
| `POST` | `/api/jobs/:id/evaluate` | `jobs.ts` | Run AI evaluation on all INTERVIEWED candidates. Assigns random score (40–98), generates mock feedback + transcript, sets HIRED (>80) or REJECTED (≤80) |
| `GET` | `/api/jobs/:id/results` | `jobs.ts` | Returns all candidates for job with latest interview data. Uses `LEFT JOIN LATERAL` to deduplicate multiple interview attempts per candidate |

### Candidates
| Method | Endpoint | Handler File | Description |
|--------|----------|-------------|-------------|
| `GET` | `/api/candidates` | `candidates.ts` | List candidates (supports `?jobId=` filter) |
| `POST` | `/api/candidates` | `candidates.ts` | Create single candidate |
| `POST` | `/api/candidates/bulk` | `candidates.ts` | Bulk import from CSV (expects `{jobId, candidates: [{name, email, phone}]}`) |
| `GET` | `/api/candidates/:id` | `candidates.ts` | Get candidate by ID |
| `PUT` | `/api/candidates/:id` | `candidates.ts` | Update candidate (status, score, etc.) |

### Schedule (Public)
| Method | Endpoint | Handler File | Description |
|--------|----------|-------------|-------------|
| `GET` | `/api/schedule/:candidateId` | `schedule.ts` | Get candidate + job info for scheduling UI |
| `POST` | `/api/schedule/:candidateId` | `schedule.ts` | Submit chosen date/time. Creates interview record, updates candidate status to SCHEDULED. Idempotent (rejects if already scheduled) |

### Interviews
| Method | Endpoint | Handler File | Description |
|--------|----------|-------------|-------------|
| `GET` | `/api/interviews` | `interviews.ts` | List interviews (supports `?candidateId=` filter) |
| `POST` | `/api/interviews` | `interviews.ts` | Create interview |
| `GET` | `/api/interviews/:id` | `interviews.ts` | Get interview by ID |
| `PUT` | `/api/interviews/:id` | `interviews.ts` | Update interview |
| `POST` | `/api/interviews/:id/start` | `interviews.ts` | Start interview session. Atomic `WHERE attempts < 2` check. Increments attempts, sets status IN_PROGRESS. Returns 403 if locked out |
| `POST` | `/api/interviews/:id/end` | `interviews.ts` | End interview. Sets status COMPLETED, updates candidate to INTERVIEWED |

---

## 6. Key Components

### Layout Components
| Component | File | Description |
|-----------|------|-------------|
| `AppLayout` | `components/layout/AppLayout.tsx` | Main layout wrapper with sidebar + content area. Wraps all authenticated pages |
| `Sidebar` | `components/layout/Sidebar.tsx` | Navigation sidebar with ScreenGenie logo, nav links (Dashboard, Jobs, Candidates, Settings), active route highlighting, user profile footer |

### Page-Level Feature Components

#### Dashboard (`Dashboard.tsx`)
- Stat cards with animated counters (Total Jobs, Candidates, Interviews, Hire Rate)
- Area chart showing applicant trends over time (Recharts)
- Quick action buttons (Create Job, View Candidates)

#### CSV Uploader (inside `JobDetail.tsx`)
- Drag-and-drop zone with visual feedback
- CSV parsing with column validation (Name, Email, Phone required)
- Preview table before import confirmation
- Bulk upload via `POST /api/candidates/bulk`
- Success/error toast notifications

#### Candidate Pipeline Table (inside `JobDetail.tsx`)
- Sortable table with status badges (color-coded: PENDING=gray, INVITED=blue, SCHEDULED=amber, etc.)
- "Trigger Interview Invites" button for batch status update
- Row click navigation to candidate details

#### AI Evaluation Dashboard (`JobResults.tsx`)
- "Run AI Evaluation" button with loading state
- Success banner showing hire/reject counts
- **Ranked Leaderboard Table:**
  - Crown/Medal/Award icons for rank 1/2/3
  - Top 10% candidates highlighted with amber background + star icon
  - Score progress bar (green >80, amber >60, red <60)
  - HIRED/REJECTED status badges with CheckCircle/XCircle icons
- **View Report Modal** (Shadcn Dialog):
  - Large score display with colored progress ring
  - AI Feedback section with evaluation paragraph
  - Interview Transcript section with formatted Q&A

#### Schedule Page (`Schedule.tsx`)
- Public-facing page (no sidebar layout)
- Shows candidate name + job title
- Calendar date picker (Shadcn Calendar)
- Time slot selector (9 AM – 5 PM, 1-hour blocks)
- Submit button with loading state
- Success confirmation with scheduled date/time display

#### Interview Room (`InterviewRoom.tsx`)
- **State Machine:** LOADING → LOBBY → ACTIVE → ENDED
- **Tech Check Lobby:**
  - Camera preview via `getUserMedia()` with live video feed
  - Microphone test with audio level indicator
  - Screen share setup via `getDisplayMedia()` with preview
  - Device permission error handling
  - "Begin Interview" button (disabled until all devices ready)
- **Lockout State:** Shown when `attempts >= 2` — displays warning with lock icon
- **Active Interview:**
  - Camera PiP (picture-in-picture) in corner
  - Audio visualizer animation (AnalyserNode + canvas waveform)
  - Recording indicator (pulsing red dot + elapsed time)
  - Screen share active indicator
  - Tab proctoring via `visibilitychange` event (warns on tab switch)
  - "End Interview" button
- **Thank You Page:** Confirmation message after interview completion

---

## 7. OpenAPI Codegen Pipeline

```
openapi.yaml  →  orval codegen  →  api-zod (Zod schemas)
                                →  api-client-react (React Query hooks + types)
```

**Workflow:**
1. Edit `lib/api-spec/openapi.yaml` (source of truth)
2. Run `pnpm --filter @workspace/api-spec run codegen`
3. Generates:
   - `lib/api-zod/src/generated/` — Zod validation schemas used by the Express backend
   - `lib/api-client-react/src/generated/` — React Query hooks (`useGetJobs`, `useCreateJob`, etc.) + TypeScript types used by the frontend

---

## 8. Candidate Lifecycle State Machine

```
PENDING ──[Trigger Invites]──→ INVITED ──[Schedule]──→ SCHEDULED
                                                          │
                                                    [Start Interview]
                                                          │
                                                          ▼
                                                    INTERVIEWED
                                                     │         │
                                              [AI: score>80] [AI: score≤80]
                                                     │         │
                                                     ▼         ▼
                                                   HIRED    REJECTED
```

---

## 9. Interview Attempt Lifecycle

```
Interview Created (SCHEDULED, attempts=0)
         │
    [POST /start]  ← atomic WHERE attempts < 2
         │
   IN_PROGRESS (attempts=1)
         │
    [POST /end]
         │
   COMPLETED + candidate→INTERVIEWED
         │
   [If candidate retries → new interview record]
         │
    [POST /start]  ← attempts < 2 check
         │
   IN_PROGRESS (attempts=2)
         │
    [POST /start]  ← BLOCKED (403 Forbidden — max attempts reached)
```

---

## 10. Environment & Configuration

| Variable | Purpose |
|----------|---------|
| `DATABASE_URL` | PostgreSQL connection string (auto-provided by Replit) |
| `PORT` | Server port (auto-assigned per artifact) |
| `NODE_ENV` | Environment flag |

**Dev Servers:**
- Frontend (Vite): Proxied through Replit at `/` path
- Backend (Express): Proxied through Replit at `/api` path prefix
- API Server binds to `PORT` env var, frontend proxies `/api` requests to it

---

## 11. Design System

- **Color Palette:** White/gray enterprise theme with blue accents
- **Component Library:** Shadcn UI (50+ components)
- **Icons:** Lucide React
- **Animations:** Framer Motion for page transitions and micro-interactions
- **Charts:** Recharts for data visualization
- **Typography:** System font stack via Tailwind CSS
- **Responsive:** Mobile-aware with `use-mobile` hook

---

*Generated: March 16, 2026*
*Version: MVP 1.0*
