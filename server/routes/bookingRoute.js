import { Router } from "express";
import requireAuth from "../middlewares/authMiddleware.js";
import requireRole from "../middlewares/roleMiddleware.js";
import validateRequest from "../middlewares/validateRequest.js";
import { passengerBookingCreateLimiter } from "../middlewares/rateLimiters.js";
import {
    assignDriverHandler,
    createBookingHandler,
    estimateBookingRouteHandler,
    getAssignableDriversHandler,
    getBookingDetailHandler,
    getBookingListHandler,
    getBookingLocationSuggestionsHandler,
    getBookingMetaHandler,
    getProcessingBookingListHandler,
    getScheduledBookingListHandler,
    quoteBookingPriceHandler,
    updateBookingStatusHandler,
} from "../controllers/bookingController.js";
import {
    assignDriverValidator,
    createBookingValidator,
    estimateBookingRouteValidator,
    getBookingDetailValidator,
    getBookingListValidator,
    getBookingLocationSuggestionsValidator,
    getBookingMetaValidator,
    listAssignableDriversValidator,
    quoteBookingPriceValidator,
    updateBookingStatusValidator,
} from "../validators/bookingValidators.js";

const router = Router();

router.post(
    "/api/bookings",
    requireAuth,
    (req, res, next) => {
        if (req?.auth?.role === "passenger") {
            return passengerBookingCreateLimiter(req, res, next);
        }

        return next();
    },
    requireRole("admin", "dispatcher", "passenger"),
    createBookingValidator,
    validateRequest,
    createBookingHandler
);

router.get(
    "/api/bookings",
    requireAuth,
    requireRole("admin", "dispatcher", "passenger"),
    getBookingListValidator,
    validateRequest,
    getBookingListHandler
);

router.get(
    "/api/bookings/processing",
    requireAuth,
    requireRole("admin", "dispatcher"),
    getBookingListValidator,
    validateRequest,
    getProcessingBookingListHandler
);

router.get(
    "/api/bookings/scheduled",
    requireAuth,
    requireRole("admin", "dispatcher"),
    getBookingListValidator,
    validateRequest,
    getScheduledBookingListHandler
);

router.get(
    "/api/bookings/:bookingId",
    requireAuth,
    requireRole("admin", "dispatcher", "passenger"),
    getBookingDetailValidator,
    validateRequest,
    getBookingDetailHandler
);

router.patch(
    "/api/bookings/:bookingId/assign-driver",
    requireAuth,
    requireRole("admin", "dispatcher"),
    assignDriverValidator,
    validateRequest,
    assignDriverHandler
);

router.patch(
    "/api/bookings/:bookingId/status",
    requireAuth,
    requireRole("admin", "dispatcher", "passenger"),
    updateBookingStatusValidator,
    validateRequest,
    updateBookingStatusHandler
);

router.get(
    "/api/bookings-meta",
    requireAuth,
    requireRole("admin", "dispatcher", "passenger"),
    getBookingMetaValidator,
    validateRequest,
    getBookingMetaHandler
);

router.get(
    "/api/bookings-meta/location-suggestions",
    requireAuth,
    requireRole("admin", "dispatcher", "passenger"),
    getBookingLocationSuggestionsValidator,
    validateRequest,
    getBookingLocationSuggestionsHandler
);

router.get(
    "/api/bookings-meta/route-estimate",
    requireAuth,
    requireRole("admin", "dispatcher", "passenger"),
    estimateBookingRouteValidator,
    validateRequest,
    estimateBookingRouteHandler
);

router.post(
    "/api/bookings-meta/price-quote",
    requireAuth,
    requireRole("admin", "dispatcher", "passenger"),
    quoteBookingPriceValidator,
    validateRequest,
    quoteBookingPriceHandler
);

router.get(
    "/api/bookings-meta/assignable-drivers",
    requireAuth,
    requireRole("admin", "dispatcher"),
    listAssignableDriversValidator,
    validateRequest,
    getAssignableDriversHandler
);

export default router;
