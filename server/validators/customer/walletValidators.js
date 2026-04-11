import { body, param, query } from "express-validator";

const walletEntryTypes = [
    "topup",
    "ride_payment",
    "rental_payment",
    "withdrawal",
    "refund",
    "commission",
    "manual_adjustment",
];

export const walletTransactionsValidator = [
    query("page").optional({ values: "falsy" }).isInt({ min: 1 }).withMessage("page must be a positive integer").toInt(),
    query("limit").optional({ values: "falsy" }).isInt({ min: 1, max: 100 }).withMessage("limit must be between 1 and 100").toInt(),
    query("entry_type").optional({ values: "falsy" }).isIn(walletEntryTypes).withMessage("entry_type is invalid"),
];

export const createTopupPaymentValidator = [
    body("amount").isFloat({ gt: 0 }).withMessage("amount must be greater than 0").toFloat(),
    body("gateway_name").isString().trim().isLength({ min: 1, max: 30 }).withMessage("gateway_name is required and must not exceed 30 characters"),
];

export const confirmTopupValidator = [
    body("payment_id").isInt({ min: 1 }).withMessage("payment_id must be a positive integer").toInt(),
    body("callback_data").optional({ values: "falsy" }).isObject().withMessage("callback_data must be an object"),
    body("status").optional({ values: "falsy" }).isString().withMessage("status must be a string"),
    body("gateway_status").optional({ values: "falsy" }).isString().withMessage("gateway_status must be a string"),
];

export const createWithdrawalValidator = [
    body("amount").isFloat({ gt: 0 }).withMessage("amount must be greater than 0").toFloat(),
    body("bank_account_id").isInt({ min: 1 }).withMessage("bank_account_id must be a positive integer").toInt(),
    body("note").optional({ values: "falsy" }).trim().isLength({ max: 255 }).withMessage("note must not exceed 255 characters"),
];

export const withdrawalsQueryValidator = [
    query("page").optional({ values: "falsy" }).isInt({ min: 1 }).withMessage("page must be a positive integer").toInt(),
    query("limit").optional({ values: "falsy" }).isInt({ min: 1, max: 100 }).withMessage("limit must be between 1 and 100").toInt(),
];

export const paymentIdParamValidator = [
    param("paymentId").isInt({ min: 1 }).withMessage("paymentId must be a positive integer").toInt(),
];

export const ridePaymentValidator = [
    param("bookingId").isInt({ min: 1 }).withMessage("bookingId must be a positive integer").toInt(),
    body("payment_type").isIn([1, 2, 3, 4, "1", "2", "3", "4"]).withMessage("payment_type must be one of 1,2,3,4").toInt(),
    body("gateway_name").optional({ values: "falsy" }).isString().trim().isLength({ max: 30 }).withMessage("gateway_name must not exceed 30 characters"),
];

export const rentalPaymentValidator = [
    param("rentalId").isInt({ min: 1 }).withMessage("rentalId must be a positive integer").toInt(),
    body("payment_type").isIn([1, 2, 3, 4, "1", "2", "3", "4"]).withMessage("payment_type must be one of 1,2,3,4").toInt(),
    body("gateway_name").optional({ values: "falsy" }).isString().trim().isLength({ max: 30 }).withMessage("gateway_name must not exceed 30 characters"),
];

export const retryPaymentValidator = [
    ...paymentIdParamValidator,
];

export const webhookConfirmValidator = [
    body("payment_id").isInt({ min: 1 }).withMessage("payment_id must be a positive integer").toInt(),
    body("status").optional({ values: "falsy" }).isString().withMessage("status must be a string"),
    body("gateway_status").optional({ values: "falsy" }).isString().withMessage("gateway_status must be a string"),
    body("gateway_name").optional({ values: "falsy" }).isString().withMessage("gateway_name must be a string"),
    body("gateway_transaction_ref").optional({ values: "falsy" }).isString().isLength({ max: 100 }).withMessage("gateway_transaction_ref must not exceed 100 characters"),
];
