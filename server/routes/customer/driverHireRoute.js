/**
 * routes/customer/driverHireRoute.js
 *
 * Luồng thuê tài xế cho customer.
 * Mounted at /api/customer/driver-hire by customerRoute.mjs
 */

import { Router } from "express";
import requireAuth from "../../middlewares/authMiddleware.js";
import requireRole from "../../middlewares/roleMiddleware.js";
import validateRequest from "../../middlewares/validateRequest.js";
import {
    createDriverHireHandler,
    getDriverHireStatusHandler,
    cancelDriverSearchHandler,
    driverRespondToRequestHandler,
} from "../../controllers/customer/driverHireController.js";
import {
    bookingIdParamValidator,
    createDriverHireValidator,
    driverRespondValidator,
} from "../../validators/customer/driverHireValidators.js";

const router = Router();

// ─── Customer endpoints ────────────────────────────────────────────────────────

// POST /api/customer/driver-hire — Đặt thuê tài xế ngay hoặc lịch hẹn
router.post(
    "/",
    requireAuth,
    requireRole("passenger", "customer"),
    createDriverHireValidator,
    validateRequest,
    createDriverHireHandler
);

// GET /api/customer/driver-hire/:bookingId — Polling trạng thái tìm tài xế
router.get(
    "/:bookingId",
    requireAuth,
    requireRole("passenger", "customer"),
    bookingIdParamValidator,
    validateRequest,
    getDriverHireStatusHandler
);

// POST /api/customer/driver-hire/:bookingId/cancel — Khách hủy khi đang tìm
router.post(
    "/:bookingId/cancel",
    requireAuth,
    requireRole("passenger", "customer"),
    bookingIdParamValidator,
    validateRequest,
    cancelDriverSearchHandler
);

// ─── Driver endpoint: phản hồi yêu cầu ───────────────────────────────────────

// POST /api/customer/driver-hire/requests/:requestId/respond
router.post(
    "/requests/:requestId/respond",
    requireAuth,
    requireRole("driver"),
    driverRespondValidator,
    validateRequest,
    driverRespondToRequestHandler
);

export default router;
