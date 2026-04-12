import { body, param, query } from "express-validator";

const idValidator = [
    param("id")
        .isInt({ min: 1 })
        .withMessage("id must be a positive integer")
        .toInt(),
];

const listValidators = [
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
        .isInt({ min: 0 })
        .withMessage("city must be a non-negative integer")
        .toInt(),
    query("visibility")
        .optional({ values: "falsy" })
        .isInt({ min: 0, max: 2 })
        .withMessage("visibility must be 0, 1 or 2")
        .toInt(),
];

const createValidators = [
    body("title")
        .trim()
        .notEmpty()
        .withMessage("title is required")
        .isLength({ max: 255 })
        .withMessage("title must not exceed 255 characters"),
    body("excerpt")
        .trim()
        .notEmpty()
        .withMessage("excerpt is required")
        .isLength({ max: 255 })
        .withMessage("excerpt must not exceed 255 characters"),
    body("content")
        .trim()
        .notEmpty()
        .withMessage("content is required"),
    body("city")
        .optional({ values: "falsy" })
        .isInt({ min: 0 })
        .withMessage("city must be a non-negative integer")
        .toInt(),
    body("feature_img")
        .optional()
        .trim()
        .isLength({ max: 30 })
        .withMessage("feature_img must not exceed 30 characters"),
    body("visibility")
        .optional({ values: "falsy" })
        .isInt({ min: 0, max: 2 })
        .withMessage("visibility must be 0, 1 or 2")
        .toInt(),
    body("status")
        .optional({ values: "falsy" })
        .isInt({ min: 0, max: 1 })
        .withMessage("status must be either 0 or 1")
        .toInt(),
];

const updateValidators = [
    ...idValidator,
    body("title")
        .optional()
        .trim()
        .notEmpty()
        .withMessage("title must not be empty")
        .isLength({ max: 255 })
        .withMessage("title must not exceed 255 characters"),
    body("excerpt")
        .optional()
        .trim()
        .notEmpty()
        .withMessage("excerpt must not be empty")
        .isLength({ max: 255 })
        .withMessage("excerpt must not exceed 255 characters"),
    body("content")
        .optional()
        .trim()
        .notEmpty()
        .withMessage("content must not be empty"),
    body("city")
        .optional()
        .isInt({ min: 0 })
        .withMessage("city must be a non-negative integer")
        .toInt(),
    body("feature_img")
        .optional()
        .trim()
        .isLength({ max: 30 })
        .withMessage("feature_img must not exceed 30 characters"),
    body("visibility")
        .optional()
        .isInt({ min: 0, max: 2 })
        .withMessage("visibility must be 0, 1 or 2")
        .toInt(),
    body("status")
        .optional()
        .isInt({ min: 0, max: 1 })
        .withMessage("status must be either 0 or 1")
        .toInt(),
];

const updateStatusValidators = [
    ...idValidator,
    body("status")
        .isInt({ min: 0, max: 1 })
        .withMessage("status must be either 0 or 1")
        .toInt(),
];

export const getAdminBannerMetaValidator = [];
export const getAdminBannerListValidator = listValidators;
export const getAdminBannerDetailValidator = idValidator;
export const createAdminBannerValidator = createValidators;
export const updateAdminBannerValidator = updateValidators;
export const updateAdminBannerStatusValidator = updateStatusValidators;
