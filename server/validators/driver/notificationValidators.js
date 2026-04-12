import { param, query } from "express-validator";

const paginationValidators = [
    query("page")
        .optional({ values: "falsy" })
        .isInt({ min: 1 })
        .withMessage("page must be a positive integer")
        .toInt(),
    query("limit")
        .optional({ values: "falsy" })
        .isInt({ min: 1, max: 100 })
        .withMessage("limit must be between 1 and 100")
        .toInt(),
];

const notificationIdParam = param("id")
    .isInt({ min: 1 })
    .withMessage("id must be a positive integer")
    .toInt();

export const listNotificationsValidator = [
    ...paginationValidators,
    query("n_type")
        .optional({ values: "falsy" })
        .isInt({ min: 0 })
        .withMessage("n_type must be a non-negative integer")
        .toInt(),
];

export const markOneReadValidator    = [notificationIdParam];
export const markAllReadValidator    = [];
export const unreadCountValidator    = [];
