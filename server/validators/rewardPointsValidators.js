import { body, param, query } from "express-validator";

export const getAdminRewardConfigValidator = [];

export const updateAdminRewardConfigValidator = [
    body("cur_to_points_conv")
        .isFloat({ gt: 0 })
        .withMessage("cur_to_points_conv must be a number > 0")
        .toFloat(),
    body("points_to_cur_conv")
        .isFloat({ gt: 0 })
        .withMessage("points_to_cur_conv must be a number > 0")
        .toFloat(),
    body("status")
        .isInt({ min: 0, max: 1 })
        .withMessage("status must be either 0 or 1")
        .toInt(),
    body("min_points_redeemable")
        .isInt({ min: 1 })
        .withMessage("min_points_redeemable must be a positive integer")
        .toInt(),
];

export const getAdminRewardHistoryValidator = [
    query("page")
        .optional({ values: "falsy" })
        .isInt({ min: 1 })
        .withMessage("page must be a positive integer")
        .toInt(),
    query("limit")
        .optional({ values: "falsy" })
        .isInt({ min: 1, max: 100 })
        .withMessage("limit must be a number between 1 and 100")
        .toInt(),
    query("userId")
        .optional({ values: "falsy" })
        .isInt({ min: 1 })
        .withMessage("userId must be a positive integer")
        .toInt(),
    query("actionType")
        .optional({ values: "falsy" })
        .isInt({ min: 1, max: 6 })
        .withMessage("actionType must be a valid option")
        .toInt(),
    query("search")
        .optional({ values: "falsy" })
        .trim()
        .isLength({ max: 100 })
        .withMessage("search must not exceed 100 characters"),
    query("dateFrom")
        .optional({ values: "falsy" })
        .isISO8601()
        .withMessage("dateFrom must be a valid date"),
    query("dateTo")
        .optional({ values: "falsy" })
        .isISO8601()
        .withMessage("dateTo must be a valid date"),
];

export const adjustRewardPointsValidator = [
    body("user_id")
        .isInt({ min: 1 })
        .withMessage("user_id must be a positive integer")
        .toInt(),
    body("points")
        .isFloat()
        .withMessage("points must be a number")
        .toFloat(),
    body("note")
        .optional({ values: "falsy" })
        .trim()
        .isLength({ max: 255 })
        .withMessage("note must not exceed 255 characters"),
    body().custom((value, { req }) => {
        if (Number(req.body.points) === 0) {
            throw new Error("points must be a non-zero number");
        }
        return true;
    }),
];

export const redeemRewardPointsValidator = [
    body("user_id")
        .isInt({ min: 1 })
        .withMessage("user_id must be a positive integer")
        .toInt(),
    body("redeem_points")
        .isFloat({ gt: 0 })
        .withMessage("redeem_points must be a number > 0")
        .toFloat(),
    body("note")
        .optional({ values: "falsy" })
        .trim()
        .isLength({ max: 255 })
        .withMessage("note must not exceed 255 characters"),
];

export const processBookingRewardPointsValidator = [
    param("bookingId")
        .isInt({ min: 1 })
        .withMessage("bookingId must be a positive integer")
        .toInt(),
];

export const getMyRewardPointsValidator = [];

export const getMyRewardHistoryValidator = [
    query("page")
        .optional({ values: "falsy" })
        .isInt({ min: 1 })
        .withMessage("page must be a positive integer")
        .toInt(),
    query("limit")
        .optional({ values: "falsy" })
        .isInt({ min: 1, max: 100 })
        .withMessage("limit must be a number between 1 and 100")
        .toInt(),
    query("actionType")
        .optional({ values: "falsy" })
        .isInt({ min: 1, max: 6 })
        .withMessage("actionType must be a valid option")
        .toInt(),
    query("dateFrom")
        .optional({ values: "falsy" })
        .isISO8601()
        .withMessage("dateFrom must be a valid date"),
    query("dateTo")
        .optional({ values: "falsy" })
        .isISO8601()
        .withMessage("dateTo must be a valid date"),
];
