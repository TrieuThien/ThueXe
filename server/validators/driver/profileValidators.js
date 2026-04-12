import { body } from "express-validator";

const countryCodeRegex = /^[a-z]{2,3}$/i;
const countryDialCodeRegex = /^\+\d{1,4}$/;

const ALLOWED_CAR_COLORS = [
    "black", "brown", "red", "orange", "yellow", "green",
    "blue", "sky-blue", "pink", "purple", "grey", "white", "gold", "silver",
];

// ─── PATCH /me ────────────────────────────────────────────────────────────────

export const patchMeValidator = [
    body("firstname")
        .optional({ values: "falsy" })
        .trim()
        .isLength({ min: 1, max: 64 })
        .withMessage("firstname must be 1-64 characters"),
    body("lastname")
        .optional({ values: "falsy" })
        .trim()
        .isLength({ min: 1, max: 64 })
        .withMessage("lastname must be 1-64 characters"),
    body("drv_address")
        .optional({ values: "falsy" })
        .trim()
        .isLength({ min: 1, max: 255 })
        .withMessage("drv_address must not exceed 255 characters"),
    body("state")
        .optional({ values: "falsy" })
        .trim()
        .isLength({ max: 100 })
        .withMessage("state must not exceed 100 characters"),
    body("drv_country")
        .optional({ values: "falsy" })
        .trim()
        .isLength({ min: 1, max: 100 })
        .withMessage("drv_country must not exceed 100 characters"),
    body("country_code")
        .optional({ values: "falsy" })
        .trim()
        .matches(countryCodeRegex)
        .withMessage("country_code must be a 2-3 letter code (e.g. vn)"),
    body("country_dial_code")
        .optional({ values: "falsy" })
        .trim()
        .matches(countryDialCodeRegex)
        .withMessage("country_dial_code must be a valid dial code (e.g. +84)"),
    body("disp_lang")
        .optional({ values: "falsy" })
        .trim()
        .isLength({ max: 20 })
        .withMessage("disp_lang must not exceed 20 characters"),
    // Vehicle fields — gated by allow_vehicle_edit flag (enforced in service)
    body("car_model")
        .optional({ values: "falsy" })
        .trim()
        .isLength({ min: 1, max: 100 })
        .withMessage("car_model must not exceed 100 characters"),
    body("car_plate_num")
        .optional({ values: "falsy" })
        .trim()
        .isLength({ min: 1, max: 20 })
        .withMessage("car_plate_num must not exceed 20 characters"),
    body("car_reg_num")
        .optional({ values: "falsy" })
        .trim()
        .isLength({ max: 50 })
        .withMessage("car_reg_num must not exceed 50 characters"),
    body("car_color")
        .optional({ values: "falsy" })
        .trim()
        .isIn(ALLOWED_CAR_COLORS)
        .withMessage(`car_color must be one of: ${ALLOWED_CAR_COLORS.join(", ")}`),
    body("car_year")
        .optional({ values: "falsy" })
        .isInt({ min: 1990, max: 2040 })
        .withMessage("car_year must be between 1990 and 2040")
        .toInt(),
    // Route/city field — gated by allow_city_edit flag (enforced in service)
    body("reg_route_id")
        .optional({ values: "falsy" })
        .isInt({ min: 1 })
        .withMessage("reg_route_id must be a positive integer")
        .toInt(),
];

// ─── PATCH /me/bank-account ───────────────────────────────────────────────────

export const patchBankAccountValidator = [
    body("bank_name")
        .trim()
        .isLength({ min: 1, max: 100 })
        .withMessage("bank_name is required"),
    body("bank_name_custom")
        .optional({ values: "falsy" })
        .trim()
        .isLength({ max: 100 })
        .withMessage("bank_name_custom must not exceed 100 characters"),
    body("bank_acc_holder_name")
        .trim()
        .isLength({ min: 1, max: 200 })
        .withMessage("bank_acc_holder_name is required"),
    body("bank_acc_num")
        .trim()
        .isLength({ min: 1, max: 50 })
        .withMessage("bank_acc_num is required"),
    body("bank_code")
        .optional({ values: "falsy" })
        .trim()
        .isLength({ max: 20 })
        .withMessage("bank_code must not exceed 20 characters"),
    body("bank_swift_code")
        .optional({ values: "falsy" })
        .trim()
        .isLength({ max: 20 })
        .withMessage("bank_swift_code must not exceed 20 characters"),
];

// ─── POST /me/documents ───────────────────────────────────────────────────────

export const submitDriverDocumentValidator = [
    body("document_id")
        .isInt({ min: 1 })
        .withMessage("document_id must be a positive integer")
        .toInt(),
    body("doc_number")
        .optional({ values: "falsy" })
        .trim()
        .isLength({ max: 100 })
        .withMessage("doc_number must not exceed 100 characters"),
    body("doc_expiry_date")
        .optional({ values: "falsy" })
        .isDate()
        .withMessage("doc_expiry_date must be a valid date (YYYY-MM-DD)"),
];
