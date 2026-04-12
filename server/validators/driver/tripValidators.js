import { body, param, query } from "express-validator";

// ─── Shared ───────────────────────────────────────────────────────────────────

const bookingIdParam = param("bookingId")
    .isInt({ min: 1 })
    .withMessage("bookingId must be a positive integer")
    .toInt();

// Optional GPS coordinates — reused by arrived, start, complete
const optionalCoords = [
    body("lat")
        .optional()
        .isFloat({ min: -90, max: 90 })
        .withMessage("lat must be a valid latitude (-90 to 90)")
        .toFloat(),
    body("long")
        .optional()
        .isFloat({ min: -180, max: 180 })
        .withMessage("long must be a valid longitude (-180 to 180)")
        .toFloat(),
];

// ─── GET /trips/current ───────────────────────────────────────────────────────
export const getCurrentTripValidator = [];

// ─── GET /trips/requests/pending ──────────────────────────────────────────────
export const getPendingRequestsValidator = [];

// ─── Trip param-only actions ──────────────────────────────────────────────────
export const acceptTripValidator  = [bookingIdParam];
export const rejectTripValidator  = [bookingIdParam];
export const getTripDetailValidator = [bookingIdParam];
export const getChatValidator     = [bookingIdParam];
export const getTripRouteValidator = [bookingIdParam];

// ─── POST /:bookingId/arrived ─────────────────────────────────────────────────
export const arrivedValidator = [bookingIdParam, ...optionalCoords];

// ─── POST /:bookingId/start ───────────────────────────────────────────────────
export const startTripValidator = [bookingIdParam, ...optionalCoords];

// ─── POST /:bookingId/complete ────────────────────────────────────────────────
export const completeTripValidator = [
    bookingIdParam,
    ...optionalCoords,
    body("actual_cost")
        .optional({ values: "falsy" })
        .isFloat({ min: 0 })
        .withMessage("actual_cost must be a non-negative number")
        .toFloat(),
    body("distance_travelled")
        .optional({ values: "falsy" })
        .isFloat({ min: 0 })
        .withMessage("distance_travelled must be a non-negative number")
        .toFloat(),
];

// ─── POST /:bookingId/cancel ──────────────────────────────────────────────────
export const cancelTripValidator = [
    bookingIdParam,
    body("cancel_comment")
        .optional({ values: "falsy" })
        .trim()
        .isLength({ max: 500 })
        .withMessage("cancel_comment must not exceed 500 characters"),
];

// ─── POST /:bookingId/chat ────────────────────────────────────────────────────
export const sendChatValidator = [
    bookingIdParam,
    body("message")
        .trim()
        .isLength({ min: 1, max: 1000 })
        .withMessage("message must be 1-1000 characters"),
];

// ─── GET /trips/history ───────────────────────────────────────────────────────
export const historyListValidator = [
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
    query("status")
        .optional({ values: "falsy" })
        .isInt()
        .withMessage("status must be an integer")
        .toInt(),
    query("fromDate")
        .optional({ values: "falsy" })
        .isDate()
        .withMessage("fromDate must be a valid date (YYYY-MM-DD)"),
    query("toDate")
        .optional({ values: "falsy" })
        .isDate()
        .withMessage("toDate must be a valid date (YYYY-MM-DD)"),
    query("keyword")
        .optional({ values: "falsy" })
        .trim()
        .isLength({ max: 100 })
        .withMessage("keyword must not exceed 100 characters"),
];

// ─── GET /trips/history/:bookingId ────────────────────────────────────────────
export const historyDetailValidator = [bookingIdParam];

// ─── POST /:bookingId/rate-customer ───────────────────────────────────────────
export const rateCustomerValidator = [
    bookingIdParam,
    body("rating")
        .notEmpty()
        .withMessage("rating is required")
        .isInt({ min: 1, max: 5 })
        .withMessage("rating must be an integer from 1 to 5")
        .toInt(),
    body("comment")
        .optional({ values: "null" })
        .trim()
        .isLength({ max: 500 })
        .withMessage("comment must not exceed 500 characters"),
];
