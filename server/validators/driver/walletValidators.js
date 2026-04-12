import { body, param, query } from "express-validator";

// ─── Shared pagination validators ─────────────────────────────────────────────

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

// Valid enum values from wallet_ledger schema
const VALID_ENTRY_TYPES = [
    "topup", "ride_payment", "rental_payment",
    "withdrawal", "refund", "commission", "manual_adjustment",
];
const VALID_DIRECTIONS = ["credit", "debit"];

// ─── Validators ───────────────────────────────────────────────────────────────

export const getWalletSummaryValidator = [];

export const getWalletValidator = [];

export const getTransactionsValidator = [
    ...paginationValidators,
    query("entry_type")
        .optional({ values: "falsy" })
        .isIn(VALID_ENTRY_TYPES)
        .withMessage(`entry_type must be one of: ${VALID_ENTRY_TYPES.join(", ")}`),
    query("direction")
        .optional({ values: "falsy" })
        .isIn(VALID_DIRECTIONS)
        .withMessage("direction must be 'credit' or 'debit'"),
    query("fromDate")
        .optional({ values: "falsy" })
        .isDate()
        .withMessage("fromDate must be a valid date (YYYY-MM-DD)"),
    query("toDate")
        .optional({ values: "falsy" })
        .isDate()
        .withMessage("toDate must be a valid date (YYYY-MM-DD)"),
];

export const getWithdrawalsValidator = [...paginationValidators];

export const requestWithdrawalValidator = [
    body("amount")
        .isFloat({ min: 0.01 })
        .withMessage("amount must be a positive number greater than 0")
        .toFloat(),
    body("note")
        .optional({ values: "falsy" })
        .trim()
        .isLength({ max: 255 })
        .withMessage("note must not exceed 255 characters"),
];

// ─── Topup ────────────────────────────────────────────────────────────────────

export const createTopupValidator = [
    body("amount")
        .isFloat({ min: 0.01 })
        .withMessage("amount must be a positive number greater than 0")
        .toFloat(),
    body("gateway_name")
        .optional({ values: "falsy" })
        .trim()
        .isLength({ max: 30 })
        .withMessage("gateway_name must not exceed 30 characters"),
    body("note")
        .optional({ values: "falsy" })
        .trim()
        .isLength({ max: 255 })
        .withMessage("note must not exceed 255 characters"),
];

export const getTopupDetailValidator = [
    param("paymentCode")
        .trim()
        .isLength({ min: 1, max: 100 })
        .withMessage("paymentCode must be 1-100 characters"),
];

export const topupCallbackValidator = [
    body("payment_code")
        .trim()
        .isLength({ min: 1, max: 100 })
        .withMessage("payment_code is required (1-100 characters)"),
    body("status")
        .isIn(["paid", "failed", "cancelled"])
        .withMessage("status must be 'paid', 'failed', or 'cancelled'"),
    body("gateway_transaction_ref")
        .optional({ values: "falsy" })
        .trim()
        .isLength({ max: 100 })
        .withMessage("gateway_transaction_ref must not exceed 100 characters"),
    body("amount")
        .optional({ values: "falsy" })
        .isFloat({ min: 0 })
        .withMessage("amount must be a non-negative number")
        .toFloat(),
];

// ─── Withdrawal detail ────────────────────────────────────────────────────────

export const getWithdrawalDetailValidator = [
    param("withdrawalId")
        .isInt({ min: 1 })
        .withMessage("withdrawalId must be a positive integer")
        .toInt(),
];
