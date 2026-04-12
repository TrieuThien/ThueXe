/**
 * rentalRoute.js
 *
 * Driver-side rental / schedule endpoints.
 * Mounted at /api/driver/rental by driverAppRoute.js.
 *
 * Static routes are declared before dynamic /:id params.
 */

import { Router } from "express";
import {
    acceptRentalBookingHandler,
    completeRentalBookingHandler,
    createAvailabilityHandler,
    deleteAvailabilityHandler,
    getAvailabilityHandler,
    getRentalBookingDetailHandler,
    getRentalBookingsHandler,
    patchAvailabilityHandler,
    startRentalBookingHandler,
} from "../../controllers/driver/rentalController.js";
import requireAuth from "../../middlewares/authMiddleware.js";
import requireRole from "../../middlewares/roleMiddleware.js";
import validateRequest from "../../middlewares/validateRequest.js";
import {
    acceptRentalBookingValidator,
    completeRentalBookingValidator,
    createAvailabilityValidator,
    deleteAvailabilityValidator,
    getAvailabilityValidator,
    getRentalBookingDetailValidator,
    getRentalBookingsValidator,
    patchAvailabilityValidator,
    startRentalBookingValidator,
} from "../../validators/driver/rentalValidators.js";

const router = Router();

// All rental endpoints require an authenticated driver
router.use(requireAuth, requireRole("driver"));

// ─── Schedule availability ────────────────────────────────────────────────────
router.get("/availability",              getAvailabilityValidator,    validateRequest, getAvailabilityHandler);
router.post("/availability",             createAvailabilityValidator, validateRequest, createAvailabilityHandler);
router.patch("/availability/:scheduleId", patchAvailabilityValidator, validateRequest, patchAvailabilityHandler);
router.delete("/availability/:scheduleId", deleteAvailabilityValidator, validateRequest, deleteAvailabilityHandler);

// ─── Rental bookings: static list before dynamic detail ──────────────────────
router.get("/bookings",          getRentalBookingsValidator,     validateRequest, getRentalBookingsHandler);
router.get("/bookings/:rentalId", getRentalBookingDetailValidator, validateRequest, getRentalBookingDetailHandler);

// ─── Rental lifecycle actions ─────────────────────────────────────────────────
router.post("/bookings/:rentalId/accept",   acceptRentalBookingValidator,   validateRequest, acceptRentalBookingHandler);
router.post("/bookings/:rentalId/start",    startRentalBookingValidator,    validateRequest, startRentalBookingHandler);
router.post("/bookings/:rentalId/complete", completeRentalBookingValidator, validateRequest, completeRentalBookingHandler);

export default router;
