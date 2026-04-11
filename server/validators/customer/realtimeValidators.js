import { param, query } from "express-validator";

export const bookingIdParamValidator = [
    param("bookingId")
        .isInt({ min: 1 })
        .withMessage("bookingId must be a positive integer")
        .toInt(),
];

export const streamRealtimeValidator = [
    query("events")
        .optional({ values: "falsy" })
        .isString()
        .withMessage("events must be a comma-separated string"),
];
