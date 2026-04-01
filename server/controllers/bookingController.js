import {
    assignDriver,
    changeBookingStatus,
    createBooking,
    estimateBookingRoute,
    getAssignableDrivers,
    getBookingDetail,
    getBookingList,
    getBookingLocationSuggestions,
    getBookingMeta,
    getProcessingBookingList,
    getScheduledBookingList,
    quoteBookingPrice,
} from "../services/bookingService.js";
import { successResponse } from "../utils/apiResponse.js";

export async function createBookingHandler(req, res, next) {
    try {
        const result = await createBooking({
            payload: req.body,
            auth: req.auth,
            idempotencyKey: req.headers["x-idempotency-key"],
            ipAddress: req.ip,
        });

        return successResponse(res, result, "Booking created successfully", 201);
    } catch (error) {
        return next(error);
    }
}

export async function getBookingListHandler(req, res, next) {
    try {
        const result = await getBookingList({ query: req.query, auth: req.auth });
        return successResponse(res, result, "Bookings fetched successfully");
    } catch (error) {
        return next(error);
    }
}

export async function getProcessingBookingListHandler(req, res, next) {
    try {
        const result = await getProcessingBookingList({ query: req.query, auth: req.auth });
        return successResponse(res, result, "Processing bookings fetched successfully");
    } catch (error) {
        return next(error);
    }
}

export async function getScheduledBookingListHandler(req, res, next) {
    try {
        const result = await getScheduledBookingList({ query: req.query, auth: req.auth });
        return successResponse(res, result, "Scheduled bookings fetched successfully");
    } catch (error) {
        return next(error);
    }
}

export async function getBookingDetailHandler(req, res, next) {
    try {
        const result = await getBookingDetail({ bookingId: req.params.bookingId, auth: req.auth });
        return successResponse(res, result, "Booking detail fetched successfully");
    } catch (error) {
        return next(error);
    }
}

export async function assignDriverHandler(req, res, next) {
    try {
        const result = await assignDriver({
            bookingId: req.params.bookingId,
            driverId: req.body.driver_id,
            auth: req.auth,
        });

        return successResponse(res, result, "Driver assigned successfully");
    } catch (error) {
        return next(error);
    }
}

export async function updateBookingStatusHandler(req, res, next) {
    try {
        const result = await changeBookingStatus({
            bookingId: req.params.bookingId,
            status: req.body.status,
            cancelComment: req.body.cancel_comment,
            auth: req.auth,
        });

        return successResponse(res, result, "Booking status updated successfully");
    } catch (error) {
        return next(error);
    }
}

export async function getAssignableDriversHandler(req, res, next) {
    try {
        const result = await getAssignableDrivers({ query: req.query, auth: req.auth });
        return successResponse(res, result, "Assignable drivers fetched successfully");
    } catch (error) {
        return next(error);
    }
}

export async function getBookingMetaHandler(req, res, next) {
    try {
        const result = await getBookingMeta({ auth: req.auth });
        return successResponse(res, result, "Booking meta fetched successfully");
    } catch (error) {
        return next(error);
    }
}

export async function getBookingLocationSuggestionsHandler(req, res, next) {
    try {
        const result = await getBookingLocationSuggestions({ query: req.query, auth: req.auth });
        return successResponse(res, result, "Location suggestions fetched successfully");
    } catch (error) {
        return next(error);
    }
}

export async function estimateBookingRouteHandler(req, res, next) {
    try {
        const result = await estimateBookingRoute({ query: req.query, auth: req.auth });
        return successResponse(res, result, "Route estimate fetched successfully");
    } catch (error) {
        return next(error);
    }
}

export async function quoteBookingPriceHandler(req, res, next) {
    try {
        const result = await quoteBookingPrice({ payload: req.body, auth: req.auth });
        return successResponse(res, result, "Booking quote fetched successfully");
    } catch (error) {
        return next(error);
    }
}
