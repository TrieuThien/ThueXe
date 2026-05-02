import { Router } from "express";
import requireAuthSse from "../middlewares/requireAuthSse.js";
import { registerRealtimeSse } from "../utils/realtime.js";

const router = Router();

router.get("/api/owner/realtime", requireAuthSse, (req, res) => {
    if (req.auth.role !== "owner") {
        return res.status(403).json({ error: "Forbidden" });
    }

    const eventNames = req.query.events
        ? String(req.query.events).split(",").map((e) => e.trim()).filter(Boolean)
        : null;

    registerRealtimeSse({
        userId: req.auth.userId,
        events: eventNames,
        req,
        res,
    });
});

export default router;
