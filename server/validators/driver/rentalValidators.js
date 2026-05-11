import { body, param, query } from "express-validator";

// ─── Shared ───────────────────────────────────────────────────────────────────

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

const dateRangeValidators = [
    query("fromDate")
        .optional({ values: "falsy" })
        .isDate()
        .withMessage("fromDate must be a valid date (YYYY-MM-DD)"),
    query("toDate")
        .optional({ values: "falsy" })
        .isDate()
        .withMessage("toDate must be a valid date (YYYY-MM-DD)"),
];

const scheduleIdParam = param("scheduleId")
    .isInt({ min: 1 })
    .withMessage("scheduleId must be a positive integer")
    .toInt();

const rentalIdParam = param("rentalId")
    .isInt({ min: 1 })
    .withMessage("rentalId must be a positive integer")
    .toInt();

const optionalCoords = [
    body("location_long")
        .optional({ values: "null" })
        .isFloat({ min: -180, max: 180 })
        .withMessage("location_long must be a valid longitude (-180 to 180)")
        .toFloat(),
    body("location_lat")
        .optional({ values: "null" })
        .isFloat({ min: -90, max: 90 })
        .withMessage("location_lat must be a valid latitude (-90 to 90)")
        .toFloat(),
];

const VALID_SCHEDULE_STATUSES = ["available", "booked", "unavailable"];
const VALID_RENTAL_STATUSES   = ["scheduled", "pending", "in_progress", "completed", "cancelled"];

// ─── Schedule availability ────────────────────────────────────────────────────

export const getAvailabilityValidator = [
    ...paginationValidators,
    ...dateRangeValidators,
    query("status")
        .optional({ values: "falsy" })
        .isIn(VALID_SCHEDULE_STATUSES)
        .withMessage(`status must be one of: ${VALID_SCHEDULE_STATUSES.join(", ")}`),
];

export const createAvailabilityValidator = [
    body("start_datetime")
        .notEmpty()
        .withMessage("start_datetime is required")
        .isISO8601()
        .withMessage("start_datetime must be a valid ISO 8601 datetime"),
    body("end_datetime")
        .notEmpty()
        .withMessage("end_datetime is required")
        .isISO8601()
        .withMessage("end_datetime must be a valid ISO 8601 datetime"),
    ...optionalCoords,
    body("status")
        .optional({ values: "falsy" })
        .isIn(["available", "unavailable"])
        .withMessage("status must be 'available' or 'unavailable'"),
];

export const patchAvailabilityValidator = [
    scheduleIdParam,
    body("start_datetime")
        .optional({ values: "falsy" })
        .isISO8601()
        .withMessage("start_datetime must be a valid ISO 8601 datetime"),
    body("end_datetime")
        .optional({ values: "falsy" })
        .isISO8601()
        .withMessage("end_datetime must be a valid ISO 8601 datetime"),
    ...optionalCoords,
    body("status")
        .optional({ values: "falsy" })
        .isIn(["available", "unavailable"])
        .withMessage("status must be 'available' or 'unavailable' (cannot set to 'booked')"),
];

export const deleteAvailabilityValidator = [scheduleIdParam];

// ─── Rental bookings ──────────────────────────────────────────────────────────

export const getRentalBookingsValidator = [
    ...paginationValidators,
    ...dateRangeValidators,
    query("status")
        .optional({ values: "falsy" })
        .isIn(VALID_RENTAL_STATUSES)
        .withMessage(`status must be one of: ${VALID_RENTAL_STATUSES.join(", ")}`),
    query("service_type")
        .optional({ values: "falsy" })
        .isInt({ min: 1, max: 3 })
        .withMessage("service_type must be 1, 2, or 3")
        .toInt(),
];

export const getRentalBookingDetailValidator = [rentalIdParam];

export const acceptRentalBookingValidator  = [rentalIdParam];
export const startRentalBookingValidator   = [rentalIdParam];
export const arrivedRentalBookingValidator = [rentalIdParam];
export const pauseRentalBookingValidator   = [rentalIdParam];
export const resumeRentalBookingValidator  = [rentalIdParam];
export const getRentalSummaryValidator     = [rentalIdParam];

export const completeRentalBookingValidator = [
    rentalIdParam,
    body("distance_travelled_km")
        .optional({ values: "falsy" })
        .isInt({ min: 0 })
        .withMessage("distance_travelled_km must be a non-negative integer")
        .toInt(),
];
