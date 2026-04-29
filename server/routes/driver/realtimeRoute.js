import { Router } from "express";
import requireAuth from "../../middlewares/authMiddleware.js";
import { registerRealtimeSse } from "../../utils/realtime.js";

const router = Router();

/**
 * GET /api/driver/realtime
 * Server-Sent Events stream for driver — delivers NEW_RIDE_REQUEST, NEW_DRIVER_RENT_REQUEST, etc.
 */
router.get("/", requireAuth, (req, res) => {
    const driverId = Number(req.auth?.userId || 0);
    if (!driverId) {
        return res.status(403).json({ error: "Forbidden" });
    }

    const eventNames = req.query.events
        ? String(req.query.events).split(",").map((e) => e.trim()).filter(Boolean)
        : null;

    registerRealtimeSse({
        userId: driverId,
        events: eventNames,
        req,
        res,
    });
});

export default router;
