import { Router } from "express";
import requireAuth from "../../middlewares/authMiddleware.js";
import requireRole from "../../middlewares/roleMiddleware.js";
import validateRequest from "../../middlewares/validateRequest.js";
import {
    patchOnlineStatusValidator,
    patchServiceTypeValidator,
} from "../../validators/driver/workingStatusValidators.js";
import {
    getWorkingStatusHandler,
    patchOnlineStatusHandler,
    patchServiceTypeHandler,
    getWorkingAreasHandler,
} from "../../controllers/driver/workingStatusController.js";

const router = Router();

// All working-status endpoints require an authenticated driver
router.use(requireAuth, requireRole("driver"));

// ─── Working Status ───────────────────────────────────────────────────────────
router.get("/", getWorkingStatusHandler);
router.patch("/online", patchOnlineStatusValidator, validateRequest, patchOnlineStatusHandler);
router.patch("/service-type", patchServiceTypeValidator, validateRequest, patchServiceTypeHandler);
router.get("/areas", getWorkingAreasHandler);

export default router;
