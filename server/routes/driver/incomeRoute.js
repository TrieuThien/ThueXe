import { Router } from "express";
import {
    getIncomeChartHandler,
    getIncomeHistoryHandler,
    getIncomeSummaryHandler,
} from "../../controllers/driver/incomeController.js";
import requireAuth from "../../middlewares/authMiddleware.js";
import requireRole from "../../middlewares/roleMiddleware.js";
import validateRequest from "../../middlewares/validateRequest.js";
import {
    incomeChartValidator,
    incomeHistoryValidator,
    incomeSummaryValidator,
} from "../../validators/driver/incomeValidators.js";

const router = Router();

router.use(requireAuth, requireRole("driver"));

router.get("/summary", incomeSummaryValidator, validateRequest, getIncomeSummaryHandler);
router.get("/chart",   incomeChartValidator,   validateRequest, getIncomeChartHandler);
router.get("/history", incomeHistoryValidator, validateRequest, getIncomeHistoryHandler);

export default router;
