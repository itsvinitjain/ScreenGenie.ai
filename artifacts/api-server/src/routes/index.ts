import { Router, type IRouter } from "express";
import healthRouter from "./health";
import usersRouter from "./users";
import jobsRouter from "./jobs";
import candidatesRouter from "./candidates";
import interviewsRouter from "./interviews";
import dashboardRouter from "./dashboard";
import scheduleRouter from "./schedule";
import sessionsRouter from "./sessions";

const router: IRouter = Router();

router.use(healthRouter);
router.use(dashboardRouter);
router.use(usersRouter);
router.use(jobsRouter);
router.use(scheduleRouter);
router.use(candidatesRouter);
router.use(interviewsRouter);
router.use(sessionsRouter);

export default router;
