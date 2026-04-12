import {
    acceptBooking,
    cancelRide,
    completeRide,
    getActiveBooking,
    getBookingDetail,
    getBookingHistory,
    markArrived,
    rejectBooking,
    startRide,
} from "../../services/driver/bookingService.js";
import { successResponse } from "../../utils/apiResponse.js";

export async function getActiveBookingHandler(req, res, next) {
    try {
        const result = await getActiveBooking(req.auth);
        return successResponse(res, result, "Active booking fetched");
    } catch (error) {
        return next(error);
    }
}

export async function getBookingHistoryHandler(req, res, next) {
    try {
        const result = await getBookingHistory(req.auth, req.query);
        return successResponse(res, result, "Booking history fetched");
    } catch (error) {
        return next(error);
    }
}

export async function getBookingDetailHandler(req, res, next) {
    try {
        const result = await getBookingDetail(req.auth, req.params.bookingId);
        return successResponse(res, result, "Booking detail fetched");
    } catch (error) {
        return next(error);
    }
}

export async function acceptBookingHandler(req, res, next) {
    try {
        const result = await acceptBooking(req.auth, req.params.bookingId);
        return successResponse(res, result, "Booking accepted");
    } catch (error) {
        return next(error);
    }
}

export async function rejectBookingHandler(req, res, next) {
    try {
        const result = await rejectBooking(req.auth, req.params.bookingId);
        return successResponse(res, result, result.message);
    } catch (error) {
        return next(error);
    }
}

export async function markArrivedHandler(req, res, next) {
    try {
        const result = await markArrived(req.auth, req.params.bookingId);
        return successResponse(res, result, "Marked as arrived");
    } catch (error) {
        return next(error);
    }
}

export async function startRideHandler(req, res, next) {
    try {
        const result = await startRide(req.auth, req.params.bookingId);
        return successResponse(res, result, "Ride started");
    } catch (error) {
        return next(error);
    }
}

export async function completeRideHandler(req, res, next) {
    try {
        const result = await completeRide(req.auth, req.params.bookingId, req.body);
        return successResponse(res, result, "Ride completed");
    } catch (error) {
        return next(error);
    }
}

export async function cancelRideHandler(req, res, next) {
    try {
        const result = await cancelRide(req.auth, req.params.bookingId, req.body);
        return successResponse(res, result, "Booking cancelled");
    } catch (error) {
        return next(error);
    }
}
