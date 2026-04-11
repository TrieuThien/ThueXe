import { Router } from "express";
import requireAuth from "../../middlewares/authMiddleware.js";
import validateRequest from "../../middlewares/validateRequest.js";
import {
    getBookingStatusFallbackHandler,
    getDriverLocationFallbackHandler,
    getRealtimeHealthHandler,
    streamRealtimeHandler,
} from "../../controllers/customer/realtimeController.js";
import { bookingIdParamValidator, streamRealtimeValidator } from "../../validators/customer/realtimeValidators.js";

const router = Router();

router.get("/stream", requireAuth, streamRealtimeValidator, validateRequest, streamRealtimeHandler);
router.get("/health", requireAuth, getRealtimeHealthHandler);
router.get(
    "/booking/:bookingId/status",
    requireAuth,
    bookingIdParamValidator,
    validateRequest,
    getBookingStatusFallbackHandler
);
router.get(
    "/booking/:bookingId/driver-location",
    requireAuth,
    bookingIdParamValidator,
    validateRequest,
    getDriverLocationFallbackHandler
);

export default router;
