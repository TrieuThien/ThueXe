import { body, param } from "express-validator";

export const updateMyDriverLocationValidator = [
    body("lat").isFloat({ min: -90, max: 90 }).withMessage("lat must be in range -90..90").toFloat(),
    body("long").isFloat({ min: -180, max: 180 }).withMessage("long must be in range -180..180").toFloat(),
    body("b_angle").optional({ values: "falsy" }).isFloat({ min: 0, max: 360 }).withMessage("b_angle must be between 0 and 360").toFloat(),
    body("loc_static_status").optional({ values: "falsy" }).isIn([0, 1, "0", "1"]).withMessage("loc_static_status must be 0 or 1").toInt(),
    body("loc_static_duration").optional({ values: "falsy" }).isInt({ min: 0 }).withMessage("loc_static_duration must be non-negative").toInt(),
];

export const driverIdParamValidator = [
    param("driverId").isInt({ min: 1 }).withMessage("driverId must be a positive integer").toInt(),
];

export const bookingIdParamValidator = [
    param("bookingId").isInt({ min: 1 }).withMessage("bookingId must be a positive integer").toInt(),
];

export const appendDriverRoutePointValidator = [
    ...bookingIdParamValidator,
    body("lat").isFloat({ min: -90, max: 90 }).withMessage("lat must be in range -90..90").toFloat(),
    body("long").isFloat({ min: -180, max: 180 }).withMessage("long must be in range -180..180").toFloat(),
    body("b_angle").optional({ values: "falsy" }).isFloat({ min: 0, max: 360 }).withMessage("b_angle must be between 0 and 360").toFloat(),
];

