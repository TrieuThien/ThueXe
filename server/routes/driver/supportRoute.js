/**
 * supportRoute.js
 *
 * Driver-side support / helpdesk endpoints.
 * Mounted at /api/driver/support by driverAppRoute.js.
 *
 * Static routes declared before dynamic /:ticketId params.
 */

import { Router } from "express";
import {
    createTicketHandler,
    getTicketDetailHandler,
    getSupportTopicsHandler,
    listTicketsHandler,
    sendTicketMessageHandler,
} from "../../controllers/driver/supportController.js";
import requireAuth from "../../middlewares/authMiddleware.js";
import requireRole from "../../middlewares/roleMiddleware.js";
import validateRequest from "../../middlewares/validateRequest.js";
import {
    createTicketValidator,
    getTicketDetailValidator,
    getSupportTopicsValidator,
    listTicketsValidator,
    sendTicketMessageValidator,
} from "../../validators/driver/supportValidators.js";

const router = Router();

// All support endpoints require an authenticated driver
router.use(requireAuth, requireRole("driver"));

// ─── Topics ───────────────────────────────────────────────────────────────────
router.get("/topics", getSupportTopicsValidator, validateRequest, getSupportTopicsHandler);

// ─── Tickets: static list before dynamic detail ───────────────────────────────
router.get("/tickets",          listTicketsValidator,    validateRequest, listTicketsHandler);
router.post("/tickets",         createTicketValidator,   validateRequest, createTicketHandler);
router.get("/tickets/:ticketId", getTicketDetailValidator, validateRequest, getTicketDetailHandler);

// ─── Ticket messages ──────────────────────────────────────────────────────────
router.post("/tickets/:ticketId/messages", sendTicketMessageValidator, validateRequest, sendTicketMessageHandler);

export default router;
