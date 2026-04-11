import { body, param, query } from "express-validator";

export const rentalPackageListValidator = [
    query("service_type")
        .isIn([1, 2, 3, "1", "2", "3"])
        .withMessage("service_type must be 1,2,3")
        .toInt(),
];

export const rentalFareEstimateValidator = [
    body("service_type")
        .isIn([1, 2, 3, "1", "2", "3"])
        .withMessage("service_type must be 1,2,3")
        .toInt(),
    body("package_id")
        .isInt({ min: 1 })
        .withMessage("package_id must be a positive integer")
        .toInt(),
    body("start_datetime")
        .isISO8601()
        .withMessage("start_datetime must be a valid ISO datetime"),
    body("duration_hours")
        .isFloat({ gt: 0 })
        .withMessage("duration_hours must be greater than 0")
        .toFloat(),
    body("distance_km")
        .isFloat({ min: 0 })
        .withMessage("distance_km must be non-negative")
        .toFloat(),
    body("coupon_code")
        .optional({ values: "falsy" })
        .trim()
        .isLength({ min: 3, max: 15 })
        .withMessage("coupon_code must be between 3 and 15 characters"),
];

export const createRentalBookingValidator = [
    body("package_id")
        .isInt({ min: 1 })
        .withMessage("package_id must be a positive integer")
        .toInt(),
    body("service_type")
        .isIn([1, 2, 3, "1", "2", "3"])
        .withMessage("service_type must be 1,2,3")
        .toInt(),
    body("start_datetime")
        .isISO8601()
        .withMessage("start_datetime must be a valid ISO datetime"),
    body("end_datetime")
        .optional({ values: "falsy" })
        .isISO8601()
        .withMessage("end_datetime must be a valid ISO datetime"),
    body("duration_hours")
        .optional({ values: "falsy" })
        .isFloat({ gt: 0 })
        .withMessage("duration_hours must be greater than 0")
        .toFloat(),
    body("distance_km")
        .optional({ values: "falsy" })
        .isFloat({ min: 0 })
        .withMessage("distance_km must be non-negative")
        .toFloat(),
    body("pickup_address")
        .trim()
        .isLength({ min: 3, max: 255 })
        .withMessage("pickup_address must be between 3 and 255 characters"),
    body("dropoff_address")
        .optional({ values: "falsy" })
        .trim()
        .isLength({ max: 255 })
        .withMessage("dropoff_address must not exceed 255 characters"),
    body("payment_type")
        .optional({ values: "falsy" })
        .isIn([1, 2, 3, 4, "1", "2", "3", "4"])
        .withMessage("payment_type must be one of 1,2,3,4")
        .toInt(),
    body("vehicle_id")
        .optional({ values: "falsy" })
        .isInt({ min: 1 })
        .withMessage("vehicle_id must be a positive integer")
        .toInt(),
    body("driver_id")
        .optional({ values: "falsy" })
        .isInt({ min: 1 })
        .withMessage("driver_id must be a positive integer")
        .toInt(),
    body("coupon_code")
        .optional({ values: "falsy" })
        .trim()
        .isLength({ min: 3, max: 15 })
        .withMessage("coupon_code must be between 3 and 15 characters"),
];

export const rentalIdParamValidator = [
    param("rentalId")
        .isInt({ min: 1 })
        .withMessage("rentalId must be a positive integer")
        .toInt(),
];

export const rentalHistoryValidator = [
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

export const cancelRentalValidator = [
    body("reason")
        .optional({ values: "falsy" })
        .trim()
        .isLength({ max: 500 })
        .withMessage("reason must not exceed 500 characters"),
];

export const rentalAvailabilityValidator = [
    query("start_datetime")
        .isISO8601()
        .withMessage("start_datetime must be a valid ISO datetime"),
    query("end_datetime")
        .isISO8601()
        .withMessage("end_datetime must be a valid ISO datetime"),
];
