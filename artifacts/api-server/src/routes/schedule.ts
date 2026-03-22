import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, candidatesTable, jobsTable, interviewsTable } from "@workspace/db";
import {
  GetScheduleInfoParams,
  GetScheduleInfoResponse,
  SubmitScheduleParams,
  SubmitScheduleBody,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/schedule/:candidateId", async (req, res): Promise<void> => {
  const params = GetScheduleInfoParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [candidate] = await db
    .select()
    .from(candidatesTable)
    .where(eq(candidatesTable.id, params.data.candidateId));

  if (!candidate) {
    res.status(404).json({ error: "Candidate not found" });
    return;
  }

  const [job] = await db
    .select()
    .from(jobsTable)
    .where(eq(jobsTable.id, candidate.jobId));

  if (!job) {
    res.status(404).json({ error: "Job not found" });
    return;
  }

  res.json(
    GetScheduleInfoResponse.parse({
      candidateId: candidate.id,
      candidateName: candidate.name,
      candidateEmail: candidate.email,
      jobTitle: job.title,
      jobDescription: job.description,
      status: candidate.status,
    })
  );
});

router.post("/schedule/:candidateId", async (req, res): Promise<void> => {
  const params = SubmitScheduleParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const coercedBody = {
    ...req.body,
    scheduledAt: req.body.scheduledAt ? new Date(req.body.scheduledAt) : undefined,
  };
  const parsed = SubmitScheduleBody.safeParse(coercedBody);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [candidate] = await db
    .select()
    .from(candidatesTable)
    .where(eq(candidatesTable.id, params.data.candidateId));

  if (!candidate) {
    res.status(404).json({ error: "Candidate not found" });
    return;
  }

  const [existing] = await db
    .select()
    .from(interviewsTable)
    .where(eq(interviewsTable.candidateId, candidate.id));

  const VALID_LEVELS = ["fresher", "lenient", "medium", "hard"];
  const VALID_VOICES = ["female", "male"];

  const aiConfig: Record<string, unknown> = {};
  if (req.body.experienceLevel && VALID_LEVELS.includes(req.body.experienceLevel)) {
    aiConfig.experienceLevel = req.body.experienceLevel;
  }
  if (req.body.durationMinutes != null) {
    const dur = Number(req.body.durationMinutes);
    if (!Number.isNaN(dur) && dur >= 10 && dur <= 90) {
      aiConfig.durationMinutes = dur;
    }
  }
  if (req.body.voiceGender && VALID_VOICES.includes(req.body.voiceGender)) {
    aiConfig.voiceGender = req.body.voiceGender;
  }
  if (req.body.codingEnabled !== undefined) aiConfig.codingEnabled = !!req.body.codingEnabled;
  if (Array.isArray(req.body.questions)) {
    aiConfig.questions = req.body.questions.filter((q: unknown) => typeof q === "string" && q.trim() !== "");
  }

  if (existing) {
    const [updated] = await db
      .update(interviewsTable)
      .set({ scheduledAt: parsed.data.scheduledAt, status: "SCHEDULED", ...aiConfig })
      .where(eq(interviewsTable.id, existing.id))
      .returning();

    await db
      .update(candidatesTable)
      .set({ status: "SCHEDULED" })
      .where(eq(candidatesTable.id, candidate.id));

    res.status(201).json({
      interviewId: updated.id,
      scheduledAt: updated.scheduledAt.toISOString(),
      message: "Interview rescheduled successfully",
    });
    return;
  }

  const [interview] = await db
    .insert(interviewsTable)
    .values({
      candidateId: candidate.id,
      scheduledAt: parsed.data.scheduledAt,
      status: "SCHEDULED",
      attempts: 0,
      ...aiConfig,
    })
    .returning();

  await db
    .update(candidatesTable)
    .set({ status: "SCHEDULED" })
    .where(eq(candidatesTable.id, candidate.id));

  res.status(201).json({
    interviewId: interview.id,
    scheduledAt: interview.scheduledAt.toISOString(),
    message: "Interview scheduled successfully",
  });
});

export default router;
