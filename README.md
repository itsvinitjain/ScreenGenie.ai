# ScreenGenie.ai

AI-powered HR interview screening platform. HR admins create job postings, import candidates, schedule AI-driven live interviews, and review scored evaluation reports — all from one dashboard.

Candidates take live voice interviews with a GPT-4o AI interviewer that speaks questions aloud, listens to answers, runs coding challenges, monitors for suspicious behavior, and produces a detailed evaluation report with a hire/no-hire verdict.

## Features

### HR Admin Side

- **Dashboard** — overview stats (total jobs, candidates, pending interviews, completed, hired), weekly applicant chart, quick action links
- **Job Management** — create, edit, and manage job postings with title, description, skills, and status (Open / Closed / Draft)
- **Candidate Pipeline** — add candidates manually or bulk-import from CSV; filter by job, search by name/email; view color-coded AI scores (green >= 70, yellow 50-69, red < 50)
- **Interview Scheduling** — configure AI interview settings per candidate: experience level (Fresher / Lenient / Medium / Hard), duration (15-60 min), interviewer voice gender, coding challenge toggle, custom prepared questions
- **Trigger Interview Invites** — batch-send interview links to all pending candidates for a job
- **Evaluation Reports** — ranked leaderboard with final verdict labels (Strong Hire / Hire / Lean Hire / Lean No Hire / No Hire / Strong No Hire), expandable report sections for strengths, areas for improvement, AI suspicion analysis, and interview transcript

### Candidate Side

- **Interview Room** — full-screen interview experience with dark theme
  - **Tech Check Lobby** — verify camera, microphone, and screen permissions before starting
  - **5-Second Countdown** — brief preparation period after clicking Start
  - **Live AI Interviewer** — animated avatar (JarvisOrb) that speaks questions via text-to-speech and listens for answers via speech-to-text
  - **Progressive Difficulty** — the AI adapts strictness based on answer quality, ramping from warm-up questions to deep technical challenges
  - **Coding Editor** — integrated Monaco Editor with syntax highlighting, code execution via Wandbox (supports 20 languages), and AI code review
  - **Camera Proctoring** — real-time camera feed monitoring with tab-switch and focus-loss detection
  - **Strictness Meter** — visual indicator of the AI's current difficulty level
  - **Timer** — countdown to interview end with automatic wrap-up
  - **Thank You Screen** — displays final evaluation scores after the interview ends

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19, Vite, TypeScript, Tailwind CSS |
| UI Components | Shadcn/ui, Radix UI, Lucide React icons |
| Routing | Wouter |
| State Management | TanStack React Query |
| Code Editor | Monaco Editor (@monaco-editor/react) |
| Animations | Framer Motion |
| Charts | Recharts |
| Backend | Express 5, TypeScript |
| Database | PostgreSQL, Drizzle ORM |
| AI Chat | OpenAI GPT-4o (streaming via SSE) |
| Text-to-Speech | OpenAI TTS (tts-1 model) |
| Speech-to-Text | OpenAI Whisper (gpt-4o-mini-transcribe) |
| Code Execution | Wandbox API (20 languages) |
| Monorepo | pnpm workspaces |
| API Codegen | Orval (OpenAPI 3.1 spec) |
| Validation | Zod v4, drizzle-zod |
| Build | esbuild (CJS bundle for production) |

## Project Structure

```
screengenie/
├── artifacts/
│   ├── api-server/                 # Express API server
│   │   └── src/
│   │       ├── app.ts              # Express app setup (CORS, body parser, routes)
│   │       ├── index.ts            # Server entry point
│   │       ├── routes/             # API route handlers
│   │       │   ├── index.ts        # Route aggregator
│   │       │   ├── jobs.ts         # Job CRUD + evaluation + results
│   │       │   ├── candidates.ts   # Candidate CRUD + bulk import
│   │       │   ├── interviews.ts   # Interview CRUD + start/end
│   │       │   ├── sessions.ts     # AI session lifecycle (SSE streaming, TTS, STT, proctoring)
│   │       │   ├── schedule.ts     # Public scheduling endpoint
│   │       │   ├── code.ts         # Wandbox code execution proxy
│   │       │   └── ...
│   │       └── lib/
│   │           ├── interviewAI.ts  # GPT-4o interview logic (streaming, evaluation, prompts)
│   │           ├── audio.ts        # TTS wrapper
│   │           ├── openai.ts       # OpenAI client configuration
│   │           └── email.ts        # Mock email utility
│   └── screengenie/                # React + Vite frontend
│       └── src/
│           ├── App.tsx             # Root app with routing
│           ├── pages/              # Page components
│           │   ├── Dashboard.tsx
│           │   ├── Jobs.tsx
│           │   ├── JobDetail.tsx
│           │   ├── JobResults.tsx
│           │   ├── Candidates.tsx
│           │   ├── Schedule.tsx
│           │   ├── InterviewRoom.tsx
│           │   └── Settings.tsx
│           ├── hooks/              # Custom React hooks
│           │   ├── use-interview-flow.ts  # Interview SSE + audio orchestration
│           │   ├── use-sessions.ts        # Session CRUD hooks
│           │   └── use-audio-recorder.ts  # Microphone recording
│           └── components/
│               ├── interview/      # Interview UI components
│               │   ├── JarvisOrb.tsx
│               │   ├── InterviewerAvatar.tsx
│               │   ├── CodeEditor.tsx
│               │   ├── CameraProctor.tsx
│               │   └── StrictnessMeter.tsx
│               ├── layout/         # App shell & navigation
│               └── ui/             # Shadcn/Radix UI primitives
├── lib/
│   ├── db/                         # Drizzle ORM schema + connection
│   │   └── src/schema/
│   │       ├── users.ts
│   │       ├── jobs.ts
│   │       ├── candidates.ts
│   │       ├── interviews.ts
│   │       ├── sessions.ts
│   │       └── sessionMessages.ts
│   ├── api-spec/                   # OpenAPI 3.1 spec + Orval config
│   ├── api-client-react/           # Generated React Query hooks
│   └── api-zod/                    # Generated Zod validation schemas
├── database_schema.sql             # pg_dump of current schema
├── pnpm-workspace.yaml
└── package.json
```

## Database Tables

### users
HR admin accounts.
| Column | Type | Description |
|--------|------|-------------|
| id | serial PK | Auto-increment ID |
| email | text | Unique email address |
| name | text | Full name |
| company | text | Company name |
| created_at | timestamp | Account creation time |

### jobs
Job postings created by HR admins.
| Column | Type | Description |
|--------|------|-------------|
| id | serial PK | Auto-increment ID |
| hr_id | int FK -> users | HR admin who created the job |
| title | text | Job title |
| description | text | Full job description |
| skills | text | Comma-separated skills |
| status | text | OPEN, CLOSED, or DRAFT |
| created_at | timestamp | Creation time |

### candidates
Job applicants linked to a specific job.
| Column | Type | Description |
|--------|------|-------------|
| id | serial PK | Auto-increment ID |
| job_id | int FK -> jobs | Associated job posting |
| name | text | Candidate full name |
| email | text | Email address |
| phone | text | Phone number |
| status | text | PENDING, INVITED, SCHEDULED, INTERVIEWED, HIRED, REJECTED |
| score | int | Overall AI evaluation score (1-100), null until interviewed |
| resume_url | text | Link to uploaded resume |
| created_at | timestamp | When the candidate was added |

### interviews
Scheduled interview records with AI configuration.
| Column | Type | Description |
|--------|------|-------------|
| id | serial PK | Auto-increment ID |
| candidate_id | int FK -> candidates | Linked candidate |
| scheduled_at | timestamp | Interview date/time |
| status | text | SCHEDULED, IN_PROGRESS, COMPLETED, CANCELLED |
| attempts | int | Number of attempts (max 2) |
| transcript | text | Full interview transcript |
| feedback | text | JSON string containing `_fullEvaluation` with scores and verdict |
| voice_gender | text | AI interviewer voice: "male" or "female" |
| experience_level | text | Difficulty: "fresher", "lenient", "medium", "hard" |
| duration_minutes | int | Interview length in minutes |
| coding_enabled | boolean | Whether coding challenges are included |
| questions | text[] | Custom prepared interview questions |
| created_at | timestamp | Creation time |

### sessions
Active AI interview session state.
| Column | Type | Description |
|--------|------|-------------|
| id | serial PK | Auto-increment ID |
| interview_id | int FK -> interviews (CASCADE) | Parent interview |
| candidate_name | text | Candidate's display name |
| status | text | "active" or "completed" |
| current_strictness | int | AI strictness level (1-10) |
| questions_asked | int | Number of questions asked so far |
| overall_score | int | Final overall score (1-100) |
| feedback | text | JSON evaluation data |
| started_at | timestamptz | Session start time |
| ended_at | timestamptz | Session end time |
| tab_switch_count | int | Number of tab switches detected |
| focus_lost_count | int | Number of focus losses detected |
| id_verified | boolean | Whether ID was verified |
| id_verification_data | jsonb | ID verification metadata |
| proctoring_flags | jsonb | Array of proctoring events |
| created_at | timestamptz | Creation time |

### session_messages
Conversation messages within an interview session.
| Column | Type | Description |
|--------|------|-------------|
| id | serial PK | Auto-increment ID |
| session_id | int FK -> sessions (CASCADE) | Parent session |
| role | text | "interviewer", "candidate", or "code" |
| content | text | Message text (or code submission with metadata) |
| question_number | int | Which question this relates to |
| time_allotted | int | Seconds allotted for response |
| created_at | timestamptz | Message timestamp |

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| DATABASE_URL | Yes | PostgreSQL connection string |
| OPENAI_API_KEY | Conditional | OpenAI API key (not needed if using Replit AI integrations) |
| AI_INTEGRATIONS_OPENAI_BASE_URL | Conditional | Replit AI integration proxy URL (auto-set) |
| AI_INTEGRATIONS_OPENAI_API_KEY | Conditional | Replit AI integration key (auto-set) |

## Running Locally

1. Install dependencies:
   ```bash
   pnpm install
   ```

2. Set environment variables:
   ```bash
   export DATABASE_URL="postgresql://..."
   export OPENAI_API_KEY="sk-..."
   ```

3. Push database schema:
   ```bash
   pnpm --filter @workspace/db run push
   ```

4. Start both servers:
   ```bash
   # Terminal 1: API server
   PORT=8080 pnpm --filter @workspace/api-server run dev

   # Terminal 2: Frontend
   PORT=23515 BASE_PATH=/ pnpm --filter @workspace/screengenie run dev
   ```

5. Open the app at `http://localhost:23515`

## How the AI Interview Works

1. **HR schedules an interview** — sets difficulty level, duration, voice preference, and optional custom questions for the candidate.

2. **Candidate opens the interview link** — arrives at the tech-check lobby to verify camera, microphone, and screen access.

3. **Interview begins** — the AI interviewer greets the candidate by name with a time-appropriate greeting, introduces itself, and asks the first question. The question is spoken aloud via OpenAI TTS.

4. **Continuous Q&A loop** — the candidate speaks their answer, which is recorded via the browser microphone and transcribed using OpenAI Whisper. The AI interviewer processes the answer using GPT-4o with a detailed system prompt that controls behavior, difficulty progression, and response format (JSON with strictness, time allotment, suspicion level, etc.). The AI's response is spoken via TTS and the loop repeats.

5. **Progressive difficulty** — the AI adapts its strictness level within the configured range based on answer quality. Strong answers increase difficulty; weak answers slightly decrease it. The interview progresses through phases: warm-up, mid-depth, deep technical, and final stress-test.

6. **Coding phase** — if enabled, the last ~10 minutes shift to coding challenges. The candidate writes code in the integrated Monaco Editor, can execute it via Wandbox, and submit it for AI review. The AI analyzes code quality, correctness, and approach.

7. **Proctoring** — throughout the interview, the system tracks tab switches, focus losses, and camera status. These events are logged as proctoring flags on the session.

8. **AI cheating detection** — the AI monitors for signs of external assistance (suspiciously perfect answers, unnatural pauses, inconsistent depth) and tracks a suspicion level (0-10). It uses counter-techniques like rapid follow-ups, asking for simpler explanations, and opinion-based questions.

9. **Evaluation** — when the interview ends (time up or manual end), GPT-4o generates a comprehensive evaluation scoring 9 dimensions (1-100 each): Technical Knowledge, Communication, Problem Solving, Confidence, Depth of Understanding, Emotional Resilience, Pressure Handling, Code Quality, and Overall. It also produces a written feedback summary, strengths list, improvements list, AI suspicion report, and a final verdict (Strong Hire / Hire / Lean Hire / Lean No Hire / No Hire / Strong No Hire).

10. **Results** — the candidate's score and status are updated in the database. HR admins can view ranked leaderboards, read detailed evaluation reports, and make hiring decisions.
