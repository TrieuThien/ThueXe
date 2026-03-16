import { body, param } from "express-validator";

function normalizeBooleanLike(value) {
    if (value === undefined || value === null || value === "") {
        return undefined;
    }

    if (typeof value === "boolean") {
        return value ? 1 : 0;
    }

    if (typeof value === "number") {
        return value;
    }

    const normalizedValue = String(value).trim().toLowerCase();

    if (["true", "1", "on", "yes"].includes(normalizedValue)) {
        return 1;
    }

    if (["false", "0", "off", "no"].includes(normalizedValue)) {
        return 0;
    }

    return value;
}

function validateRideImage(required = false) {
    return body("ride_img").custom((value, { req }) => {
        if (!req.file && required) {
            throw new Error("ride_img is required");
        }

        return true;
    });
}

const sharedCarValidators = [
    body("ride_type")
        .trim()
        .isLength({ min: 1, max: 20 })
        .withMessage("ride_type must be between 1 and 20 characters"),
    body("ride_desc")
        .trim()
        .isLength({ min: 1, max: 250 })
        .withMessage("ride_desc must be between 1 and 250 characters"),
    body("num_seats")
        .trim()
        .isInt({ min: 1, max: 127 })
        .withMessage("num_seats must be a positive integer"),
    body("icon_type")
        .optional({ values: "falsy" })
        .trim()
        .isInt({ min: 1, max: 6 })
        .withMessage("icon_type must be an integer between 1 and 6"),
    body("avail")
        .optional({ values: "falsy" })
        .customSanitizer(normalizeBooleanLike)
        .isInt({ min: 0, max: 1 })
        .withMessage("avail must be a boolean or 0/1"),
];

export const createCarValidator = [...sharedCarValidators, validateRideImage(true)];

export const updateCarValidator = [
    param("id").isInt({ min: 1 }).withMessage("id must be a positive integer"),
    ...sharedCarValidators,
    validateRideImage(false),
];
