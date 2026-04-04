import { query } from "express-validator";

export const dashboardDateRangeValidator = [
    query("date_from").optional({ values: "falsy" }).matches(/^\d{4}-\d{2}-\d{2}$/).withMessage("date_from must be YYYY-MM-DD"),
    query("date_to").optional({ values: "falsy" }).matches(/^\d{4}-\d{2}-\d{2}$/).withMessage("date_to must be YYYY-MM-DD"),
];

export const operationsReportValidator = [
    ...dashboardDateRangeValidator,
    query("granularity").optional({ values: "falsy" }).isIn(["day", "month"]).withMessage("granularity must be day or month"),
];

