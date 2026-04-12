import { Router } from "express";
import requireAuth from "../../middlewares/authMiddleware.js";
import requireRole from "../../middlewares/roleMiddleware.js";
import validateRequest from "../../middlewares/validateRequest.js";
import {
    postLocationValidator,
    postHeartbeatValidator,
} from "../../validators/driver/workingStatusValidators.js";
import {
    postLocationHandler,
    postHeartbeatHandler,
} from "../../controllers/driver/workingStatusController.js";

const router = Router();

// All location endpoints require an authenticated driver
router.use(requireAuth, requireRole("driver"));

// ─── Location ─────────────────────────────────────────────────────────────────
router.post("/", postLocationValidator, validateRequest, postLocationHandler);
router.post("/heartbeat", postHeartbeatValidator, validateRequest, postHeartbeatHandler);

export default router;
