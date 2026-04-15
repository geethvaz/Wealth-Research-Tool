import { Router, type IRouter } from "express";
import healthRouter from "./health";
import companiesRouter from "./companies";

const router: IRouter = Router();

router.use(healthRouter);
router.use(companiesRouter);

export default router;
