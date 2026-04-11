import { successResponse } from "../../utils/apiResponse.js";
import {
    getBookingStatusFallback,
    getDriverLocationFallback,
    getRealtimeHealth,
    streamRealtime,
} from "../../services/customer/realtimeService.js";

export async function streamRealtimeHandler(req, res, next) {
    try {
        await streamRealtime(req, res);
    } catch (error) {
        return next(error);
    }
}

export async function getBookingStatusFallbackHandler(req, res, next) {
    try {
        const result = await getBookingStatusFallback(req.auth, req.params.bookingId);
        return successResponse(res, result, "Booking status fetched successfully.");
    } catch (error) {
        return next(error);
    }
}

export async function getDriverLocationFallbackHandler(req, res, next) {
    try {
        const result = await getDriverLocationFallback(req.auth, req.params.bookingId);
        return successResponse(res, result, "Driver location fetched successfully.");
    } catch (error) {
        return next(error);
    }
}

export async function getRealtimeHealthHandler(req, res, next) {
    try {
        const result = getRealtimeHealth();
        return successResponse(res, result, "Realtime stats fetched successfully.");
    } catch (error) {
        return next(error);
    }
}
