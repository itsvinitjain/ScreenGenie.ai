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
- **interviews** - Interview records (id, candidate_id FK->candidates, scheduled_at, status, attempts, transcript, feedback, created_at)

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
- `GET/POST /api/candidates` - Candidate CRUD (supports `?jobId=` filter)
- `GET/PUT /api/candidates/:id`
- `GET/POST /api/interviews` - Interview CRUD (supports `?candidateId=` filter)
- `GET/PUT /api/interviews/:id`

## Frontend Pages

- **Dashboard** (`/`) - Overview with stat cards, applicant chart, quick actions
- **Jobs** (`/jobs`) - Job listings table with search, create/edit
- **Candidates** (`/candidates`) - Candidate table with status badges, scores, job filter
- **Settings** (`/settings`) - User profile/company settings form

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
Express 5 API server with routes for users, jobs, candidates, interviews, and dashboard stats.

### `lib/db` (`@workspace/db`)
Database layer with Drizzle ORM. Schema files: users.ts, jobs.ts, candidates.ts, interviews.ts.

### `lib/api-spec` (`@workspace/api-spec`)
OpenAPI 3.1 spec and Orval codegen config.

### `lib/api-zod` (`@workspace/api-zod`)
Generated Zod schemas from OpenAPI spec.

### `lib/api-client-react` (`@workspace/api-client-react`)
Generated React Query hooks from OpenAPI spec.
