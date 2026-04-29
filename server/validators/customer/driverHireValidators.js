import { body, param } from "express-validator";

export const createDriverHireValidator = [
    body("package_id")
        .isInt({ min: 1 })
        .withMessage("package_id phải là số nguyên dương")
        .toInt(),
    body("booking_type")
        .isIn(["immediate", "scheduled"])
        .withMessage("booking_type phải là immediate hoặc scheduled"),
    body("schedule_time")
        .optional({ nullable: true })
        .isISO8601()
        .withMessage("schedule_time phải là ISO 8601"),
    body("pickup_address")
        .trim()
        .isLength({ min: 3 })
        .withMessage("pickup_address bắt buộc"),
    body("pickup_lat")
        .isFloat({ min: -90, max: 90 })
        .withMessage("pickup_lat không hợp lệ")
        .toFloat(),
    body("pickup_lng")
        .isFloat({ min: -180, max: 180 })
        .withMessage("pickup_lng không hợp lệ")
        .toFloat(),
    body("dropoff_address")
        .optional({ nullable: true })
        .trim(),
    body("duration_hours")
        .optional({ nullable: true })
        .isFloat({ min: 1 })
        .withMessage("duration_hours tối thiểu là 1")
        .toFloat(),
    body("payment_type")
        .optional({ nullable: true })
        .isInt({ min: 1, max: 4 })
        .withMessage("payment_type phải là 1-4")
        .toInt(),
    body("note")
        .optional({ nullable: true })
        .trim()
        .isLength({ max: 500 }),
];

export const bookingIdParamValidator = [
    param("bookingId")
        .isInt({ min: 1 })
        .withMessage("bookingId phải là số nguyên dương")
        .toInt(),
];

export const requestIdParamValidator = [
    param("requestId")
        .isInt({ min: 1 })
        .withMessage("requestId phải là số nguyên dương")
        .toInt(),
];

export const driverRespondValidator = [
    ...requestIdParamValidator,
    body("action")
        .isIn(["accept", "reject"])
        .withMessage("action phải là accept hoặc reject"),
];
