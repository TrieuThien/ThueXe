import {
    createSupportTicket,
    getSupportTicketDetail,
    getSupportTopics,
    listSupportTickets,
    sendTicketMessage,
} from "../../services/driver/supportService.js";
import { successResponse } from "../../utils/apiResponse.js";

export async function getSupportTopicsHandler(req, res, next) {
    try {
        const result = await getSupportTopics();
        return successResponse(res, result, "Support topics fetched");
    } catch (error) {
        return next(error);
    }
}

export async function createTicketHandler(req, res, next) {
    try {
        const result = await createSupportTicket(req.auth, req.body);
        return successResponse(res, result, "Support ticket created", 201);
    } catch (error) {
        return next(error);
    }
}

export async function listTicketsHandler(req, res, next) {
    try {
        const result = await listSupportTickets(req.auth, req.query);
        return successResponse(res, result, "Support tickets fetched");
    } catch (error) {
        return next(error);
    }
}

export async function getTicketDetailHandler(req, res, next) {
    try {
        const result = await getSupportTicketDetail(req.auth, req.params.ticketId);
        return successResponse(res, result, "Support ticket detail fetched");
    } catch (error) {
        return next(error);
    }
}

export async function sendTicketMessageHandler(req, res, next) {
    try {
        const result = await sendTicketMessage(req.auth, req.params.ticketId, req.body);
        return successResponse(res, result, "Message sent");
    } catch (error) {
        return next(error);
    }
}
