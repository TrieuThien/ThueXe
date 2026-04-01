import { body, param, query } from "express-validator";

const couponCodeRegex = /^[A-Za-z0-9_-]{3,15}$/;

const adminListValidators = [
    query("page")
        .optional({ values: "falsy" })
        .isInt({ min: 1 })
        .withMessage("page must be an integer greater than 0")
        .toInt(),
    query("limit")
        .optional({ values: "falsy" })
        .isInt({ min: 1, max: 100 })
        .withMessage("limit must be an integer between 1 and 100")
        .toInt(),
    query("search")
        .optional({ values: "falsy" })
        .trim()
        .isLength({ max: 100 })
        .withMessage("search must not exceed 100 characters"),
    query("status")
        .optional({ values: "falsy" })
        .isInt({ min: 0, max: 1 })
        .withMessage("status must be either 0 or 1")
        .toInt(),
    query("city")
        .optional({ values: "falsy" })
        .isInt({ min: 1 })
        .withMessage("city must be a positive integer")
        .toInt(),
    query("visibility")
        .optional({ values: "falsy" })
        .isInt({ min: 0, max: 1 })
        .withMessage("visibility must be either 0 or 1")
        .toInt(),
    query("activeFrom")
        .optional({ values: "falsy" })
        .isISO8601()
        .withMessage("activeFrom must be a valid date"),
    query("activeTo")
        .optional({ values: "falsy" })
        .isISO8601()
        .withMessage("activeTo must be a valid date"),
];

const couponIdValidator = [
    param("id")
        .isInt({ min: 1 })
        .withMessage("id must be a positive integer")
        .toInt(),
];

const createCouponValidators = [
    body("coupon_code")
        .trim()
        .matches(couponCodeRegex)
        .withMessage("coupon_code must consist of letters, numbers, underscores, and hyphens and be 3-15 characters long"),
    body("coupon_title")
        .optional({ values: "falsy" })
        .trim()
        .isLength({ max: 255 })
        .withMessage("coupon_title must not exceed 255 characters"),
    body("city")
        .isInt({ min: 1 })
        .withMessage("city must be a positive integer")
        .toInt(),
    body("vehicles")
        .optional({ values: "falsy" })
        .custom((value) => {
            const list = Array.isArray(value)
                ? value
                : String(value)
                    .split(",")
                    .map((item) => item.trim())
                    .filter(Boolean);
            const invalid = list.some((item) => !Number.isInteger(Number(item)) || Number(item) < 1);
            if (invalid) {
                throw new Error("vehicles must be a list of valid vehicle IDs");
            }
            return true;
        }),
    body("visibility")
        .optional({ values: "falsy" })
        .isInt({ min: 0, max: 1 })
        .withMessage("visibility must be either 0 or 1")
        .toInt(),
    body("discount_type")
        .isInt({ min: 0, max: 1 })
        .withMessage("discount_type must be either 0 or 1")
        .toInt(),
    body("discount_value")
        .isFloat({ min: 0 })
        .withMessage("discount_value must be a number >= 0")
        .toFloat(),
    body("min_fare")
        .isFloat({ min: 0 })
        .withMessage("min_fare must be a number >= 0")
        .toFloat(),
    body("max_discount_amount")
        .isFloat({ min: 0 })
        .withMessage("max_discount_amount must be a number >= 0")
        .toFloat(),
    body("limit_count")
        .isInt({ min: 0 })
        .withMessage("limit_count must be a positive integer or zero")
        .toInt(),
    body("user_limit_count")
        .isInt({ min: 0 })
        .withMessage("user_limit_count must be a positive integer or zero")
        .toInt(),
    body("status")
        .optional({ values: "falsy" })
        .isInt({ min: 0, max: 1 })
        .withMessage("status must be either 0 or 1")
        .toInt(),
    body("active_date")
        .isISO8601()
        .withMessage("active_date must be a valid date"),
    body("expiry_date")
        .isISO8601()
        .withMessage("expiry_date must be a valid date"),
    body().custom((value, { req }) => {
        const activeDate = new Date(req.body.active_date);
        const expiryDate = new Date(req.body.expiry_date);

        if (Number.isNaN(activeDate.getTime()) || Number.isNaN(expiryDate.getTime())) {
            throw new Error("active_date or expiry_date is invalid");
        }

        if (expiryDate.getTime() < activeDate.getTime()) {
            throw new Error("expiry_date must be greater than or equal to active_date");
        }

        return true;
    }),
];

const updateCouponValidators = [
    ...couponIdValidator,
    body("coupon_code")
        .optional({ values: "falsy" })
        .trim()
        .matches(couponCodeRegex)
        .withMessage("coupon_code must consist of letters, numbers, underscores, and hyphens and be 3-15 characters long"),
    body("coupon_title")
        .optional()
        .trim()
        .isLength({ max: 255 })
        .withMessage("coupon_title must not exceed 255 characters"),
    body("city")
        .optional()
        .isInt({ min: 1 })
        .withMessage("city must be a positive integer")
        .toInt(),
    body("vehicles")
        .optional()
        .custom((value) => {
            if (value === null || value === "") return true;
            const list = Array.isArray(value)
                ? value
                : String(value)
                    .split(",")
                    .map((item) => item.trim())
                    .filter(Boolean);
            const invalid = list.some((item) => !Number.isInteger(Number(item)) || Number(item) < 1);
            if (invalid) {
                throw new Error("vehicles must be a list of valid vehicle IDs");
            }
            return true;
        }),
    body("visibility")
        .optional()
        .isInt({ min: 0, max: 1 })
        .withMessage("visibility must be either 0 or 1")
        .toInt(),
    body("discount_type")
        .optional()
        .isInt({ min: 0, max: 1 })
        .withMessage("discount_type must be either 0 or 1")
        .toInt(),
    body("discount_value")
        .optional()
        .isFloat({ min: 0 })
        .withMessage("discount_value must be a number >= 0")
        .toFloat(),
    body("min_fare")
        .optional()
        .isFloat({ min: 0 })
        .withMessage("min_fare must be a number >= 0")
        .toFloat(),
    body("max_discount_amount")
        .optional()
        .isFloat({ min: 0 })
        .withMessage("max_discount_amount must be a number >= 0")
        .toFloat(),
    body("limit_count")
        .optional()
        .isInt({ min: 0 })
        .withMessage("limit_count must be a positive integer or zero")
        .toInt(),
    body("user_limit_count")
        .optional()
        .isInt({ min: 0 })
        .withMessage("user_limit_count must be a positive integer or zero")
        .toInt(),
    body("status")
        .optional()
        .isInt({ min: 0, max: 1 })
        .withMessage("status must be either 0 or 1")
        .toInt(),
    body("active_date")
        .optional()
        .isISO8601()
        .withMessage("active_date must be a valid date"),
    body("expiry_date")
        .optional()
        .isISO8601()
        .withMessage("expiry_date must be a valid date"),
    body().custom((value, { req }) => {
        if (!req.body.active_date || !req.body.expiry_date) return true;

        const activeDate = new Date(req.body.active_date);
        const expiryDate = new Date(req.body.expiry_date);

        if (Number.isNaN(activeDate.getTime()) || Number.isNaN(expiryDate.getTime())) {
            throw new Error("active_date or expiry_date is invalid");
        }

        if (expiryDate.getTime() < activeDate.getTime()) {
            throw new Error("expiry_date must be greater than or equal to active_date");
        }

        return true;
    }),
];

const updateCouponStatusValidators = [
    ...couponIdValidator,
    body("status")
        .isInt({ min: 0, max: 1 })
        .withMessage("status must be either 0 or 1")
        .toInt(),
];

const availableCouponValidators = [
    query("cityId")
        .isInt({ min: 1 })
        .withMessage("cityId must be a positive integer")
        .toInt(),
    query("fare")
        .isFloat({ min: 0 })
        .withMessage("fare must be a number >= 0")
        .toFloat(),
    query("rideId")
        .optional({ values: "falsy" })
        .isInt({ min: 1 })
        .withMessage("rideId must be a positive integer")
        .toInt(),
    query("vehicleId")
        .optional({ values: "falsy" })
        .isInt({ min: 1 })
        .withMessage("vehicleId must be a positive integer")
        .toInt(),
    query().custom((value, { req }) => {
        if (!req.query.rideId && !req.query.vehicleId) {
            throw new Error("Need rideId or vehicleId");
        }
        return true;
    }),
];

const validateCouponValidators = [
    body("couponCode")
        .trim()
        .matches(couponCodeRegex)
        .withMessage("couponCode must be valid"),
    body("cityId")
        .isInt({ min: 1 })
        .withMessage("cityId must be a positive integer")
        .toInt(),
    body("fare")
        .isFloat({ min: 0 })
        .withMessage("fare must be a number >= 0")
        .toFloat(),
    body("rideId")
        .optional({ values: "falsy" })
        .isInt({ min: 1 })
        .withMessage("rideId must be a positive integer")
        .toInt(),
    body("vehicleId")
        .optional({ values: "falsy" })
        .isInt({ min: 1 })
        .withMessage("vehicleId must be a positive integer")
        .toInt(),
    body().custom((value, { req }) => {
        if (!req.body.rideId && !req.body.vehicleId) {
            throw new Error("Need rideId or vehicleId");
        }
        return true;
    }),
];

export const getAdminCouponMetaValidator = [];
export const getAdminCouponListValidator = adminListValidators;
export const getAdminCouponDetailValidator = couponIdValidator;
export const createAdminCouponValidator = createCouponValidators;
export const updateAdminCouponValidator = updateCouponValidators;
export const updateAdminCouponStatusValidator = updateCouponStatusValidators;
export const getAvailableCouponValidator = availableCouponValidators;
export const validateCouponCodeValidator = validateCouponValidators;
export const applyCouponValidator = validateCouponValidators;

