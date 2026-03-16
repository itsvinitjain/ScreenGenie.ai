import { Router, type IRouter } from "express";
import { eq, count } from "drizzle-orm";
import { db, jobsTable, candidatesTable, interviewsTable } from "@workspace/db";
import { GetDashboardStatsResponse } from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/dashboard/stats", async (_req, res): Promise<void> => {
  const [totalJobsResult] = await db.select({ count: count() }).from(jobsTable);
  const [activeJobsResult] = await db
    .select({ count: count() })
    .from(jobsTable)
    .where(eq(jobsTable.status, "OPEN"));
  const [totalCandidatesResult] = await db.select({ count: count() }).from(candidatesTable);
  const [pendingInterviewsResult] = await db
    .select({ count: count() })
    .from(interviewsTable)
    .where(eq(interviewsTable.status, "SCHEDULED"));
  const [completedInterviewsResult] = await db
    .select({ count: count() })
    .from(interviewsTable)
    .where(eq(interviewsTable.status, "COMPLETED"));
  const [hiredCandidatesResult] = await db
    .select({ count: count() })
    .from(candidatesTable)
    .where(eq(candidatesTable.status, "HIRED"));

  const stats = {
    totalJobs: totalJobsResult.count,
    activeJobs: activeJobsResult.count,
    totalCandidates: totalCandidatesResult.count,
    pendingInterviews: pendingInterviewsResult.count,
    completedInterviews: completedInterviewsResult.count,
    hiredCandidates: hiredCandidatesResult.count,
  };

  res.json(GetDashboardStatsResponse.parse(stats));
});

export default router;
