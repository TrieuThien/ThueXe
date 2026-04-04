import { successResponse } from "../utils/apiResponse.js";
import {
    getBookingChatsService,
    listSupportChatsService,
    sendBookingChatService,
    sendSupportChatService,
} from "../services/chatService.js";

export async function getBookingChatsHandler(req, res, next) {
    try {
        const result = await getBookingChatsService({
            bookingId: req.params.bookingId,
            auth: req.auth,
            query: req.query,
        });
        return successResponse(res, result, "Booking chats fetched successfully");
    } catch (error) {
        return next(error);
    }
}

export async function sendBookingChatHandler(req, res, next) {
    try {
        const result = await sendBookingChatService({
            bookingId: req.params.bookingId,
            auth: req.auth,
            payload: req.body,
        });
        return successResponse(res, result, "Chat message sent successfully", 201);
    } catch (error) {
        return next(error);
    }
}

export async function listSupportChatsHandler(req, res, next) {
    try {
        const result = await listSupportChatsService({
            auth: req.auth,
            query: req.query,
        });
        return successResponse(res, result, "Support chats fetched successfully");
    } catch (error) {
        return next(error);
    }
}

export async function sendSupportChatHandler(req, res, next) {
    try {
        const result = await sendSupportChatService({
            auth: req.auth,
            payload: req.body,
        });
        return successResponse(res, result, "Support chat message sent successfully", 201);
    } catch (error) {
        return next(error);
    }
}

