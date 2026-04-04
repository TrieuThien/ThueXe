import { body } from "express-validator";

export const rateDriverValidator = [
    body("booking_id").isInt({ min: 1 }).withMessage("booking_id must be a positive integer").toInt(),
    body("rating").isInt({ min: 1, max: 5 }).withMessage("rating must be between 1 and 5").toInt(),
    body("comment").optional({ values: "falsy" }).trim().isLength({ max: 500 }).withMessage("comment must not exceed 500 characters"),
];

export const ratePassengerValidator = [
    body("booking_id").isInt({ min: 1 }).withMessage("booking_id must be a positive integer").toInt(),
    body("rating").isInt({ min: 1, max: 5 }).withMessage("rating must be between 1 and 5").toInt(),
    body("comment").optional({ values: "falsy" }).trim().isLength({ max: 500 }).withMessage("comment must not exceed 500 characters"),
];

