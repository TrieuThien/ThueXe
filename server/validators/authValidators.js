import { body } from "express-validator";

const phoneRegex = /^\+?\d{8,15}$/;

export const registerValidator = [
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
        .isEmail()
        .withMessage("Invalid email")
        .normalizeEmail(),
    body("phone")
        .optional({ values: "falsy" })
        .trim()
        .matches(phoneRegex)
        .withMessage("Invalid phone number format"),
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
    body().custom((value) => {
        if (!value.email && !value.phone) {
            throw new Error("Either email or phone is required");
        }
        return true;
    }),
];

export const createStaffValidator = [
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
        .isEmail()
        .withMessage("Invalid email")
        .normalizeEmail(),
    body("phone")
        .optional({ values: "falsy" })
        .trim()
        .matches(phoneRegex)
        .withMessage("Invalid phone number format"),
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
    body("role")
        .trim()
        .isIn(["admin", "dispatcher", "biller"])
        .withMessage("role must be one of admin, dispatcher or biller"),
    body().custom((value) => {
        if (!value.email && !value.phone) {
            throw new Error("Either email or phone is required");
        }
        return true;
    }),
];

export const loginValidator = [
    body("identifier")
        .trim()
        .isLength({ min: 3, max: 64 })
        .withMessage("identifier is required"),
    body("password")
        .isString()
        .isLength({ min: 1, max: 128 })
        .withMessage("password is required"),
];

export const forgotPasswordValidator = [
    body("email")
        .trim()
        .isEmail()
        .withMessage("Valid email is required")
        .normalizeEmail(),
];

export const resetPasswordValidator = [
    body("token")
        .trim()
        .isLength({ min: 20 })
        .withMessage("token is required"),
    body("newPassword")
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

export const refreshTokenValidator = [
    body("refreshToken")
        .optional({ values: "falsy" })
        .trim()
        .isLength({ min: 20 })
        .withMessage("refreshToken must be valid"),
];

export const logoutValidator = [
    body("refreshToken")
        .optional({ values: "falsy" })
        .trim()
        .isLength({ min: 20 })
        .withMessage("refreshToken must be valid"),
];
