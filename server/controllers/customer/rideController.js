import {
    cancelBooking,
    changePaymentMethod,
    createBooking,
    estimateFare,
    estimateRoute,
    getBookingCancelPolicy,
    getBookingDetail,
    getBookingHistory,
    getBookingStatusSnapshot,
    getCurrentBooking,
} from "../../services/customer/rideService.js";
import { successResponse } from "../../utils/apiResponse.js";

export async function estimateRouteHandler(req, res, next) {
    try {
        const result = await estimateRoute(req.auth, req.body);
        return successResponse(res, result, "Route estimated successfully.");
    } catch (error) {
        return next(error);
    }
}

export async function estimateFareHandler(req, res, next) {
    try {
        const result = await estimateFare(req.auth, req.body);
        return successResponse(res, result, "Fare estimated successfully.");
    } catch (error) {
        return next(error);
    }
}

export async function createBookingHandler(req, res, next) {
    try {
        const result = await createBooking(req.auth, req.body);
        return successResponse(res, result, "Booking created successfully.", 201);
    } catch (error) {
        return next(error);
    }
}

export async function getCurrentBookingHandler(req, res, next) {
    try {
        const result = await getCurrentBooking(req.auth);
        return successResponse(res, result, "Current booking fetched successfully.");
    } catch (error) {
        return next(error);
    }
}

export async function getBookingDetailHandler(req, res, next) {
    try {
        const result = await getBookingDetail(req.auth, req.params.bookingId);
        return successResponse(res, result, "Booking detail fetched successfully.");
    } catch (error) {
        return next(error);
    }
}

export async function getAvailableBookingHistoryHandler(req, res, next) {
    try {
        const result = await getBookingHistory(req.auth, req.query);
        return successResponse(res, result, "Booking history fetched successfully.");
    } catch (error) {
        return next(error);
    }
}

export async function cancelBookingHandler(req, res, next) {
    try {
        const result = await cancelBooking(req.auth, req.params.bookingId, req.body);
        return successResponse(res, result, "Booking cancelled successfully.");
    } catch (error) {
        return next(error);
    }
}

export async function getBookingCancelPolicyHandler(req, res, next) {
    try {
        const result = await getBookingCancelPolicy(req.auth, req.params.bookingId);
        return successResponse(res, result, "Booking cancel policy fetched successfully.");
    } catch (error) {
        return next(error);
    }
}

export async function changeBookingPaymentMethodHandler(req, res, next) {
    try {
        const result = await changePaymentMethod(req.auth, req.params.bookingId, req.body);
        return successResponse(res, result, "Payment method updated successfully.");
    } catch (error) {
        return next(error);
    }
}

export async function getBookingTrackingHandler(req, res, next) {
    try {
        const result = await getBookingStatusSnapshot(req.auth, req.params.bookingId);
        return successResponse(res, result, "Booking tracking fetched successfully.");
    } catch (error) {
        return next(error);
    }
}

export async function getStatusStreamHandler(req, res, next) {
    let intervalId = null;

    try {
        res.setHeader("Content-Type", "text/event-stream");
        res.setHeader("Cache-Control", "no-cache");
        res.setHeader("Connection", "keep-alive");
        res.flushHeaders?.();

        const bookingId = Number(req.params.bookingId);

        const pushSnapshot = async () => {
            const snapshot = await getBookingStatusSnapshot(req.auth, bookingId);
            res.write(`event: booking-status\n`);
            res.write(`data: ${JSON.stringify(snapshot)}\n\n`);

            if ([2, 3, 4, 5].includes(Number(snapshot?.booking?.status))) {
                clearInterval(intervalId);
                res.end();
            }
        };

        await pushSnapshot();

        intervalId = setInterval(async () => {
            try {
                await pushSnapshot();
            } catch {
                clearInterval(intervalId);
                res.end();
            }
        }, 3000);

        req.on("close", () => {
            if (intervalId) clearInterval(intervalId);
        });
    } catch (error) {
        if (intervalId) clearInterval(intervalId);
        return next(error);
    }
}
