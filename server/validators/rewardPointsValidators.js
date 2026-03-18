import { body, param, query } from "express-validator";

export const getAdminRewardConfigValidator = [];

export const updateAdminRewardConfigValidator = [
    body("cur_to_points_conv")
        .isFloat({ gt: 0 })
        .withMessage("cur_to_points_conv ph?i là s? > 0")
        .toFloat(),
    body("points_to_cur_conv")
        .isFloat({ gt: 0 })
        .withMessage("points_to_cur_conv ph?i là s? > 0")
        .toFloat(),
    body("status")
        .isInt({ min: 0, max: 1 })
        .withMessage("status ch? ch?p nh?n 0 ho?c 1")
        .toInt(),
    body("min_points_redeemable")
        .isInt({ min: 1 })
        .withMessage("min_points_redeemable ph?i là s? nguyên >= 1")
        .toInt(),
];

export const getAdminRewardHistoryValidator = [
    query("page")
        .optional({ values: "falsy" })
        .isInt({ min: 1 })
        .withMessage("page ph?i là s? nguyên duong")
        .toInt(),
    query("limit")
        .optional({ values: "falsy" })
        .isInt({ min: 1, max: 100 })
        .withMessage("limit ph?i n?m trong kho?ng 1-100")
        .toInt(),
    query("userId")
        .optional({ values: "falsy" })
        .isInt({ min: 1 })
        .withMessage("userId ph?i là s? nguyên duong")
        .toInt(),
    query("actionType")
        .optional({ values: "falsy" })
        .isInt({ min: 1, max: 6 })
        .withMessage("actionType không h?p l?")
        .toInt(),
    query("search")
        .optional({ values: "falsy" })
        .trim()
        .isLength({ max: 100 })
        .withMessage("search không du?c quá 100 ký t?"),
    query("dateFrom")
        .optional({ values: "falsy" })
        .isISO8601()
        .withMessage("dateFrom không h?p l?"),
    query("dateTo")
        .optional({ values: "falsy" })
        .isISO8601()
        .withMessage("dateTo không h?p l?"),
];

export const adjustRewardPointsValidator = [
    body("user_id")
        .isInt({ min: 1 })
        .withMessage("user_id ph?i là s? nguyên duong")
        .toInt(),
    body("points")
        .isFloat()
        .withMessage("points ph?i là s?")
        .toFloat(),
    body("note")
        .optional({ values: "falsy" })
        .trim()
        .isLength({ max: 255 })
        .withMessage("note không du?c quá 255 ký t?"),
    body().custom((value, { req }) => {
        if (Number(req.body.points) === 0) {
            throw new Error("points ph?i khác 0");
        }
        return true;
    }),
];

export const redeemRewardPointsValidator = [
    body("user_id")
        .isInt({ min: 1 })
        .withMessage("user_id ph?i là s? nguyên duong")
        .toInt(),
    body("redeem_points")
        .isFloat({ gt: 0 })
        .withMessage("redeem_points ph?i là s? > 0")
        .toFloat(),
    body("note")
        .optional({ values: "falsy" })
        .trim()
        .isLength({ max: 255 })
        .withMessage("note không du?c quá 255 ký t?"),
];

export const processBookingRewardPointsValidator = [
    param("bookingId")
        .isInt({ min: 1 })
        .withMessage("bookingId ph?i là s? nguyên duong")
        .toInt(),
];

export const getMyRewardPointsValidator = [];

export const getMyRewardHistoryValidator = [
    query("page")
        .optional({ values: "falsy" })
        .isInt({ min: 1 })
        .withMessage("page ph?i là s? nguyên duong")
        .toInt(),
    query("limit")
        .optional({ values: "falsy" })
        .isInt({ min: 1, max: 100 })
        .withMessage("limit ph?i n?m trong kho?ng 1-100")
        .toInt(),
    query("actionType")
        .optional({ values: "falsy" })
        .isInt({ min: 1, max: 6 })
        .withMessage("actionType không h?p l?")
        .toInt(),
    query("dateFrom")
        .optional({ values: "falsy" })
        .isISO8601()
        .withMessage("dateFrom không h?p l?"),
    query("dateTo")
        .optional({ values: "falsy" })
        .isISO8601()
        .withMessage("dateTo không h?p l?"),
];
