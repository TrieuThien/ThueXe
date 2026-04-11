import { body, param, query } from "express-validator";

const ownerPhoneRegex = /^\+?[0-9]{8,20}$/;
const allowedVerificationStatuses = ["not_submitted", "pending_review", "verified", "rejected"];
const allowedSortBy = ["owner_id", "fullname", "date_created", "commission_rate"];
const allowedSortOrder = ["asc", "desc", "ASC", "DESC"];

function normalizeBooleanLike(value) {
    if (value === undefined || value === null || value === "") return undefined;
    if (typeof value === "boolean") return value ? 1 : 0;
    const normalized = String(value).trim().toLowerCase();
    if (["1", "true", "yes", "on"].includes(normalized)) return 1;
    if (["0", "false", "no", "off"].includes(normalized)) return 0;
    return value;
}

function isBooleanFlag(value) {
    return value === 0 || value === 1 || value === "0" || value === "1";
}

const ownerBodyValidators = [
    body("fullname")
        .trim()
        .isLength({ min: 2, max: 100 })
        .withMessage("fullname is required and must be between 2 and 100 characters"),
    body("phone")
        .trim()
        .matches(ownerPhoneRegex)
        .withMessage("phone must contain 8-20 digits and may start with +"),
    body("email")
        .optional({ values: "falsy" })
        .trim()
        .isLength({ max: 64 })
        .withMessage("email must not exceed 64 characters")
        .isEmail()
        .withMessage("Invalid email")
        .normalizeEmail(),
    body("address").optional({ values: "falsy" }).trim().isLength({ max: 255 }).withMessage("address must not exceed 255 characters"),
    body("bank_name").optional({ values: "falsy" }).trim().isLength({ max: 100 }).withMessage("bank_name must not exceed 100 characters"),
    body("bank_account").optional({ values: "falsy" }).trim().isLength({ max: 40 }).withMessage("bank_account must not exceed 40 characters"),
    body("bank_code").optional({ values: "falsy" }).trim().isLength({ max: 15 }).withMessage("bank_code must not exceed 15 characters"),
    body("swift_code").optional({ values: "falsy" }).trim().isLength({ max: 15 }).withMessage("swift_code must not exceed 15 characters"),
    body("verification_status")
        .optional({ values: "falsy" })
        .trim()
        .isIn(allowedVerificationStatuses)
        .withMessage(`verification_status must be one of ${allowedVerificationStatuses.join(", ")}`),
    body("commission_rate")
        .optional({ values: "falsy" })
        .isFloat({ min: 0, max: 100 })
        .withMessage("commission_rate must be between 0 and 100")
        .toFloat(),
    body("is_activated")
        .optional({ values: "falsy" })
        .customSanitizer(normalizeBooleanLike)
        .custom((value) => isBooleanFlag(value))
        .withMessage("is_activated must be 0 or 1"),
    body("account_active")
        .optional({ values: "falsy" })
        .customSanitizer(normalizeBooleanLike)
        .custom((value) => isBooleanFlag(value))
        .withMessage("account_active must be 0 or 1"),
    body("account_deleted")
        .optional({ values: "falsy" })
        .customSanitizer(normalizeBooleanLike)
        .custom((value) => isBooleanFlag(value))
        .withMessage("account_deleted must be 0 or 1"),
    body("status")
        .optional({ values: "falsy" })
        .customSanitizer(normalizeBooleanLike)
        .custom((value) => isBooleanFlag(value))
        .withMessage("status must be 0 or 1"),
];

const ownerFilterValidators = [
    query("page").optional({ values: "falsy" }).isInt({ min: 1 }).withMessage("page must be a positive integer").toInt(),
    query("limit")
        .optional({ values: "falsy" })
        .isInt({ min: 1, max: 100 })
        .withMessage("limit must be an integer between 1 and 100")
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
    query("account_deleted")
        .optional({ values: "falsy" })
        .customSanitizer(normalizeBooleanLike)
        .custom((value) => isBooleanFlag(value))
        .withMessage("account_deleted must be 0 or 1"),
    query("status")
        .optional({ values: "falsy" })
        .customSanitizer(normalizeBooleanLike)
        .custom((value) => isBooleanFlag(value))
        .withMessage("status must be 0 or 1"),
    query("verification_status")
        .optional({ values: "falsy" })
        .trim()
        .isIn(allowedVerificationStatuses)
        .withMessage(`verification_status must be one of ${allowedVerificationStatuses.join(", ")}`),
    query("date_from")
        .optional({ values: "falsy" })
        .isISO8601({ strict: true, strictSeparator: true })
        .withMessage("date_from must be a valid ISO date in YYYY-MM-DD format"),
    query("date_to")
        .optional({ values: "falsy" })
        .isISO8601({ strict: true, strictSeparator: true })
        .withMessage("date_to must be a valid ISO date in YYYY-MM-DD format"),
    query("search").optional({ values: "falsy" }).trim().isLength({ max: 100 }).withMessage("search must not exceed 100 characters"),
    query("sort_by").optional({ values: "falsy" }).trim().isIn(allowedSortBy).withMessage(`sort_by must be one of ${allowedSortBy.join(", ")}`),
    query("sort_order").optional({ values: "falsy" }).trim().isIn(allowedSortOrder).withMessage("sort_order must be ASC or DESC"),
    query().custom((value, { req }) => {
        if (req.query.date_from && req.query.date_to && new Date(req.query.date_from) > new Date(req.query.date_to)) {
            throw new Error("date_from cannot be later than date_to");
        }
        return true;
    }),
];

export const getVehicleOwnerMetaValidator = [];
export const getVehicleOwnerListValidator = ownerFilterValidators;
export const getVehicleOwnerSummaryValidator = ownerFilterValidators;

export const getVehicleOwnerDetailValidator = [
    param("ownerId").isInt({ min: 1 }).withMessage("ownerId must be a positive integer").toInt(),
];

export const createVehicleOwnerValidator = [
    ...ownerBodyValidators,
    body("password")
        .optional({ values: "falsy" })
        .isString()
        .isLength({ min: 10, max: 128 })
        .withMessage("password must be between 10 and 128 characters"),
];

export const updateVehicleOwnerPersonalInfoValidator = [
    param("ownerId").isInt({ min: 1 }).withMessage("ownerId must be a positive integer").toInt(),
    ...ownerBodyValidators,
];

export const updateVehicleOwnerAccountStatusValidator = [
    param("ownerId").isInt({ min: 1 }).withMessage("ownerId must be a positive integer").toInt(),
    body("owner_id").optional({ values: "falsy" }).isInt({ min: 1 }).withMessage("owner_id must be a positive integer").toInt(),
    body("account_active")
        .customSanitizer(normalizeBooleanLike)
        .custom((value) => isBooleanFlag(value))
        .withMessage("account_active must be 0 or 1"),
    body("status")
        .optional({ values: "falsy" })
        .customSanitizer(normalizeBooleanLike)
        .custom((value) => isBooleanFlag(value))
        .withMessage("status must be 0 or 1"),
    body().custom((value, { req }) => {
        if (
            req.body.owner_id !== undefined &&
            req.body.owner_id !== null &&
            req.body.owner_id !== "" &&
            Number(req.body.owner_id) !== Number(req.params.ownerId)
        ) {
            throw new Error("owner_id must match the requested owner");
        }
        return true;
    }),
];

export const deleteVehicleOwnerAccountValidator = [
    param("ownerId").isInt({ min: 1 }).withMessage("ownerId must be a positive integer").toInt(),
    body("owner_id").optional({ values: "falsy" }).isInt({ min: 1 }).withMessage("owner_id must be a positive integer").toInt(),
    body().custom((value, { req }) => {
        if (
            req.body.owner_id !== undefined &&
            req.body.owner_id !== null &&
            req.body.owner_id !== "" &&
            Number(req.body.owner_id) !== Number(req.params.ownerId)
        ) {
            throw new Error("owner_id must match the requested owner");
        }
        return true;
    }),
];

