import { Router, type IRouter } from "express";
import { eq, sql } from "drizzle-orm";
import { db, interviewsTable, candidatesTable } from "@workspace/db";
import {
  GetInterviewsQueryParams,
  CreateInterviewBody,
  GetInterviewParams,
  GetInterviewResponse,
  GetInterviewsResponse,
  UpdateInterviewParams,
  UpdateInterviewBody,
  UpdateInterviewResponse,
  StartInterviewParams,
  EndInterviewParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/interviews", async (req, res): Promise<void> => {
  const query = GetInterviewsQueryParams.safeParse(req.query);
  if (!query.success) {
    res.status(400).json({ error: query.error.message });
    return;
  }

  let q = db.select().from(interviewsTable);
  if (query.data.candidateId) {
    q = q.where(eq(interviewsTable.candidateId, query.data.candidateId)) as typeof q;
  }

  const interviews = await q.orderBy(interviewsTable.scheduledAt);
  res.json(GetInterviewsResponse.parse(interviews));
});

router.post("/interviews", async (req, res): Promise<void> => {
  const parsed = CreateInterviewBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const data = { ...parsed.data, status: parsed.data.status ?? "SCHEDULED" };
  const [interview] = await db.insert(interviewsTable).values(data).returning();
  res.status(201).json(GetInterviewResponse.parse(interview));
});

router.get("/interviews/:id", async (req, res): Promise<void> => {
  const params = GetInterviewParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [interview] = await db
    .select()
    .from(interviewsTable)
    .where(eq(interviewsTable.id, params.data.id));

  if (!interview) {
    res.status(404).json({ error: "Interview not found" });
    return;
  }

  res.json(GetInterviewResponse.parse(interview));
});

router.put("/interviews/:id", async (req, res): Promise<void> => {
  const params = UpdateInterviewParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = UpdateInterviewBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [interview] = await db
    .update(interviewsTable)
    .set(parsed.data)
    .where(eq(interviewsTable.id, params.data.id))
    .returning();

  if (!interview) {
    res.status(404).json({ error: "Interview not found" });
    return;
  }

  res.json(UpdateInterviewResponse.parse(interview));
});

router.post("/interviews/:id/start", async (req, res): Promise<void> => {
  const params = StartInterviewParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [updated] = await db
    .update(interviewsTable)
    .set({
      attempts: sql`${interviewsTable.attempts} + 1`,
      status: "IN_PROGRESS",
    })
    .where(
      sql`${interviewsTable.id} = ${params.data.id} AND ${interviewsTable.attempts} < 2`
    )
    .returning();

  if (!updated) {
    const [interview] = await db
      .select()
      .from(interviewsTable)
      .where(eq(interviewsTable.id, params.data.id));

    if (!interview) {
      res.status(404).json({ error: "Interview not found" });
      return;
    }

    res.status(403).json({ error: "Maximum connection attempts reached. Contact HR." });
    return;
  }

  res.json(GetInterviewResponse.parse(updated));
});

router.post("/interviews/:id/end", async (req, res): Promise<void> => {
  const params = EndInterviewParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [interview] = await db
    .select()
    .from(interviewsTable)
    .where(eq(interviewsTable.id, params.data.id));

  if (!interview) {
    res.status(404).json({ error: "Interview not found" });
    return;
  }

  const [updated] = await db
    .update(interviewsTable)
    .set({ status: "COMPLETED" })
    .where(eq(interviewsTable.id, params.data.id))
    .returning();

  await db
    .update(candidatesTable)
    .set({ status: "INTERVIEWED" })
    .where(eq(candidatesTable.id, interview.candidateId));

  res.json(GetInterviewResponse.parse(updated));
});

export default router;
