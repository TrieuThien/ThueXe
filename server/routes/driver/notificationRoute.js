/**
 * notificationRoute.js
 *
 * Driver notification endpoints.
 * Mounted at /api/driver/notifications by driverAppRoute.js.
 *
 * Static routes (read-all, unread-count) declared BEFORE dynamic /:id
 * to prevent Express from treating those path segments as an id param.
 */

import { Router } from "express";
import {
    listNotificationsHandler,
    markAllReadHandler,
    markOneReadHandler,
    unreadCountHandler,
} from "../../controllers/driver/notificationController.js";
import requireAuth from "../../middlewares/authMiddleware.js";
import requireRole from "../../middlewares/roleMiddleware.js";
import validateRequest from "../../middlewares/validateRequest.js";
import {
    listNotificationsValidator,
    markAllReadValidator,
    markOneReadValidator,
    unreadCountValidator,
} from "../../validators/driver/notificationValidators.js";

const router = Router();

// All notification endpoints require an authenticated driver
router.use(requireAuth, requireRole("driver"));

// ─── Static routes first ──────────────────────────────────────────────────────
router.get("/unread-count", unreadCountValidator,  validateRequest, unreadCountHandler);
router.patch("/read-all",   markAllReadValidator,  validateRequest, markAllReadHandler);

// ─── List ─────────────────────────────────────────────────────────────────────
router.get("/", listNotificationsValidator, validateRequest, listNotificationsHandler);

// ─── Dynamic /:id (must come after all static routes) ────────────────────────
router.patch("/:id/read", markOneReadValidator, validateRequest, markOneReadHandler);

export default router;
