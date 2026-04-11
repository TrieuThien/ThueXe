import { successResponse } from "../../utils/apiResponse.js";
import {
    getRentalChatMessages,
    getRideChatMessages,
    pollRentalChatMessages,
    pollRideChatMessages,
    sendRentalChatMessage,
    sendRideChatMessage,
} from "../../services/customer/chatService.js";

export async function getRideChatMessagesHandler(req, res, next) {
    try {
        const result = await getRideChatMessages(req.auth, req.params.bookingId, req.query);
        return successResponse(res, result, "Ride chat messages fetched successfully.");
    } catch (error) {
        return next(error);
    }
}

export async function sendRideChatMessageHandler(req, res, next) {
    try {
        const result = await sendRideChatMessage(req.auth, req.params.bookingId, req.body);
        return successResponse(res, result, "Ride chat message sent successfully.", 201);
    } catch (error) {
        return next(error);
    }
}

export async function pollRideChatMessagesHandler(req, res, next) {
    try {
        const result = await pollRideChatMessages(req.auth, req.params.bookingId, req.query);
        return successResponse(res, result, "Ride chat messages polled successfully.");
    } catch (error) {
        return next(error);
    }
}

export async function getRentalChatMessagesHandler(req, res, next) {
    try {
        const result = await getRentalChatMessages(req.auth, req.params.rentalId, req.query);
        return successResponse(res, result, "Rental chat messages fetched successfully.");
    } catch (error) {
        return next(error);
    }
}

export async function sendRentalChatMessageHandler(req, res, next) {
    try {
        const result = await sendRentalChatMessage(req.auth, req.params.rentalId, req.body);
        return successResponse(res, result, "Rental chat message sent successfully.", 201);
    } catch (error) {
        return next(error);
    }
}

export async function pollRentalChatMessagesHandler(req, res, next) {
    try {
        const result = await pollRentalChatMessages(req.auth, req.params.rentalId, req.query);
        return successResponse(res, result, "Rental chat messages polled successfully.");
    } catch (error) {
        return next(error);
    }
}
