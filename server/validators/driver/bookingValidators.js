import { body, param, query } from "express-validator";

// Terminal booking statuses a driver can filter history by
const ALLOWED_HISTORY_STATUSES = [2, 3, 4, 5];

function normalizeBooleanLike(value) {
    if (value === undefined || value === null || value === "") return undefined;
    if (typeof value === "boolean") return value ? 1 : 0;
    const s = String(value).trim().toLowerCase();
    if (["1", "true", "yes"].includes(s)) return 1;
    if (["0", "false", "no"].includes(s)) return 0;
    return value;
}

// ─── Shared param validator ───────────────────────────────────────────────────

const bookingIdParam = param("bookingId")
    .isInt({ min: 1 })
    .withMessage("bookingId must be a positive integer")
    .toInt();

// ─── Validators ───────────────────────────────────────────────────────────────

export const getActiveBookingValidator = [];

export const getBookingHistoryValidator = [
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
        .toInt()
        .custom((value) => {
            if (!ALLOWED_HISTORY_STATUSES.includes(Number(value))) {
                throw new Error(
                    `status must be one of ${ALLOWED_HISTORY_STATUSES.join(", ")}`
                );
            }
            return true;
        }),
];

export const getBookingDetailValidator = [bookingIdParam];

export const acceptBookingValidator = [bookingIdParam];

export const rejectBookingValidator = [bookingIdParam];

export const markArrivedValidator = [bookingIdParam];

export const startRideValidator = [bookingIdParam];

export const completeRideValidator = [
    bookingIdParam,
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

export const cancelRideValidator = [
    bookingIdParam,
    body("cancel_comment")
        .optional({ values: "falsy" })
        .trim()
        .isLength({ max: 500 })
        .withMessage("cancel_comment must not exceed 500 characters"),
];
