import { Router } from "express";
import requireAuth from "../middlewares/authMiddleware.js";
import requireRole from "../middlewares/roleMiddleware.js";
import validateRequest from "../middlewares/validateRequest.js";
import {
    adminDashboardHandler,
    dispatcherDashboardHandler,
    operationsReportHandler,
} from "../controllers/dashboardController.js";
import {
    dashboardDateRangeValidator,
    operationsReportValidator,
} from "../validators/dashboardValidators.js";

const router = Router();

router.get(
    "/api/dashboard/admin",
    requireAuth,
    requireRole("admin"),
    dashboardDateRangeValidator,
    validateRequest,
    adminDashboardHandler
);

router.get(
    "/api/dashboard/dispatcher",
    requireAuth,
    requireRole("admin", "dispatcher"),
    dispatcherDashboardHandler
);

router.get(
    "/api/reports/operations",
    requireAuth,
    requireRole("admin", "dispatcher"),
    operationsReportValidator,
    validateRequest,
    operationsReportHandler
);

export default router;
