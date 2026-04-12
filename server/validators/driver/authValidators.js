import { body, query } from "express-validator";

// ─── Reusable password rule ───────────────────────────────────────────────────

const strongPasswordRule = body("new_password")
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
    .withMessage("Password must include at least one special character");

// ─── Validators ───────────────────────────────────────────────────────────────

export const loginValidator = [
    body("identifier")
        .trim()
        .isLength({ min: 1, max: 100 })
        .withMessage("identifier is required (email or phone)"),
    body("password")
        .isString()
        .isLength({ min: 1, max: 128 })
        .withMessage("password is required"),
];

export const refreshTokenValidator = [
    body("refreshToken")
        .optional({ values: "falsy" })
        .isString()
        .withMessage("refreshToken must be a string"),
];

export const logoutValidator = [
    body("refreshToken")
        .optional({ values: "falsy" })
        .isString()
        .withMessage("refreshToken must be a string"),
];

export const patchPushTokenValidator = [
    body("pushNotificationToken")
        .isString()
        .isLength({ min: 1, max: 200 })
        .withMessage("pushNotificationToken is required and must not exceed 200 characters"),
];

export const patchAddressValidator = [
    body("drv_address")
        .trim()
        .isLength({ min: 1, max: 255 })
        .withMessage("drv_address is required and must not exceed 255 characters"),
];

export const changePasswordValidator = [
    body("old_password")
        .isString()
        .isLength({ min: 1, max: 128 })
        .withMessage("old_password is required"),
    strongPasswordRule,
    body().custom((value, { req }) => {
        if (req.body.old_password === req.body.new_password) {
            throw new Error("new_password must be different from old_password");
        }
        return true;
    }),
];

export const forgotPasswordValidator = [
    body("email")
        .trim()
        .isEmail()
        .withMessage("email must be a valid email address")
        .normalizeEmail()
        .isLength({ max: 64 })
        .withMessage("email must not exceed 64 characters"),
];

export const resetPasswordValidator = [
    body("token")
        .isString()
        .isLength({ min: 1 })
        .withMessage("token is required"),
    strongPasswordRule,
];

// ─── Self-registration validators ─────────────────────────────────────────────

const internationalPhoneRegex = /^\+\d{8,15}$/;
const countryCodeRegex = /^[a-z]{2,3}$/i;
const countryDialCodeRegex = /^\+\d{1,4}$/;

export const registerValidator = [
    body("firstname")
        .trim()
        .isLength({ min: 1, max: 64 })
        .withMessage("firstname is required and must not exceed 64 characters"),
    body("lastname")
        .trim()
        .isLength({ min: 1, max: 64 })
        .withMessage("lastname is required and must not exceed 64 characters"),
    body("email")
        .optional({ values: "falsy" })
        .trim()
        .isEmail()
        .withMessage("email must be valid")
        .normalizeEmail()
        .isLength({ max: 64 })
        .withMessage("email must not exceed 64 characters"),
    body("phone")
        .optional({ values: "falsy" })
        .trim()
        .matches(internationalPhoneRegex)
        .withMessage("phone must be a valid international number in E.164 format (e.g. +84912345678)"),
    body().custom((value, { req }) => {
        if (!req.body.email && !req.body.phone) {
            throw new Error("Either email or phone is required");
        }
        return true;
    }),
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
    body("reg_route_id")
        .optional({ values: "falsy" })
        .isInt({ min: 1 })
        .withMessage("reg_route_id must be a positive integer")
        .toInt(),
    body("ride_id")
        .optional({ values: "falsy" })
        .isInt({ min: 1 })
        .withMessage("ride_id must be a positive integer")
        .toInt(),
    body("country_code")
        .optional({ values: "falsy" })
        .trim()
        .matches(countryCodeRegex)
        .withMessage("country_code must be a 2-3 letter code")
        .toLowerCase(),
    body("country_dial_code")
        .optional({ values: "falsy" })
        .trim()
        .matches(countryDialCodeRegex)
        .withMessage("country_dial_code must be a valid dial code (e.g. +84)"),
];

export const verifyOtpValidator = [
    body("driver_id")
        .isInt({ min: 1 })
        .withMessage("driver_id must be a positive integer")
        .toInt(),
    body("code")
        .trim()
        .isLength({ min: 4, max: 10 })
        .withMessage("code is required and must be 4-10 characters"),
];

export const resendOtpValidator = [
    body("identifier")
        .trim()
        .isLength({ min: 1, max: 100 })
        .withMessage("identifier is required (email or phone)"),
];
