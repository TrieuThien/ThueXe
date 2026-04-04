import { Router } from "express";
import requireAuth from "../middlewares/authMiddleware.js";
import requireRole from "../middlewares/roleMiddleware.js";
import validateRequest from "../middlewares/validateRequest.js";
import {
    appendDriverRoutePointHandler,
    getBookingDriverLocationHandler,
    getDriverLocationHandler,
    getDriverRouteHandler,
    updateMyDriverLocationHandler,
} from "../controllers/trackingController.js";
import {
    appendDriverRoutePointValidator,
    bookingIdParamValidator,
    driverIdParamValidator,
    updateMyDriverLocationValidator,
} from "../validators/trackingValidators.js";

const router = Router();

router.post(
    "/api/tracking/drivers/me/location",
    requireAuth,
    requireRole("driver"),
    updateMyDriverLocationValidator,
    validateRequest,
    updateMyDriverLocationHandler
);

router.get(
    "/api/tracking/drivers/:driverId/location",
    requireAuth,
    requireRole("admin", "dispatcher", "passenger", "driver"),
    driverIdParamValidator,
    validateRequest,
    getDriverLocationHandler
);

router.get(
    "/api/tracking/bookings/:bookingId/location",
    requireAuth,
    requireRole("admin", "dispatcher", "passenger", "driver"),
    bookingIdParamValidator,
    validateRequest,
    getBookingDriverLocationHandler
);

router.post(
    "/api/tracking/bookings/:bookingId/route-points",
    requireAuth,
    requireRole("driver"),
    appendDriverRoutePointValidator,
    validateRequest,
    appendDriverRoutePointHandler
);

router.get(
    "/api/tracking/bookings/:bookingId/route",
    requireAuth,
    requireRole("admin", "dispatcher", "passenger", "driver"),
    bookingIdParamValidator,
    validateRequest,
    getDriverRouteHandler
);

export default router;

