import { body, param, query } from "express-validator";

export const bookingChatListValidator = [
    param("bookingId").isInt({ min: 1 }).withMessage("bookingId must be a positive integer").toInt(),
    query("page").optional({ values: "falsy" }).isInt({ min: 1 }).withMessage("page must be positive integer").toInt(),
    query("limit").optional({ values: "falsy" }).isInt({ min: 1, max: 200 }).withMessage("limit must be between 1 and 200").toInt(),
];

export const sendBookingChatValidator = [
    param("bookingId").isInt({ min: 1 }).withMessage("bookingId must be a positive integer").toInt(),
    body("chat_msg").trim().isLength({ min: 1, max: 5000 }).withMessage("chat_msg must be between 1 and 5000 characters"),
    body("sender_type").optional({ values: "falsy" }).isIn(["passenger", "driver"]).withMessage("sender_type must be passenger or driver"),
];

export const supportChatListValidator = [
    query("page").optional({ values: "falsy" }).isInt({ min: 1 }).withMessage("page must be positive integer").toInt(),
    query("limit").optional({ values: "falsy" }).isInt({ min: 1, max: 200 }).withMessage("limit must be between 1 and 200").toInt(),
    query("user_id").optional({ values: "falsy" }).isInt({ min: 1 }).withMessage("user_id must be positive integer").toInt(),
    query("driver_id").optional({ values: "falsy" }).isInt({ min: 1 }).withMessage("driver_id must be positive integer").toInt(),
];

export const sendSupportChatValidator = [
    body("chat_msg").trim().isLength({ min: 1, max: 5000 }).withMessage("chat_msg must be between 1 and 5000 characters"),
    body("session_status").optional({ values: "falsy" }).isIn([0, 1, "0", "1"]).withMessage("session_status must be 0 or 1").toInt(),
    body("user_id").optional({ values: "falsy" }).isInt({ min: 1 }).withMessage("user_id must be positive integer").toInt(),
    body("driver_id").optional({ values: "falsy" }).isInt({ min: 1 }).withMessage("driver_id must be positive integer").toInt(),
    body("rider_recipient_id").optional({ values: "falsy" }).isInt({ min: 1 }).withMessage("rider_recipient_id must be positive integer").toInt(),
    body("driver_recipient_id").optional({ values: "falsy" }).isInt({ min: 1 }).withMessage("driver_recipient_id must be positive integer").toInt(),
];

