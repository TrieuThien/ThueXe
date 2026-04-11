import { query } from "express-validator";

export const paginationValidator = [
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

export const getRidesValidator = [
    query("routeId")
        .optional({ values: "falsy" })
        .isInt({ min: 1 })
        .withMessage("routeId must be a positive integer")
        .toInt(),
];

export const getAvailableCouponsValidator = [
    ...paginationValidator,
    query("search")
        .optional({ values: "falsy" })
        .trim()
        .isLength({ max: 100 })
        .withMessage("search must not exceed 100 characters"),
    query("rideId")
        .optional({ values: "falsy" })
        .isInt({ min: 1 })
        .withMessage("rideId must be a positive integer")
        .toInt(),
    query("routeId")
        .optional({ values: "falsy" })
        .isInt({ min: 1 })
        .withMessage("routeId must be a positive integer")
        .toInt(),
];

export const getNotificationsValidator = [...paginationValidator];
