import { query } from "express-validator";

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

const dateRangeValidators = [
    query("fromDate")
        .optional({ values: "falsy" })
        .isDate()
        .withMessage("fromDate must be a valid date (YYYY-MM-DD)"),
    query("toDate")
        .optional({ values: "falsy" })
        .isDate()
        .withMessage("toDate must be a valid date (YYYY-MM-DD)"),
];

// ─── GET /income/summary ──────────────────────────────────────────────────────
export const incomeSummaryValidator = [];

// ─── GET /income/chart ────────────────────────────────────────────────────────
export const incomeChartValidator = [
    query("mode")
        .optional({ values: "falsy" })
        .isIn(["day", "month"])
        .withMessage("mode must be 'day' or 'month'"),
    query("period")
        .optional({ values: "falsy" })
        .isInt({ min: 1 })
        .withMessage("period must be a positive integer")
        .toInt(),
];

// ─── GET /income/history ──────────────────────────────────────────────────────
export const incomeHistoryValidator = [
    ...paginationValidators,
    ...dateRangeValidators,
    query("service_type")
        .optional({ values: "falsy" })
        .isInt({ min: 0 })
        .withMessage("service_type must be a non-negative integer")
        .toInt(),
];
