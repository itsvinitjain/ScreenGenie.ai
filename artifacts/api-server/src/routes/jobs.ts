import { Router, type IRouter } from "express";
import { eq, and, desc, sql } from "drizzle-orm";
import { db, jobsTable, candidatesTable, interviewsTable } from "@workspace/db";
import {
  CreateJobBody,
  GetJobParams,
  GetJobResponse,
  GetJobsResponse,
  UpdateJobParams,
  UpdateJobBody,
  UpdateJobResponse,
  DeleteJobParams,
  TriggerInterviewInvitesParams,
  RunAiEvaluationParams,
  GetJobResultsParams,
} from "@workspace/api-zod";
import { sendInterviewInviteEmail } from "../lib/email";

const router: IRouter = Router();

router.get("/jobs", async (_req, res): Promise<void> => {
  const jobs = await db.select().from(jobsTable).orderBy(jobsTable.createdAt);
  res.json(GetJobsResponse.parse(jobs));
});

router.post("/jobs", async (req, res): Promise<void> => {
  const parsed = CreateJobBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const data = { ...parsed.data, status: parsed.data.status ?? "OPEN" };
  const [job] = await db.insert(jobsTable).values(data).returning();
  res.status(201).json(GetJobResponse.parse(job));
});

router.get("/jobs/:id", async (req, res): Promise<void> => {
  const params = GetJobParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [job] = await db.select().from(jobsTable).where(eq(jobsTable.id, params.data.id));
  if (!job) {
    res.status(404).json({ error: "Job not found" });
    return;
  }

  res.json(GetJobResponse.parse(job));
});

router.put("/jobs/:id", async (req, res): Promise<void> => {
  const params = UpdateJobParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = UpdateJobBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [job] = await db
    .update(jobsTable)
    .set(parsed.data)
    .where(eq(jobsTable.id, params.data.id))
    .returning();

  if (!job) {
    res.status(404).json({ error: "Job not found" });
    return;
  }

  res.json(UpdateJobResponse.parse(job));
});

router.delete("/jobs/:id", async (req, res): Promise<void> => {
  const params = DeleteJobParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [job] = await db
    .delete(jobsTable)
    .where(eq(jobsTable.id, params.data.id))
    .returning();

  if (!job) {
    res.status(404).json({ error: "Job not found" });
    return;
  }

  res.sendStatus(204);
});

router.post("/jobs/:id/trigger-invites", async (req, res): Promise<void> => {
  const params = TriggerInterviewInvitesParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const pendingCandidates = await db
    .select()
    .from(candidatesTable)
    .where(
      and(
        eq(candidatesTable.jobId, params.data.id),
        eq(candidatesTable.status, "PENDING")
      )
    );

  if (pendingCandidates.length === 0) {
    res.json({ invited: 0, emailsSent: [] });
    return;
  }

  const emailsSent: string[] = [];
  for (const candidate of pendingCandidates) {
    sendInterviewInviteEmail(candidate.email, candidate.id);
    emailsSent.push(candidate.email);
  }

  await db
    .update(candidatesTable)
    .set({ status: "INVITED" })
    .where(
      and(
        eq(candidatesTable.jobId, params.data.id),
        eq(candidatesTable.status, "PENDING")
      )
    );

  res.json({ invited: pendingCandidates.length, emailsSent });
});

const MOCK_FEEDBACK_TEMPLATES = [
  "Candidate demonstrated strong technical knowledge and excellent problem-solving skills. Communication was clear and articulate. Showed good understanding of system design principles and was able to explain complex concepts effectively. Would be a strong addition to the team.",
  "Solid performance overall with particularly strong answers in the coding portion. The candidate showed creativity in their approach to algorithmic challenges. Some areas for improvement in system design discussions, but demonstrated willingness to learn. Cultural fit appears excellent.",
  "Mixed performance during the interview. While the candidate showed competence in basic programming concepts, there were gaps in advanced topics. Communication skills were adequate but could be more concise. Needs more experience with distributed systems.",
  "Exceptional candidate who exceeded expectations in all areas. Demonstrated deep expertise in the required tech stack with real-world examples. Excellent communication skills, asked insightful questions, and showed genuine passion for the role. Highly recommended for hire.",
  "Below average performance. Struggled with fundamental coding questions and had difficulty articulating technical decisions. Limited experience with the required technologies. May benefit from more preparation before reapplying.",
  "Good technical foundation with room for growth. Answered behavioral questions well and showed strong teamwork values. Coding skills are adequate for the role, though optimization techniques need improvement. Would benefit from mentorship in the first few months.",
];

const MOCK_TRANSCRIPT_TEMPLATE = (name: string, jobTitle: string) =>
  `[Interview Transcript - ${jobTitle}]\n\nAI: Welcome, ${name}. Thank you for joining us today. Let's start with a brief introduction. Can you tell me about yourself and your experience?\n\n${name}: Thank you for having me. I've been working in software development for several years now...\n\nAI: Great. Let's move into the technical portion. Can you walk me through how you would design a scalable API for a high-traffic application?\n\n${name}: Sure, I would start by considering the requirements and traffic patterns...\n\nAI: Interesting approach. Now let's do a coding exercise. Can you implement a function that finds the longest palindromic substring?\n\n${name}: Of course. I would use dynamic programming for this...\n\nAI: Good solution. Let's discuss your experience with team collaboration. Tell me about a time you resolved a conflict with a colleague.\n\n${name}: There was a situation where we had differing opinions on architecture...\n\nAI: Thank you, ${name}. That concludes our interview. We'll be in touch with the results soon.\n\n[End of Transcript]`;

router.post("/jobs/:id/evaluate", async (req, res): Promise<void> => {
  const params = RunAiEvaluationParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const interviewedCandidates = await db
    .select()
    .from(candidatesTable)
    .where(
      and(
        eq(candidatesTable.jobId, params.data.id),
        eq(candidatesTable.status, "INTERVIEWED")
      )
    );

  if (interviewedCandidates.length === 0) {
    res.json({ evaluated: 0, hired: 0, rejected: 0 });
    return;
  }

  const [job] = await db.select().from(jobsTable).where(eq(jobsTable.id, params.data.id));
  const jobTitle = job?.title || "Position";

  let hired = 0;
  let rejected = 0;

  for (const candidate of interviewedCandidates) {
    const score = Math.floor(Math.random() * (98 - 40 + 1)) + 40;
    const feedback = MOCK_FEEDBACK_TEMPLATES[Math.floor(Math.random() * MOCK_FEEDBACK_TEMPLATES.length)];
    const transcript = MOCK_TRANSCRIPT_TEMPLATE(candidate.name, jobTitle);
    const newStatus = score > 80 ? "HIRED" : "REJECTED";

    if (newStatus === "HIRED") hired++;
    else rejected++;

    await db
      .update(candidatesTable)
      .set({ score, status: newStatus })
      .where(eq(candidatesTable.id, candidate.id));

    const [interview] = await db
      .select()
      .from(interviewsTable)
      .where(eq(interviewsTable.candidateId, candidate.id))
      .orderBy(desc(interviewsTable.createdAt))
      .limit(1);

    if (interview) {
      await db
        .update(interviewsTable)
        .set({ feedback, transcript })
        .where(eq(interviewsTable.id, interview.id));
    }
  }

  res.json({ evaluated: interviewedCandidates.length, hired, rejected });
});

router.get("/jobs/:id/results", async (req, res): Promise<void> => {
  const params = GetJobResultsParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const rows = await db.execute(sql`
    SELECT
      c.id, c.name, c.email, c.phone, c.status, c.score, c.created_at,
      i.id AS interview_id, i.feedback, i.transcript, i.scheduled_at
    FROM candidates c
    LEFT JOIN LATERAL (
      SELECT * FROM interviews WHERE candidate_id = c.id ORDER BY created_at DESC LIMIT 1
    ) i ON true
    WHERE c.job_id = ${params.data.id}
    ORDER BY c.score DESC NULLS LAST
  `);

  const serialized = rows.rows.map((r: any) => ({
    id: r.id,
    name: r.name,
    email: r.email,
    phone: r.phone,
    status: r.status,
    score: r.score,
    createdAt: r.created_at instanceof Date ? r.created_at.toISOString() : r.created_at,
    interviewId: r.interview_id,
    feedback: r.feedback,
    transcript: r.transcript,
    scheduledAt: r.scheduled_at instanceof Date ? r.scheduled_at.toISOString() : r.scheduled_at,
  }));

  res.json(serialized);
});

export default router;
