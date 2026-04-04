import { body, param, query } from "express-validator";

export const rentalPackageListValidator = [
    query("service_type").optional({ values: "falsy" }).isIn([1, 2, 3, "1", "2", "3"]).withMessage("service_type must be 1,2,3").toInt(),
    query("active").optional({ values: "falsy" }).isIn([0, 1, "0", "1"]).withMessage("active must be 0 or 1").toInt(),
    query("search").optional({ values: "falsy" }).trim().isLength({ max: 100 }).withMessage("search must not exceed 100 characters"),
];

export const createRentalPackageValidator = [
    body("type_id").optional({ values: "falsy" }).isInt({ min: 1 }).withMessage("type_id must be a positive integer").toInt(),
    body("service_type").isIn([1, 2, 3, "1", "2", "3"]).withMessage("service_type must be 1,2,3").toInt(),
    body("package_name").trim().isLength({ min: 2, max: 50 }).withMessage("package_name must be between 2 and 50 characters"),
    body("duration_hours").optional({ values: "falsy" }).isInt({ min: 1 }).withMessage("duration_hours must be a positive integer").toInt(),
    body("duration_days").optional({ values: "falsy" }).isInt({ min: 1 }).withMessage("duration_days must be a positive integer").toInt(),
    body("price").isFloat({ min: 0 }).withMessage("price must be non-negative").toFloat(),
    body("distance_limit_km").optional({ values: "falsy" }).isInt({ min: 0 }).withMessage("distance_limit_km must be non-negative").toInt(),
    body("extra_km_fee").optional({ values: "falsy" }).isFloat({ min: 0 }).withMessage("extra_km_fee must be non-negative").toFloat(),
    body("extra_hour_fee").optional({ values: "falsy" }).isFloat({ min: 0 }).withMessage("extra_hour_fee must be non-negative").toFloat(),
    body("deposit_amount").optional({ values: "falsy" }).isFloat({ min: 0 }).withMessage("deposit_amount must be non-negative").toFloat(),
    body("description").optional({ values: "falsy" }).trim().isLength({ max: 255 }).withMessage("description must not exceed 255 characters"),
    body("active").optional({ values: "falsy" }).isIn([0, 1, "0", "1"]).withMessage("active must be 0 or 1").toInt(),
];

export const updateRentalPackageValidator = [
    param("packageId").isInt({ min: 1 }).withMessage("packageId must be a positive integer").toInt(),
    body("type_id").optional({ values: "falsy" }).isInt({ min: 1 }).withMessage("type_id must be a positive integer").toInt(),
    body("service_type").optional({ values: "falsy" }).isIn([1, 2, 3, "1", "2", "3"]).withMessage("service_type must be 1,2,3").toInt(),
    body("package_name").optional({ values: "falsy" }).trim().isLength({ min: 2, max: 50 }).withMessage("package_name must be between 2 and 50 characters"),
    body("duration_hours").optional({ values: "falsy" }).isInt({ min: 1 }).withMessage("duration_hours must be a positive integer").toInt(),
    body("duration_days").optional({ values: "falsy" }).isInt({ min: 1 }).withMessage("duration_days must be a positive integer").toInt(),
    body("price").optional({ values: "falsy" }).isFloat({ min: 0 }).withMessage("price must be non-negative").toFloat(),
    body("distance_limit_km").optional({ values: "falsy" }).isInt({ min: 0 }).withMessage("distance_limit_km must be non-negative").toInt(),
    body("extra_km_fee").optional({ values: "falsy" }).isFloat({ min: 0 }).withMessage("extra_km_fee must be non-negative").toFloat(),
    body("extra_hour_fee").optional({ values: "falsy" }).isFloat({ min: 0 }).withMessage("extra_hour_fee must be non-negative").toFloat(),
    body("deposit_amount").optional({ values: "falsy" }).isFloat({ min: 0 }).withMessage("deposit_amount must be non-negative").toFloat(),
    body("description").optional({ values: "falsy" }).trim().isLength({ max: 255 }).withMessage("description must not exceed 255 characters"),
    body("active").optional({ values: "falsy" }).isIn([0, 1, "0", "1"]).withMessage("active must be 0 or 1").toInt(),
];

export const rentalMetaValidator = [
    query("type_id").optional({ values: "falsy" }).isInt({ min: 1 }).withMessage("type_id must be a positive integer").toInt(),
    query("owner_id").optional({ values: "falsy" }).isInt({ min: 1 }).withMessage("owner_id must be a positive integer").toInt(),
    query("route_id").optional({ values: "falsy" }).isInt({ min: 1 }).withMessage("route_id must be a positive integer").toInt(),
    query("ride_id").optional({ values: "falsy" }).isInt({ min: 1 }).withMessage("ride_id must be a positive integer").toInt(),
];

export const createRentalBookingValidator = [
    body("user_id").optional({ values: "falsy" }).isInt({ min: 1 }).withMessage("user_id must be a positive integer").toInt(),
    body("vehicle_id").optional({ values: "falsy" }).isInt({ min: 1 }).withMessage("vehicle_id must be a positive integer").toInt(),
    body("driver_id").optional({ values: "falsy" }).isInt({ min: 1 }).withMessage("driver_id must be a positive integer").toInt(),
    body("package_id").optional({ values: "falsy" }).isInt({ min: 1 }).withMessage("package_id must be a positive integer").toInt(),
    body("service_type").isIn([1, 2, 3, "1", "2", "3"]).withMessage("service_type must be 1,2,3").toInt(),
    body("start_datetime").isISO8601().withMessage("start_datetime must be a valid ISO datetime"),
    body("end_datetime").isISO8601().withMessage("end_datetime must be a valid ISO datetime"),
    body("pickup_address").trim().isLength({ min: 3, max: 255 }).withMessage("pickup_address must be between 3 and 255 characters"),
    body("pickup_long").optional({ values: "falsy" }).isFloat({ min: -180, max: 180 }).withMessage("pickup_long must be valid longitude").toFloat(),
    body("pickup_lat").optional({ values: "falsy" }).isFloat({ min: -90, max: 90 }).withMessage("pickup_lat must be valid latitude").toFloat(),
    body("dropoff_address").optional({ values: "falsy" }).trim().isLength({ max: 255 }).withMessage("dropoff_address must not exceed 255 characters"),
    body("dropoff_long").optional({ values: "falsy" }).isFloat({ min: -180, max: 180 }).withMessage("dropoff_long must be valid longitude").toFloat(),
    body("dropoff_lat").optional({ values: "falsy" }).isFloat({ min: -90, max: 90 }).withMessage("dropoff_lat must be valid latitude").toFloat(),
    body("base_price").optional({ values: "falsy" }).isFloat({ min: 0 }).withMessage("base_price must be non-negative").toFloat(),
    body("distance_limit_km").optional({ values: "falsy" }).isInt({ min: 0 }).withMessage("distance_limit_km must be non-negative").toInt(),
    body("deposit_amount").optional({ values: "falsy" }).isFloat({ min: 0 }).withMessage("deposit_amount must be non-negative").toFloat(),
    body("payment_type").optional({ values: "falsy" }).isIn([1, 2, 3, 4, "1", "2", "3", "4"]).withMessage("payment_type must be 1,2,3,4").toInt(),
];

export const rentalBookingListValidator = [
    query("page").optional({ values: "falsy" }).isInt({ min: 1 }).withMessage("page must be a positive integer").toInt(),
    query("limit").optional({ values: "falsy" }).isInt({ min: 1, max: 100 }).withMessage("limit must be between 1 and 100").toInt(),
    query("status").optional({ values: "falsy" }).isIn(["scheduled", "pending", "in_progress", "completed", "cancelled"]).withMessage("status is invalid"),
    query("service_type").optional({ values: "falsy" }).isIn([1, 2, 3, "1", "2", "3"]).withMessage("service_type must be 1,2,3").toInt(),
    query("search").optional({ values: "falsy" }).trim().isLength({ max: 100 }).withMessage("search must not exceed 100 characters"),
];

export const rentalIdParamValidator = [
    param("rentalId").isInt({ min: 1 }).withMessage("rentalId must be a positive integer").toInt(),
];

export const updateRentalStatusValidator = [
    ...rentalIdParamValidator,
    body("status").isIn(["scheduled", "pending", "in_progress", "completed", "cancelled"]).withMessage("status is invalid"),
    body("cancel_reason").optional({ values: "falsy" }).trim().isLength({ max: 500 }).withMessage("cancel_reason must not exceed 500 characters"),
    body("actual_end_datetime").optional({ values: "falsy" }).isISO8601().withMessage("actual_end_datetime must be valid ISO datetime"),
    body("distance_travelled_km").optional({ values: "falsy" }).isFloat({ min: 0 }).withMessage("distance_travelled_km must be non-negative").toFloat(),
    body("extra_hour_fee").optional({ values: "falsy" }).isFloat({ min: 0 }).withMessage("extra_hour_fee must be non-negative").toFloat(),
    body("extra_km_fee").optional({ values: "falsy" }).isFloat({ min: 0 }).withMessage("extra_km_fee must be non-negative").toFloat(),
    body("deposit_amount").optional({ values: "falsy" }).isFloat({ min: 0 }).withMessage("deposit_amount must be non-negative").toFloat(),
];

export const assignRentalValidator = [
    ...rentalIdParamValidator,
    body("driver_id").optional({ values: "falsy" }).isInt({ min: 1 }).withMessage("driver_id must be a positive integer").toInt(),
    body("vehicle_id").optional({ values: "falsy" }).isInt({ min: 1 }).withMessage("vehicle_id must be a positive integer").toInt(),
];
