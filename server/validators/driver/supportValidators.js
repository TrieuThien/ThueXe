import { body, param, query } from "express-validator";

const paginationValidators = [
    query("page")
        .optional({ values: "falsy" })
        .isInt({ min: 1 })
        .withMessage("page must be a positive integer")
        .toInt(),
    query("limit")
        .optional({ values: "falsy" })
        .isInt({ min: 1, max: 100 })
        .withMessage("limit must be between 1 and 100")
        .toInt(),
];

const ticketIdParam = param("ticketId")
    .isInt({ min: 1 })
    .withMessage("ticketId must be a positive integer")
    .toInt();

// ─── Topics ───────────────────────────────────────────────────────────────────

export const getSupportTopicsValidator = [];

// ─── Tickets ──────────────────────────────────────────────────────────────────

export const createTicketValidator = [
    body("subject")
        .trim()
        .isLength({ min: 1, max: 255 })
        .withMessage("subject must be between 1 and 255 characters"),
    body("message")
        .trim()
        .isLength({ min: 1, max: 5000 })
        .withMessage("message must be between 1 and 5000 characters"),
    body("cat_id")
        .optional({ values: "falsy" })
        .isInt({ min: 1 })
        .withMessage("cat_id must be a positive integer")
        .toInt(),
];

export const listTicketsValidator = [
    ...paginationValidators,
    query("status")
        .optional({ values: "falsy" })
        .isIn(["open", "closed"])
        .withMessage("status must be 'open' or 'closed'"),
];

export const getTicketDetailValidator = [ticketIdParam];

export const sendTicketMessageValidator = [
    ticketIdParam,
    body("message")
        .trim()
        .isLength({ min: 1, max: 5000 })
        .withMessage("message must be between 1 and 5000 characters"),
];
