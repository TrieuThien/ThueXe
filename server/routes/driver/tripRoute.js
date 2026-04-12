/**
 * tripRoute.js
 *
 * Real-time trip management endpoints for the driver mobile app.
 * Mounted at /api/driver/trips by driverAppRoute.js.
 *
 * IMPORTANT: Static routes (/current, /requests/pending) are declared BEFORE
 * the dynamic /:bookingId param route so Express does not mistake the literal
 * segment for a numeric booking ID.
 */

import { Router } from "express";
import requireAuth from "../../middlewares/authMiddleware.js";
import requireRole from "../../middlewares/roleMiddleware.js";
import validateRequest from "../../middlewares/validateRequest.js";
import {
    getCurrentTripValidator,
    getPendingRequestsValidator,
    acceptTripValidator,
    rejectTripValidator,
    arrivedValidator,
    startTripValidator,
    completeTripValidator,
    cancelTripValidator,
    getTripDetailValidator,
    sendChatValidator,
    getChatValidator,
    getTripRouteValidator,
    historyListValidator,
    historyDetailValidator,
    rateCustomerValidator,
} from "../../validators/driver/tripValidators.js";
import {
    getCurrentTripHandler,
    getPendingRequestsHandler,
    acceptTripHandler,
    rejectTripHandler,
    arrivedHandler,
    startTripHandler,
    completeTripHandler,
    cancelTripHandler,
    getTripDetailHandler,
    sendChatHandler,
    getChatHandler,
    getTripRouteHandler,
    getTripHistoryHandler,
    getTripHistoryDetailHandler,
    rateCustomerHandler,
} from "../../controllers/driver/tripController.js";

const router = Router();

// All trip endpoints require an authenticated driver
router.use(requireAuth, requireRole("driver"));

// ─── Static routes (must come before /:bookingId) ─────────────────────────────
router.get("/current",           getCurrentTripValidator,     validateRequest, getCurrentTripHandler);
router.get("/requests/pending",  getPendingRequestsValidator, validateRequest, getPendingRequestsHandler);

// ─── History (static prefix — must come before /:bookingId) ───────────────────
router.get("/history",               historyListValidator,   validateRequest, getTripHistoryHandler);
router.get("/history/:bookingId",    historyDetailValidator, validateRequest, getTripHistoryDetailHandler);

// ─── Single trip: detail ──────────────────────────────────────────────────────
router.get("/:bookingId",        getTripDetailValidator,      validateRequest, getTripDetailHandler);

// ─── Trip lifecycle actions ───────────────────────────────────────────────────
router.post("/:bookingId/accept",   acceptTripValidator,   validateRequest, acceptTripHandler);
router.post("/:bookingId/reject",   rejectTripValidator,   validateRequest, rejectTripHandler);
router.post("/:bookingId/arrived",  arrivedValidator,      validateRequest, arrivedHandler);
router.post("/:bookingId/start",    startTripValidator,    validateRequest, startTripHandler);
router.post("/:bookingId/complete", completeTripValidator, validateRequest, completeTripHandler);
router.post("/:bookingId/cancel",   cancelTripValidator,   validateRequest, cancelTripHandler);

// ─── Chat ─────────────────────────────────────────────────────────────────────
router.get("/:bookingId/chat",  getChatValidator,  validateRequest, getChatHandler);
router.post("/:bookingId/chat", sendChatValidator, validateRequest, sendChatHandler);

// ─── GPS route ────────────────────────────────────────────────────────────────
router.get("/:bookingId/route", getTripRouteValidator, validateRequest, getTripRouteHandler);

// ─── Rate customer ────────────────────────────────────────────────────────────
router.post("/:bookingId/rate-customer", rateCustomerValidator, validateRequest, rateCustomerHandler);

export default router;
