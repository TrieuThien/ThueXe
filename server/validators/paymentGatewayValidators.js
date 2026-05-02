import { body } from "express-validator";

export const momoIpnValidator = [
    body("partnerCode").isString().notEmpty().withMessage("partnerCode is required"),
    body("orderId").isString().notEmpty().withMessage("orderId is required"),
    body("requestId").isString().notEmpty().withMessage("requestId is required"),
    body("amount").notEmpty().withMessage("amount is required"),
    body("resultCode").notEmpty().withMessage("resultCode is required"),
    body("signature").isString().notEmpty().withMessage("signature is required"),
];

export const sepayIpnValidator = [
    body("id").notEmpty().withMessage("id is required"),
    body("transferType").isString().notEmpty().withMessage("transferType is required"),
    body("transferAmount").isNumeric().withMessage("transferAmount must be numeric"),
];
