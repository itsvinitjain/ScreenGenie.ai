import { Router, type IRouter } from "express";
import healthRouter from "./health";
import usersRouter from "./users";
import jobsRouter from "./jobs";
import candidatesRouter from "./candidates";
import interviewsRouter from "./interviews";
import dashboardRouter from "./dashboard";

const router: IRouter = Router();

router.use(healthRouter);
router.use(dashboardRouter);
router.use(usersRouter);
router.use(jobsRouter);
router.use(candidatesRouter);
router.use(interviewsRouter);

export default router;
