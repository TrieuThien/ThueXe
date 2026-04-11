import { body, param, query } from "express-validator";

const messageTypeValues = ["text", "image", "location", "file"];

const messagePayloadValidator = [
    body("message")
        .optional({ values: "falsy" })
        .isString()
        .isLength({ max: 5000 })
        .withMessage("message must be at most 5000 characters")
        .trim(),
    body("message_type")
        .optional({ values: "falsy" })
        .isIn(messageTypeValues)
        .withMessage("message_type must be one of text,image,location,file"),
    body("media_url")
        .optional({ values: "falsy" })
        .isString()
        .isLength({ max: 2000 })
        .withMessage("media_url must be at most 2000 characters")
        .trim(),
    body("latitude")
        .optional({ values: "falsy" })
        .isFloat({ min: -90, max: 90 })
        .withMessage("latitude must be between -90 and 90")
        .toFloat(),
    body("longitude")
        .optional({ values: "falsy" })
        .isFloat({ min: -180, max: 180 })
        .withMessage("longitude must be between -180 and 180")
        .toFloat(),
    body("reply_to_message_id")
        .optional({ values: "falsy" })
        .isInt({ min: 1 })
        .withMessage("reply_to_message_id must be a positive integer")
        .toInt(),
    body().custom((value, { req }) => {
        const messageType = String(req.body.message_type || "text").trim().toLowerCase();
        const message = String(req.body.message || "").trim();
        const mediaUrl = String(req.body.media_url || "").trim();

        if (messageType === "text" && !message) {
            throw new Error("message is required when message_type is text");
        }

        if (["image", "file"].includes(messageType) && !mediaUrl) {
            throw new Error("media_url is required when message_type is image or file");
        }

        if (messageType === "location") {
            const lat = Number(req.body.latitude);
            const lng = Number(req.body.longitude);
            if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
                throw new Error("latitude and longitude are required when message_type is location");
            }
        }

        return true;
    }),
];

const pollingValidator = [
    query("last_message_id")
        .optional({ values: "falsy" })
        .isInt({ min: 0 })
        .withMessage("last_message_id must be a non-negative integer")
        .toInt(),
    query("limit")
        .optional({ values: "falsy" })
        .isInt({ min: 1, max: 200 })
        .withMessage("limit must be between 1 and 200")
        .toInt(),
];

const paginationValidator = [
    query("page")
        .optional({ values: "falsy" })
        .isInt({ min: 1 })
        .withMessage("page must be a positive integer")
        .toInt(),
    query("limit")
        .optional({ values: "falsy" })
        .isInt({ min: 1, max: 200 })
        .withMessage("limit must be between 1 and 200")
        .toInt(),
];

export const rideChatBookingParamValidator = [
    param("bookingId")
        .isInt({ min: 1 })
        .withMessage("bookingId must be a positive integer")
        .toInt(),
];

export const rentalChatParamValidator = [
    param("rentalId")
        .isInt({ min: 1 })
        .withMessage("rentalId must be a positive integer")
        .toInt(),
];

export const getRideChatMessagesValidator = [
    ...rideChatBookingParamValidator,
    ...paginationValidator,
];

export const sendRideChatMessageValidator = [
    ...rideChatBookingParamValidator,
    ...messagePayloadValidator,
];

export const pollRideChatMessagesValidator = [
    ...rideChatBookingParamValidator,
    ...pollingValidator,
];

export const getRentalChatMessagesValidator = [
    ...rentalChatParamValidator,
    ...paginationValidator,
];

export const sendRentalChatMessageValidator = [
    ...rentalChatParamValidator,
    ...messagePayloadValidator,
];

export const pollRentalChatMessagesValidator = [
    ...rentalChatParamValidator,
    ...pollingValidator,
];
