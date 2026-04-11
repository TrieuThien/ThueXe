import { body } from "express-validator";

export const getSystemSettingsValidator = [];

export const updateSystemSettingsValidator = [
    body("driver_commission_rate")
        .optional()
        .isFloat({ min: 0, max: 100 })
        .withMessage("driver_commission_rate must be a number between 0 and 100")
        .toFloat(),
    body("cancel_fee")
        .optional()
        .isFloat({ min: 0, max: 1000000000 })
        .withMessage("cancel_fee must be a non-negative number")
        .toFloat(),
    body("free_waiting_minutes")
        .optional()
        .isInt({ min: 0, max: 180 })
        .withMessage("free_waiting_minutes must be an integer between 0 and 180")
        .toInt(),
    body("max_service_radius_km")
        .optional()
        .isFloat({ min: 1, max: 1000 })
        .withMessage("max_service_radius_km must be a number between 1 and 1000")
        .toFloat(),
    body("paypal_client_id")
        .optional({ values: "null" })
        .isString()
        .withMessage("paypal_client_id must be a string")
        .trim()
        .isLength({ max: 255 })
        .withMessage("paypal_client_id must not exceed 255 characters"),
    body("google_maps_api_key")
        .optional({ values: "null" })
        .isString()
        .withMessage("google_maps_api_key must be a string")
        .trim()
        .isLength({ max: 255 })
        .withMessage("google_maps_api_key must not exceed 255 characters"),
];

export const currencyBodyValidator = [
    body("name")
        .notEmpty().withMessage("Currency name is required.")
        .isString().trim().isLength({ max: 50 }).withMessage("Name must not exceed 50 characters."),
    body("iso_code")
        .notEmpty().withMessage("ISO code is required.")
        .isString().trim().isLength({ min: 2, max: 4 }).withMessage("ISO code must be 2–4 characters."),
    body("symbol")
        .notEmpty().withMessage("Symbol is required.")
        .isString().trim().isLength({ max: 10 }).withMessage("Symbol must not exceed 10 characters."),
    body("exchng_rate")
        .notEmpty().withMessage("Exchange rate is required.")
        .isFloat({ min: 0 }).withMessage("Exchange rate must be a non-negative number.")
        .toFloat(),
    body("is_default")
        .optional()
        .isBoolean().withMessage("is_default must be a boolean.")
        .toBoolean(),
];
