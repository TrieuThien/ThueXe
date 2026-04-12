import { successResponse } from "../../utils/apiResponse.js";
import {
    getCurrentTrip,
    getPendingRequests,
    acceptTrip,
    rejectTrip,
    markTripArrived,
    startTrip,
    completeTrip,
    cancelTrip,
    getTripDetail,
    sendTripChat,
    getTripChat,
    getTripRoute,
    getTripHistory,
    getTripHistoryDetail,
} from "../../services/driver/tripService.js";
import { rateCustomerByDriver } from "../../services/driver/tripRatingService.js";

export async function getCurrentTripHandler(req, res, next) {
    try {
        const result = await getCurrentTrip(req.auth);
        return successResponse(res, result, "Current trip fetched");
    } catch (error) {
        return next(error);
    }
}

export async function getPendingRequestsHandler(req, res, next) {
    try {
        const result = await getPendingRequests(req.auth);
        return successResponse(res, result, "Pending requests fetched");
    } catch (error) {
        return next(error);
    }
}

export async function acceptTripHandler(req, res, next) {
    try {
        const result = await acceptTrip(req.auth, req.params.bookingId);
        return successResponse(res, result, "Trip accepted");
    } catch (error) {
        return next(error);
    }
}

export async function rejectTripHandler(req, res, next) {
    try {
        const result = await rejectTrip(req.auth, req.params.bookingId);
        return successResponse(res, result, "Trip rejected");
    } catch (error) {
        return next(error);
    }
}

export async function arrivedHandler(req, res, next) {
    try {
        const result = await markTripArrived(req.auth, req.params.bookingId, req.body);
        return successResponse(res, result, "Marked as arrived at pickup");
    } catch (error) {
        return next(error);
    }
}

export async function startTripHandler(req, res, next) {
    try {
        const result = await startTrip(req.auth, req.params.bookingId, req.body);
        return successResponse(res, result, "Trip started");
    } catch (error) {
        return next(error);
    }
}

export async function completeTripHandler(req, res, next) {
    try {
        const result = await completeTrip(req.auth, req.params.bookingId, req.body);
        return successResponse(res, result, "Trip completed");
    } catch (error) {
        return next(error);
    }
}

export async function cancelTripHandler(req, res, next) {
    try {
        const result = await cancelTrip(req.auth, req.params.bookingId, req.body);
        return successResponse(res, result, "Trip cancelled");
    } catch (error) {
        return next(error);
    }
}

export async function getTripDetailHandler(req, res, next) {
    try {
        const result = await getTripDetail(req.auth, req.params.bookingId);
        return successResponse(res, result, "Trip detail fetched");
    } catch (error) {
        return next(error);
    }
}

export async function sendChatHandler(req, res, next) {
    try {
        const result = await sendTripChat(req.auth, req.params.bookingId, req.body);
        return successResponse(res, result, "Message sent", 201);
    } catch (error) {
        return next(error);
    }
}

export async function getChatHandler(req, res, next) {
    try {
        const result = await getTripChat(req.auth, req.params.bookingId);
        return successResponse(res, result, "Chat history fetched");
    } catch (error) {
        return next(error);
    }
}

export async function getTripRouteHandler(req, res, next) {
    try {
        const result = await getTripRoute(req.auth, req.params.bookingId);
        return successResponse(res, result, "Trip route fetched");
    } catch (error) {
        return next(error);
    }
}

export async function getTripHistoryHandler(req, res, next) {
    try {
        const result = await getTripHistory(req.auth, req.query);
        return successResponse(res, result, "Trip history fetched");
    } catch (error) {
        return next(error);
    }
}

export async function getTripHistoryDetailHandler(req, res, next) {
    try {
        const result = await getTripHistoryDetail(req.auth, req.params.bookingId);
        return successResponse(res, result, "Trip history detail fetched");
    } catch (error) {
        return next(error);
    }
}

export async function rateCustomerHandler(req, res, next) {
    try {
        const result = await rateCustomerByDriver(req.auth, req.params.bookingId, req.body);
        return successResponse(res, result, "Customer rated successfully");
    } catch (error) {
        return next(error);
    }
}
