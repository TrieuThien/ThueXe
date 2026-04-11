import { body, param, query } from "express-validator";

const internationalPhoneRegex = /^\+\d{8,15}$/;
const countryCodeRegex = /^[a-z]{2}$/i;
const countryDialCodeRegex = /^\+\d{1,4}$/;

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

function isBooleanFlag(value) {
    return value === 0 || value === 1 || value === "0" || value === "1";
}

const allowedDocumentStatuses = [
    "no_documents",
    "pending",
    "failed",
    "expired",
    "approved",
];

const allowedSortBy = [
    "account_create_date",
    "firstname",
    "user_rating",
    "wallet_amount",
    "user_id",
];

const allowedSortOrder = ["asc", "desc", "ASC", "DESC"];

export const createCustomerValidator = [
    body("firstname")
        .trim()
        .isLength({ min: 2, max: 64 })
        .withMessage("firstname must be between 2 and 64 characters"),
    body("lastname")
        .trim()
        .isLength({ min: 2, max: 64 })
        .withMessage("lastname must be between 2 and 64 characters"),
    body("email")
        .optional({ values: "falsy" })
        .trim()
        .isLength({ max: 64 })
        .withMessage("email must not exceed 64 characters")
        .isEmail()
        .withMessage("Invalid email")
        .normalizeEmail(),
    body("phone")
        .trim()
        .matches(internationalPhoneRegex)
        .withMessage("phone must be a valid international phone number in E.164 format"),
    body("password")
        .isString()
        .isLength({ min: 10, max: 128 })
        .withMessage("Password must be between 10 and 128 characters")
        .matches(/[A-Z]/)
        .withMessage("Password must include at least one uppercase letter")
        .matches(/[a-z]/)
        .withMessage("Password must include at least one lowercase letter")
        .matches(/\d/)
        .withMessage("Password must include at least one number")
        .matches(/[^A-Za-z0-9]/)
        .withMessage("Password must include at least one special character"),
    body("address")
        .optional({ values: "falsy" })
        .trim()
        .isLength({ max: 255 })
        .withMessage("address must not exceed 255 characters"),
    body("country")
        .trim()
        .notEmpty()
        .withMessage("country is required")
        .isLength({ max: 50 })
        .withMessage("country must not exceed 50 characters"),
    body("route_id")
        .optional({ values: "falsy" })
        .isInt({ min: 1 })
        .withMessage("route_id must be a positive integer")
        .toInt(),
    body("account_active")
        .optional({ values: "falsy" })
        .customSanitizer(normalizeBooleanLike)
        .custom((value) => isBooleanFlag(value))
        .withMessage("account_active must be 0 or 1"),
    body("country_code")
        .trim()
        .matches(countryCodeRegex)
        .withMessage("country_code must be a 2-letter ISO country code")
        .isLength({ min: 2, max: 2 })
        .withMessage("country_code must be exactly 2 characters")
        .toLowerCase(),
    body("country_dial_code")
        .trim()
        .matches(countryDialCodeRegex)
        .withMessage("country_dial_code must be a valid international dial code"),
    body("account_active")
        .optional({ values: "falsy" })
        .customSanitizer(normalizeBooleanLike)
        .custom((value) => isBooleanFlag(value))
        .withMessage("account_active must be 0 or 1"),
    body("is_activated")
        .optional({ values: "falsy" })
        .customSanitizer(normalizeBooleanLike)
        .custom((value) => isBooleanFlag(value))
        .withMessage("is_activated must be 0 or 1"),
];

const customerFilterValidators = [
    query("page")
        .optional({ values: "falsy" })
        .isInt({ min: 1 })
        .withMessage("page must be a positive integer")
        .toInt(),
    query("limit")
        .optional({ values: "falsy" })
        .isInt({ min: 1, max: 100 })
        .withMessage("limit must be an integer between 1 and 100")
        .toInt(),
    query("route_id")
        .optional({ values: "falsy" })
        .isInt({ min: 1 })
        .withMessage("route_id must be a positive integer")
        .toInt(),
    query("account_active")
        .optional({ values: "falsy" })
        .customSanitizer(normalizeBooleanLike)
        .custom((value) => isBooleanFlag(value))
        .withMessage("account_active must be 0 or 1"),
    query("is_activated")
        .optional({ values: "falsy" })
        .customSanitizer(normalizeBooleanLike)
        .custom((value) => isBooleanFlag(value))
        .withMessage("is_activated must be 0 or 1"),
    query("document_status")
        .optional({ values: "falsy" })
        .trim()
        .isIn(allowedDocumentStatuses)
        .withMessage(`document_status must be one of ${allowedDocumentStatuses.join(", ")}`),
    query("rating_min")
        .optional({ values: "falsy" })
        .isInt({ min: 0, max: 5 })
        .withMessage("rating_min must be between 0 and 5")
        .toInt(),
    query("rating_max")
        .optional({ values: "falsy" })
        .isInt({ min: 0, max: 5 })
        .withMessage("rating_max must be between 0 and 5")
        .toInt(),
    query("date_from")
        .optional({ values: "falsy" })
        .isISO8601({ strict: true, strictSeparator: true })
        .withMessage("date_from must be a valid ISO date in YYYY-MM-DD format"),
    query("date_to")
        .optional({ values: "falsy" })
        .isISO8601({ strict: true, strictSeparator: true })
        .withMessage("date_to must be a valid ISO date in YYYY-MM-DD format"),
    query("search")
        .optional({ values: "falsy" })
        .trim()
        .isLength({ max: 100 })
        .withMessage("search must not exceed 100 characters"),
    query("sort_by")
        .optional({ values: "falsy" })
        .trim()
        .isIn(allowedSortBy)
        .withMessage(`sort_by must be one of ${allowedSortBy.join(", ")}`),
    query("sort_order")
        .optional({ values: "falsy" })
        .trim()
        .isIn(allowedSortOrder)
        .withMessage("sort_order must be ASC or DESC"),
    query().custom((value, { req }) => {
        if (
            req.query.rating_min !== undefined &&
            req.query.rating_max !== undefined &&
            Number(req.query.rating_min) > Number(req.query.rating_max)
        ) {
            throw new Error("rating_min cannot be greater than rating_max");
        }

        if (
            req.query.date_from &&
            req.query.date_to &&
            new Date(req.query.date_from) > new Date(req.query.date_to)
        ) {
            throw new Error("date_from cannot be later than date_to");
        }

        return true;
    }),
];

export const getCustomerListValidator = customerFilterValidators;
export const getCustomerSummaryValidator = customerFilterValidators;

export const getCustomerDetailValidator = [
    param("userId")
        .isInt({ min: 1 })
        .withMessage("userId must be a positive integer")
        .toInt(),
];

export const updateCustomerAccountStateValidator = [
    param("userId")
        .isInt({ min: 1 })
        .withMessage("userId must be a positive integer")
        .toInt(),
    body("user_id")
        .optional({ values: "falsy" })
        .isInt({ min: 1 })
        .withMessage("user_id must be a positive integer")
        .toInt(),
    body("account_active")
        .customSanitizer(normalizeBooleanLike)
        .custom((value) => isBooleanFlag(value))
        .withMessage("account_active must be 0 or 1"),
    body().custom((value, { req }) => {
        if (
            req.body.user_id !== undefined &&
            req.body.user_id !== null &&
            req.body.user_id !== "" &&
            Number(req.body.user_id) !== Number(req.params.userId)
        ) {
            throw new Error("user_id must match the requested customer");
        }

        return true;
    }),
];

export const updateCustomerActivationStateValidator = [
    param("userId")
        .isInt({ min: 1 })
        .withMessage("userId must be a positive integer")
        .toInt(),
    body("user_id")
        .optional({ values: "falsy" })
        .isInt({ min: 1 })
        .withMessage("user_id must be a positive integer")
        .toInt(),
    body("is_activated")
        .customSanitizer(normalizeBooleanLike)
        .custom((value) => isBooleanFlag(value))
        .withMessage("is_activated must be 0 or 1"),
    body().custom((value, { req }) => {
        if (
            req.body.user_id !== undefined &&
            req.body.user_id !== null &&
            req.body.user_id !== "" &&
            Number(req.body.user_id) !== Number(req.params.userId)
        ) {
            throw new Error("user_id must match the requested customer");
        }

        return true;
    }),
];

export const updateCustomerPersonalInfoValidator = [
    param("userId")
        .isInt({ min: 1 })
        .withMessage("userId must be a positive integer")
        .toInt(),
    body("firstname")
        .trim()
        .isLength({ min: 2, max: 64 })
        .withMessage("firstname must be between 2 and 64 characters"),
    body("lastname")
        .trim()
        .isLength({ min: 2, max: 64 })
        .withMessage("lastname must be between 2 and 64 characters"),
    body("email")
        .trim()
        .isLength({ max: 64 })
        .withMessage("email must not exceed 64 characters")
        .isEmail()
        .withMessage("Invalid email")
        .normalizeEmail(),
    body("phone")
        .trim()
        .matches(internationalPhoneRegex)
        .withMessage("phone must be a valid international phone number in E.164 format"),
    body("address")
        .optional({ values: "falsy" })
        .trim()
        .isLength({ max: 255 })
        .withMessage("address must not exceed 255 characters"),
    body("country")
        .trim()
        .notEmpty()
        .withMessage("country is required")
        .isLength({ max: 50 })
        .withMessage("country must not exceed 50 characters"),
    body("route_id")
        .optional({ values: "falsy" })
        .isInt({ min: 1 })
        .withMessage("route_id must be a positive integer")
        .toInt(),
    body("country_code")
        .trim()
        .matches(countryCodeRegex)
        .withMessage("country_code must be a 2-letter ISO country code")
        .isLength({ min: 2, max: 2 })
        .withMessage("country_code must be exactly 2 characters")
        .toLowerCase(),
    body("country_dial_code")
        .trim()
        .matches(countryDialCodeRegex)
        .withMessage("country_dial_code must be a valid international dial code"),
];
