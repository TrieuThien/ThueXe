import { body, param, query } from "express-validator";

const internationalPhoneRegex = /^\+\d{8,15}$/;
const countryCodeRegex = /^[a-z]{2,3}$/i;
const countryDialCodeRegex = /^\+\d{1,4}$/;
const allowedDocumentStatuses = ["no_documents", "pending", "failed", "expired", "approved"];
const allowedSortBy = [
    "account_create_date",
    "firstname",
    "driver_rating",
    "wallet_amount",
    "driver_id",
];
const allowedSortOrder = ["asc", "desc", "ASC", "DESC"];
const allowedCarColors = [
    "black",
    "brown",
    "red",
    "orange",
    "yellow",
    "green",
    "blue",
    "sky-blue",
    "pink",
    "purple",
    "grey",
    "white",
    "gold",
    "silver",
];

function normalizeNameForComparison(value) {
    return String(value || "")
        .trim()
        .replace(/\s+/g, " ")
        .toLocaleUpperCase("vi-VN");
}

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

const driverCommonBodyValidators = [
    body("firstname").trim().isLength({ min: 1, max: 64 }).withMessage("firstname is required and must not exceed 64 characters"),
    body("lastname").trim().isLength({ min: 1, max: 64 }).withMessage("lastname is required and must not exceed 64 characters"),
    body("drv_address").trim().isLength({ min: 1, max: 255 }).withMessage("drv_address is required and must not exceed 255 characters"),
    body("reg_route_id").isInt({ min: 1 }).withMessage("reg_route_id must be a positive integer").toInt(),
    body("phone").trim().matches(internationalPhoneRegex).withMessage("phone must be a valid international phone number in E.164 format"),
    body("email").trim().isLength({ max: 64 }).withMessage("email must not exceed 64 characters").isEmail().withMessage("Invalid email").normalizeEmail(),
    body("activation_pin")
        .optional({ values: "falsy" })
        .trim()
        .isLength({ max: 64 })
        .withMessage("activation_pin must not exceed 64 characters"),
    body("car_plate_num").trim().isLength({ min: 1, max: 20 }).withMessage("car_plate_num is required and must not exceed 20 characters"),
    body("car_reg_num").optional({ values: "falsy" }).trim().isLength({ max: 30 }).withMessage("car_reg_num must not exceed 30 characters"),
    body("car_model").trim().isLength({ min: 1, max: 64 }).withMessage("car_model is required and must not exceed 64 characters"),
    body("ride_id").isInt({ min: 1 }).withMessage("ride_id must be a positive integer").toInt(),
    body("car_year").isInt({ min: 1990, max: 2040 }).withMessage("car_year must be between 1990 and 2040").toInt(),
    body("car_color").trim().isIn(allowedCarColors).withMessage(`car_color must be one of ${allowedCarColors.join(", ")}`),
    body("bank_acc_holder_name").trim().isLength({ min: 1, max: 100 }).withMessage("bank_acc_holder_name is required and must not exceed 100 characters"),
    body("bank_acc_num").trim().isLength({ min: 1, max: 40 }).withMessage("bank_acc_num is required and must not exceed 40 characters"),
    body("bank_name").trim().isLength({ min: 1, max: 100 }).withMessage("bank_name is required and must not exceed 100 characters"),
    body("bank_name_custom").optional({ values: "falsy" }).trim().isLength({ max: 100 }).withMessage("bank_name_custom must not exceed 100 characters"),
    body("bank_code").optional({ values: "falsy" }).trim().isLength({ max: 15 }).withMessage("bank_code must not exceed 15 characters"),
    body("bank_swift_code").optional({ values: "falsy" }).trim().isLength({ max: 15 }).withMessage("bank_swift_code must not exceed 15 characters"),
    body("driver_commision").isFloat({ min: 0, max: 100 }).withMessage("driver_commision must be between 0 and 100").toFloat(),
    body("country_code").optional({ values: "falsy" }).trim().matches(countryCodeRegex).withMessage("country_code must be a 2-3 letter country code").toLowerCase(),
    body("country_dial_code").optional({ values: "falsy" }).trim().matches(countryDialCodeRegex).withMessage("country_dial_code must be a valid international dial code"),
    body("account_active").optional({ values: "falsy" }).customSanitizer(normalizeBooleanLike).custom((value) => isBooleanFlag(value)).withMessage("account_active must be 0 or 1"),
    body("is_activated").optional({ values: "falsy" }).customSanitizer(normalizeBooleanLike).custom((value) => isBooleanFlag(value)).withMessage("is_activated must be 0 or 1"),
    body("available").optional({ values: "falsy" }).customSanitizer(normalizeBooleanLike).custom((value) => isBooleanFlag(value)).withMessage("available must be 0 or 1"),
    body().custom((value, { req }) => {
        if (req.body.bank_name === "other") {
            if (!String(req.body.bank_name_custom || "").trim()) {
                throw new Error("bank_name_custom is required when bank_name is other");
            }
            if (!String(req.body.bank_code || "").trim()) {
                throw new Error("bank_code is required when bank_name is other");
            }
        }
        return true;
    }),
    body("bank_acc_holder_name").custom((value, { req }) => {
        const driverFullName = normalizeNameForComparison(`${req.body.firstname || ""} ${req.body.lastname || ""}`);
        const bankAccountHolderName = normalizeNameForComparison(req.body.bank_acc_holder_name);

        if (driverFullName !== bankAccountHolderName) {
            throw new Error("bank_acc_holder_name must match the driver's full name");
        }

        return true;
    }),
];

const driverFilterValidators = [
    query("page").optional({ values: "falsy" }).isInt({ min: 1 }).withMessage("page must be a positive integer").toInt(),
    query("limit").optional({ values: "falsy" }).isInt({ min: 1, max: 100 }).withMessage("limit must be an integer between 1 and 100").toInt(),
    query("reg_route_id").optional({ values: "falsy" }).isInt({ min: 1 }).withMessage("reg_route_id must be a positive integer").toInt(),
    query("ride_id").optional({ values: "falsy" }).isInt({ min: 1 }).withMessage("ride_id must be a positive integer").toInt(),
    query("is_activated").optional({ values: "falsy" }).customSanitizer(normalizeBooleanLike).custom((value) => isBooleanFlag(value)).withMessage("is_activated must be 0 or 1"),
    query("available").optional({ values: "falsy" }).customSanitizer(normalizeBooleanLike).custom((value) => isBooleanFlag(value)).withMessage("available must be 0 or 1"),
    query("account_deleted").optional({ values: "falsy" }).customSanitizer(normalizeBooleanLike).custom((value) => isBooleanFlag(value)).withMessage("account_deleted must be 0 or 1"),
    query("rating_min").optional({ values: "falsy" }).isFloat({ min: 0, max: 5 }).withMessage("rating_min must be between 0 and 5").toFloat(),
    query("rating_max").optional({ values: "falsy" }).isFloat({ min: 0, max: 5 }).withMessage("rating_max must be between 0 and 5").toFloat(),
    query("document_status").optional({ values: "falsy" }).trim().isIn(allowedDocumentStatuses).withMessage(`document_status must be one of ${allowedDocumentStatuses.join(", ")}`),
    query("date_from").optional({ values: "falsy" }).isISO8601({ strict: true, strictSeparator: true }).withMessage("date_from must be a valid ISO date in YYYY-MM-DD format"),
    query("date_to").optional({ values: "falsy" }).isISO8601({ strict: true, strictSeparator: true }).withMessage("date_to must be a valid ISO date in YYYY-MM-DD format"),
    query("search").optional({ values: "falsy" }).trim().isLength({ max: 100 }).withMessage("search must not exceed 100 characters"),
    query("sort_by").optional({ values: "falsy" }).trim().isIn(allowedSortBy).withMessage(`sort_by must be one of ${allowedSortBy.join(", ")}`),
    query("sort_order").optional({ values: "falsy" }).trim().isIn(allowedSortOrder).withMessage("sort_order must be ASC or DESC"),
    query().custom((value, { req }) => {
        if (
            req.query.rating_min !== undefined &&
            req.query.rating_max !== undefined &&
            Number(req.query.rating_min) > Number(req.query.rating_max)
        ) {
            throw new Error("rating_min cannot be greater than rating_max");
        }
        if (req.query.date_from && req.query.date_to && new Date(req.query.date_from) > new Date(req.query.date_to)) {
            throw new Error("date_from cannot be later than date_to");
        }
        return true;
    }),
];

export const getDriverMetaValidator = [];
export const getDriverListValidator = driverFilterValidators;
export const getDriverSummaryValidator = driverFilterValidators;

export const getDriverDetailValidator = [
    param("driverId").isInt({ min: 1 }).withMessage("driverId must be a positive integer").toInt(),
];

export const createDriverValidator = [
    body().custom((value, { req }) => {
        if (!req.file) throw new Error("photo_file is required");
        return true;
    }),
    ...driverCommonBodyValidators,
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
];

export const updateDriverPersonalInfoValidator = [
    param("driverId").isInt({ min: 1 }).withMessage("driverId must be a positive integer").toInt(),
    ...driverCommonBodyValidators,
];

export const updateDriverAccountStateValidator = [
    param("driverId").isInt({ min: 1 }).withMessage("driverId must be a positive integer").toInt(),
    body("driver_id").optional({ values: "falsy" }).isInt({ min: 1 }).withMessage("driver_id must be a positive integer").toInt(),
    body("account_active").customSanitizer(normalizeBooleanLike).custom((value) => isBooleanFlag(value)).withMessage("account_active must be 0 or 1"),
    body().custom((value, { req }) => {
        if (
            req.body.driver_id !== undefined &&
            req.body.driver_id !== null &&
            req.body.driver_id !== "" &&
            Number(req.body.driver_id) !== Number(req.params.driverId)
        ) {
            throw new Error("driver_id must match the requested driver");
        }
        return true;
    }),
];

export const deleteDriverAccountValidator = [
    param("driverId").isInt({ min: 1 }).withMessage("driverId must be a positive integer").toInt(),
    body("admin_password").isString().isLength({ min: 1, max: 128 }).withMessage("admin_password is required"),
];

export const updateDriverWithdrawalValidator = [
    param("driverId").isInt({ min: 1 }).withMessage("driverId must be a positive integer").toInt(),
    param("withdrawalId").isInt({ min: 1 }).withMessage("withdrawalId must be a positive integer").toInt(),
    body("action").trim().isIn(["approve", "reject"]).withMessage("action must be approve or reject"),
];

export const getDriverLocationValidator = [
    param("driverId").isInt({ min: 1 }).withMessage("driverId must be a positive integer").toInt(),
];
