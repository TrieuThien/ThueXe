import { Router } from "express";
import requireAuth from "../../middlewares/authMiddleware.js";
import validateRequest from "../../middlewares/validateRequest.js";
import {
    cancelBookingHandler,
    changeBookingPaymentMethodHandler,
    createBookingHandler,
    estimateFareHandler,
    estimateRouteHandler,
    getAvailableBookingHistoryHandler,
    getBookingCancelPolicyHandler,
    getBookingDetailHandler,
    getBookingTrackingHandler,
    getCurrentBookingHandler,
    getStatusStreamHandler,
} from "../../controllers/customer/rideController.js";
import {
    bookingHistoryValidator,
    bookingIdParamValidator,
    cancelBookingValidator,
    changePaymentMethodValidator,
    createBookingValidator,
    fareEstimateValidator,
    routeEstimateValidator,
} from "../../validators/customer/rideValidators.js";

const router = Router();

router.post("/map/estimate-route", requireAuth, routeEstimateValidator, validateRequest, estimateRouteHandler);
router.post("/fare-estimate", requireAuth, fareEstimateValidator, validateRequest, estimateFareHandler);
router.post("/bookings", requireAuth, createBookingValidator, validateRequest, createBookingHandler);
router.get("/bookings/current", requireAuth, getCurrentBookingHandler);
router.get("/bookings/history", requireAuth, bookingHistoryValidator, validateRequest, getAvailableBookingHistoryHandler);
router.get("/bookings/:bookingId/cancel-policy", requireAuth, bookingIdParamValidator, validateRequest, getBookingCancelPolicyHandler);
router.get("/bookings/:bookingId", requireAuth, bookingIdParamValidator, validateRequest, getBookingDetailHandler);
router.post(
    "/bookings/:bookingId/cancel",
    requireAuth,
    [...bookingIdParamValidator, ...cancelBookingValidator],
    validateRequest,
    cancelBookingHandler
);
router.post(
    "/bookings/:bookingId/change-payment-method",
    requireAuth,
    [...bookingIdParamValidator, ...changePaymentMethodValidator],
    validateRequest,
    changeBookingPaymentMethodHandler
);
router.get(
    "/bookings/:bookingId/tracking",
    requireAuth,
    bookingIdParamValidator,
    validateRequest,
    getBookingTrackingHandler
);
router.get(
    "/bookings/:bookingId/status-stream",
    requireAuth,
    bookingIdParamValidator,
    validateRequest,
    getStatusStreamHandler
);

export default router;
