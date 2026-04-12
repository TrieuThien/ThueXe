import { Router } from "express";
import {
    acceptBookingHandler,
    cancelRideHandler,
    completeRideHandler,
    getActiveBookingHandler,
    getBookingDetailHandler,
    getBookingHistoryHandler,
    markArrivedHandler,
    rejectBookingHandler,
    startRideHandler,
} from "../../controllers/driver/bookingController.js";
import requireAuth from "../../middlewares/authMiddleware.js";
import requireRole from "../../middlewares/roleMiddleware.js";
import validateRequest from "../../middlewares/validateRequest.js";
import {
    acceptBookingValidator,
    cancelRideValidator,
    completeRideValidator,
    getActiveBookingValidator,
    getBookingDetailValidator,
    getBookingHistoryValidator,
    markArrivedValidator,
    rejectBookingValidator,
    startRideValidator,
} from "../../validators/driver/bookingValidators.js";

const router = Router();

// All booking routes require an authenticated driver
router.use(requireAuth, requireRole("driver"));

router.get("/active", getActiveBookingValidator, validateRequest, getActiveBookingHandler);
router.get("/", getBookingHistoryValidator, validateRequest, getBookingHistoryHandler);
router.get("/:bookingId", getBookingDetailValidator, validateRequest, getBookingDetailHandler);

router.patch("/:bookingId/accept", acceptBookingValidator, validateRequest, acceptBookingHandler);
router.patch("/:bookingId/reject", rejectBookingValidator, validateRequest, rejectBookingHandler);
router.patch("/:bookingId/arrived", markArrivedValidator, validateRequest, markArrivedHandler);
router.patch("/:bookingId/start", startRideValidator, validateRequest, startRideHandler);
router.patch("/:bookingId/complete", completeRideValidator, validateRequest, completeRideHandler);
router.patch("/:bookingId/cancel", cancelRideValidator, validateRequest, cancelRideHandler);

export default router;
