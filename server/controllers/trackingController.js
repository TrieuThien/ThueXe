import { successResponse } from "../utils/apiResponse.js";
import {
    appendDriverRoutePointService,
    getBookingDriverLocationService,
    getDriverLocationService,
    getDriverRouteService,
    updateMyDriverLocation,
} from "../services/trackingService.js";

export async function updateMyDriverLocationHandler(req, res, next) {
    try {
        const result = await updateMyDriverLocation({ auth: req.auth, payload: req.body });
        return successResponse(res, result, "Driver location updated successfully");
    } catch (error) {
        return next(error);
    }
}

export async function getDriverLocationHandler(req, res, next) {
    try {
        const result = await getDriverLocationService({
            driverId: req.params.driverId,
            auth: req.auth,
        });
        return successResponse(res, result, "Driver location fetched successfully");
    } catch (error) {
        return next(error);
    }
}

export async function getBookingDriverLocationHandler(req, res, next) {
    try {
        const result = await getBookingDriverLocationService({
            bookingId: req.params.bookingId,
            auth: req.auth,
        });
        return successResponse(res, result, "Booking driver location fetched successfully");
    } catch (error) {
        return next(error);
    }
}

export async function appendDriverRoutePointHandler(req, res, next) {
    try {
        const result = await appendDriverRoutePointService({
            bookingId: req.params.bookingId,
            auth: req.auth,
            payload: req.body,
        });
        return successResponse(res, result, "Driver route point appended successfully", 201);
    } catch (error) {
        return next(error);
    }
}

export async function getDriverRouteHandler(req, res, next) {
    try {
        const result = await getDriverRouteService({
            bookingId: req.params.bookingId,
            auth: req.auth,
        });
        return successResponse(res, result, "Driver route fetched successfully");
    } catch (error) {
        return next(error);
    }
}

