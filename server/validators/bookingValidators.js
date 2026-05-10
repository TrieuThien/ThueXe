import { body, param, query } from "express-validator";

function normalizeBooleanLike(value) {
    if (value === undefined || value === null || value === "") {
        return undefined;
    }

    if (typeof value === "boolean") {
        return value ? 1 : 0;
    }

    const normalized = String(value).trim().toLowerCase();

    if (["1", "true", "yes", "on"].includes(normalized)) {
        return 1;
    }

    if (["0", "false", "no", "off"].includes(normalized)) {
        return 0;
    }

    return value;
}

const optionalAddress = (fieldName) =>
    body(fieldName)
        .optional({ values: "falsy" })
        .trim()
        .isLength({ max: 255 })
        .withMessage(`${fieldName} must not exceed 255 characters`);

const optionalCoordinate = (fieldName) =>
    body(fieldName)
        .optional({ values: "falsy" })
        .trim()
        .isLength({ max: 30 })
        .withMessage(`${fieldName} must not exceed 30 characters`)
        .matches(/^-?\d+(\.\d+)?$/)
        .withMessage(`${fieldName} must be a valid coordinate`);

export const createBookingValidator = [
    body("user_id")
        .optional({ values: "falsy" })
        .isInt({ min: 1 })
        .withMessage("user_id must be a positive integer")
        .toInt(),
    body("pickup_datetime")
        .optional({ values: "falsy" })
        .isISO8601()
        .withMessage("pickup_datetime must be a valid ISO datetime"),
    body("pickup_address")
        .trim()
        .isLength({ min: 3, max: 255 })
        .withMessage("pickup_address must be between 3 and 255 characters"),
    optionalCoordinate("pickup_long"),
    optionalCoordinate("pickup_lat"),
    body("dropoff_address")
        .trim()
        .isLength({ min: 3, max: 255 })
        .withMessage("dropoff_address must be between 3 and 255 characters"),
    optionalCoordinate("dropoff_long"),
    optionalCoordinate("dropoff_lat"),
    optionalAddress("waypoint1_address"),
    optionalCoordinate("waypoint1_long"),
    optionalCoordinate("waypoint1_lat"),
    optionalAddress("waypoint2_address"),
    optionalCoordinate("waypoint2_long"),
    optionalCoordinate("waypoint2_lat"),
    body("est_distance")
        .optional({ values: "falsy" })
        .isFloat({ min: 0 })
        .withMessage("est_distance must be a non-negative number")
        .toFloat(),
    body("est_duration")
        .optional({ values: "falsy" })
        .isFloat({ min: 0 })
        .withMessage("est_duration must be a non-negative number")
        .toFloat(),
    body("estimated_cost")
        .optional({ values: "falsy" })
        .isFloat({ min: 0 })
        .withMessage("estimated_cost must be a non-negative number")
        .toFloat(),
    body("actual_cost")
        .optional({ values: "falsy" })
        .isFloat({ min: 0 })
        .withMessage("actual_cost must be a non-negative number")
        .toFloat(),
    body("route_id")
        .isInt({ min: 1 })
        .withMessage("route_id must be a positive integer")
        .toInt(),
    body("ride_id")
        .isInt({ min: 1 })
        .withMessage("ride_id must be a positive integer")
        .toInt(),
    body("payment_type")
        .optional({ values: "falsy" })
        .isIn([1, 2, 3, 4, "1", "2", "3", "4"])
        .withMessage("payment_type must be one of 1,2,3,4")
        .toInt(),
    body("scheduled")
        .optional({ values: "falsy" })
        .customSanitizer(normalizeBooleanLike)
        .isIn([0, 1])
        .withMessage("scheduled must be 0 or 1"),
    body("scheduled_driver")
        .optional({ values: "falsy" })
        .isInt({ min: 0 })
        .withMessage("scheduled_driver must be a non-negative integer")
        .toInt(),
    body("auto_dispatch")
        .optional({ values: "falsy" })
        .customSanitizer(normalizeBooleanLike)
        .isIn([0, 1])
        .withMessage("auto_dispatch must be 0 or 1"),
    body("num_seats")
        .optional({ values: "falsy" })
        .isInt({ min: 1, max: 10 })
        .withMessage("num_seats must be between 1 and 10")
        .toInt(),
    body("cur_symbol")
        .optional({ values: "falsy" })
        .trim()
        .isLength({ max: 10 })
        .withMessage("cur_symbol must not exceed 10 characters"),
    body("cur_code")
        .optional({ values: "falsy" })
        .trim()
        .isLength({ min: 3, max: 4 })
        .withMessage("cur_code must be between 3 and 4 characters"),
];

export const getBookingListValidator = [
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
        .isInt({ min: 0, max: 6 })
        .withMessage("status must be between 0 and 6")
        .toInt(),
    query("user_id")
        .optional({ values: "falsy" })
        .isInt({ min: 1 })
        .withMessage("user_id must be a positive integer")
        .toInt(),
    query("booking_type")
        .optional({ values: "falsy" })
        .isIn([0, 1, "0", "1"])
        .withMessage("booking_type must be 0 or 1")
        .toInt(),
    query("booking_code")
        .optional({ values: "falsy" })
        .trim()
        .isLength({ max: 100 })
        .withMessage("booking_code must not exceed 100 characters"),
    query("customer_name")
        .optional({ values: "falsy" })
        .trim()
        .isLength({ max: 100 })
        .withMessage("customer_name must not exceed 100 characters"),
    query("customer_phone")
        .optional({ values: "falsy" })
        .trim()
        .isLength({ max: 30 })
        .withMessage("customer_phone must not exceed 30 characters"),
    query("driver_keyword")
        .optional({ values: "falsy" })
        .trim()
        .isLength({ max: 100 })
        .withMessage("driver_keyword must not exceed 100 characters"),
    query("booking_date")
        .optional({ values: "falsy" })
        .matches(/^\d{4}-\d{2}-\d{2}$/)
        .withMessage("booking_date must be YYYY-MM-DD"),
    query("payment_type")
        .optional({ values: "falsy" })
        .isIn([1, 2, 3, 4, "1", "2", "3", "4"])
        .withMessage("payment_type must be one of 1,2,3,4")
        .toInt(),
    query("search")
        .optional({ values: "falsy" })
        .trim()
        .isLength({ max: 100 })
        .withMessage("search must not exceed 100 characters"),
    query("scheduled_only")
        .optional({ values: "falsy" })
        .customSanitizer(normalizeBooleanLike)
        .isIn([0, 1])
        .withMessage("scheduled_only must be 0 or 1"),
    query("processing_only")
        .optional({ values: "falsy" })
        .customSanitizer(normalizeBooleanLike)
        .isIn([0, 1])
        .withMessage("processing_only must be 0 or 1"),
    query("sort_by")
        .optional({ values: "falsy" })
        .isIn(["date_created", "pickup_datetime", "status", "estimated_cost", "id"])
        .withMessage("sort_by is invalid"),
    query("sort_order")
        .optional({ values: "falsy" })
        .isIn(["ASC", "DESC", "asc", "desc"])
        .withMessage("sort_order must be ASC or DESC"),
];

export const getBookingDetailValidator = [
    param("bookingId")
        .isInt({ min: 1 })
        .withMessage("bookingId must be a positive integer")
        .toInt(),
];

export const assignDriverValidator = [
    param("bookingId")
        .isInt({ min: 1 })
        .withMessage("bookingId must be a positive integer")
        .toInt(),
    body("driver_id")
        .isInt({ min: 1 })
        .withMessage("driver_id must be a positive integer")
        .toInt(),
];

export const updateBookingStatusValidator = [
    param("bookingId")
        .isInt({ min: 1 })
        .withMessage("bookingId must be a positive integer")
        .toInt(),
    body("status")
        .isInt({ min: 0, max: 6 })
        .withMessage("status must be between 0 and 6")
        .toInt(),
    body("cancel_comment")
        .optional({ values: "falsy" })
        .trim()
        .isLength({ max: 1000 })
        .withMessage("cancel_comment must not exceed 1000 characters"),
];

export const listAssignableDriversValidator = [
    query("route_id")
        .customSanitizer((v) => (v === "0" || v === "" ? undefined : v))
        .optional()
        .isInt({ min: 1 })
        .withMessage("route_id must be a positive integer")
        .toInt(),
    query("ride_id")
        .customSanitizer((v) => (v === "0" || v === "" ? undefined : v))
        .optional()
        .isInt({ min: 1 })
        .withMessage("ride_id must be a positive integer")
        .toInt(),
    query("limit")
        .optional({ values: "falsy" })
        .isInt({ min: 1, max: 100 })
        .withMessage("limit must be between 1 and 100")
        .toInt(),
    query("search")
        .optional({ values: "falsy" })
        .trim()
        .isLength({ max: 100 })
        .withMessage("search must not exceed 100 characters"),
];

export const getBookingMetaValidator = [];

export const getBookingLocationSuggestionsValidator = [
    query("keyword")
        .optional({ values: "falsy" })
        .trim()
        .isLength({ max: 200 })
        .withMessage("keyword must not exceed 200 characters"),
    query("limit")
        .optional({ values: "falsy" })
        .isInt({ min: 1, max: 20 })
        .withMessage("limit must be between 1 and 20")
        .toInt(),
];

export const estimateBookingRouteValidator = [
    query("pickup_lat")
        .exists()
        .withMessage("pickup_lat is required")
        .isFloat({ min: -90, max: 90 })
        .withMessage("pickup_lat must be in range -90..90")
        .toFloat(),
    query("pickup_lng")
        .exists()
        .withMessage("pickup_lng is required")
        .isFloat({ min: -180, max: 180 })
        .withMessage("pickup_lng must be in range -180..180")
        .toFloat(),
    query("dropoff_lat")
        .exists()
        .withMessage("dropoff_lat is required")
        .isFloat({ min: -90, max: 90 })
        .withMessage("dropoff_lat must be in range -90..90")
        .toFloat(),
    query("dropoff_lng")
        .exists()
        .withMessage("dropoff_lng is required")
        .isFloat({ min: -180, max: 180 })
        .withMessage("dropoff_lng must be in range -180..180")
        .toFloat(),
    query("route_scope")
        .optional({ values: "falsy" })
        .isIn([0, 1, "0", "1"])
        .withMessage("route_scope must be 0 or 1")
        .toInt(),
];

export const quoteBookingPriceValidator = [
    body("route_id")
        .isInt({ min: 1 })
        .withMessage("route_id must be a positive integer")
        .toInt(),
    body("ride_id")
        .isInt({ min: 1 })
        .withMessage("ride_id must be a positive integer")
        .toInt(),
    body("distance_km")
        .optional({ values: "falsy" })
        .isFloat({ min: 0 })
        .withMessage("distance_km must be a non-negative number")
        .toFloat(),
    body("duration_min")
        .optional({ values: "falsy" })
        .isFloat({ min: 0 })
        .withMessage("duration_min must be a non-negative number")
        .toFloat(),
    body("pickup_lat")
        .optional({ values: "falsy" })
        .isFloat({ min: -90, max: 90 })
        .withMessage("pickup_lat must be in range -90..90")
        .toFloat(),
    body("pickup_lng")
        .optional({ values: "falsy" })
        .isFloat({ min: -180, max: 180 })
        .withMessage("pickup_lng must be in range -180..180")
        .toFloat(),
    body("dropoff_lat")
        .optional({ values: "falsy" })
        .isFloat({ min: -90, max: 90 })
        .withMessage("dropoff_lat must be in range -90..90")
        .toFloat(),
    body("dropoff_lng")
        .optional({ values: "falsy" })
        .isFloat({ min: -180, max: 180 })
        .withMessage("dropoff_lng must be in range -180..180")
        .toFloat(),
    body("pickup_datetime")
        .optional({ values: "falsy" })
        .isISO8601()
        .withMessage("pickup_datetime must be a valid ISO datetime"),
];
