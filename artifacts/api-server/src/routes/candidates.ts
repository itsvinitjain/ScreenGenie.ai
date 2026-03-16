import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, candidatesTable } from "@workspace/db";
import {
  GetCandidatesQueryParams,
  CreateCandidateBody,
  GetCandidateParams,
  GetCandidateResponse,
  GetCandidatesResponse,
  UpdateCandidateParams,
  UpdateCandidateBody,
  UpdateCandidateResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/candidates", async (req, res): Promise<void> => {
  const query = GetCandidatesQueryParams.safeParse(req.query);
  if (!query.success) {
    res.status(400).json({ error: query.error.message });
    return;
  }

  let q = db.select().from(candidatesTable);
  if (query.data.jobId) {
    q = q.where(eq(candidatesTable.jobId, query.data.jobId)) as typeof q;
  }

  const candidates = await q.orderBy(candidatesTable.createdAt);
  res.json(GetCandidatesResponse.parse(candidates));
});

router.post("/candidates", async (req, res): Promise<void> => {
  const parsed = CreateCandidateBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const data = { ...parsed.data, status: parsed.data.status ?? "PENDING" };
  const [candidate] = await db.insert(candidatesTable).values(data).returning();
  res.status(201).json(GetCandidateResponse.parse(candidate));
});

router.get("/candidates/:id", async (req, res): Promise<void> => {
  const params = GetCandidateParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [candidate] = await db
    .select()
    .from(candidatesTable)
    .where(eq(candidatesTable.id, params.data.id));

  if (!candidate) {
    res.status(404).json({ error: "Candidate not found" });
    return;
  }

  res.json(GetCandidateResponse.parse(candidate));
});

router.put("/candidates/:id", async (req, res): Promise<void> => {
  const params = UpdateCandidateParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = UpdateCandidateBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [candidate] = await db
    .update(candidatesTable)
    .set(parsed.data)
    .where(eq(candidatesTable.id, params.data.id))
    .returning();

  if (!candidate) {
    res.status(404).json({ error: "Candidate not found" });
    return;
  }

  res.json(UpdateCandidateResponse.parse(candidate));
});

export default router;
