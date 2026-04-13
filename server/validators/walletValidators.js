import { body, param, query } from "express-validator";

export const walletPaginationValidator = [
    query("page").optional({ values: "falsy" }).isInt({ min: 1 }).withMessage("page must be a positive integer").toInt(),
    query("limit").optional({ values: "falsy" }).isInt({ min: 1, max: 100 }).withMessage("limit must be between 1 and 100").toInt(),
];

export const topupWalletValidator = [
    body("amount").isFloat({ gt: 0 }).withMessage("amount must be greater than 0").toFloat(),
    body("gateway_name").optional({ values: "falsy" }).trim().isLength({ max: 30 }).withMessage("gateway_name must not exceed 30 characters"),
    body("gateway_ref").optional({ values: "falsy" }).trim().isLength({ max: 100 }).withMessage("gateway_ref must not exceed 100 characters"),
    body("note").optional({ values: "falsy" }).trim().isLength({ max: 255 }).withMessage("note must not exceed 255 characters"),
];

export const createWithdrawalValidator = [
    body("amount").isFloat({ gt: 0 }).withMessage("amount must be greater than 0").toFloat(),
    body("note").optional({ values: "falsy" }).trim().isLength({ max: 255 }).withMessage("note must not exceed 255 characters"),
];

export const payBookingByWalletValidator = [
    param("bookingId").isInt({ min: 1 }).withMessage("bookingId must be a positive integer").toInt(),
];

export const payRentalByWalletValidator = [
    param("rentalId").isInt({ min: 1 }).withMessage("rentalId must be a positive integer").toInt(),
];

export const adminWalletAccountsValidator = [
    ...walletPaginationValidator,
    query("actor_type").optional({ values: "falsy" }).isInt({ min: 0, max: 3 }).withMessage("actor_type must be between 0 and 3").toInt(),
    query("status").optional({ values: "falsy" }).isInt({ min: 0, max: 1 }).withMessage("status must be 0 or 1").toInt(),
    query("search").optional({ values: "falsy" }).trim().isLength({ max: 100 }).withMessage("search must not exceed 100 characters"),
];

export const adminWalletLedgerValidator = [
    ...walletPaginationValidator,
    query("actor_type").optional({ values: "falsy" }).isInt({ min: 0, max: 3 }).withMessage("actor_type must be between 0 and 3").toInt(),
    query("actor_id").optional({ values: "falsy" }).isInt({ min: 1 }).withMessage("actor_id must be a positive integer").toInt(),
    query("direction").optional({ values: "falsy" }).isIn(["credit", "debit"]).withMessage("direction must be credit or debit"),
    query("entry_type")
        .optional({ values: "falsy" })
        .isIn(["topup", "ride_payment", "rental_payment", "withdrawal", "refund", "commission", "manual_adjustment"])
        .withMessage("entry_type is invalid"),
];

export const adminAdjustWalletValidator = [
    body("actor_type").isInt({ min: 0, max: 3 }).withMessage("actor_type must be between 0 and 3").toInt(),
    body("actor_id").isInt({ min: 1 }).withMessage("actor_id must be a positive integer").toInt(),
    body("direction").isIn(["credit", "debit"]).withMessage("direction must be credit or debit"),
    body("amount").isFloat({ gt: 0 }).withMessage("amount must be greater than 0").toFloat(),
    body("note").optional({ values: "falsy" }).trim().isLength({ max: 255 }).withMessage("note must not exceed 255 characters"),
];

export const adminUpdateWalletStatusValidator = [
    param("walletId").isInt({ min: 1 }).withMessage("walletId must be a positive integer").toInt(),
    body("status").isInt({ min: 0, max: 1 }).withMessage("status must be 0 (disabled) or 1 (active)").toInt(),
];

export const adminProcessWithdrawalValidator = [
    param("withdrawalId").isInt({ min: 1 }).withMessage("withdrawalId must be a positive integer").toInt(),
    body("status").isIn(["approved", "rejected", "paid", "cancelled"]).withMessage("status is invalid"),
    body("note").optional({ values: "falsy" }).trim().isLength({ max: 255 }).withMessage("note must not exceed 255 characters"),
];

