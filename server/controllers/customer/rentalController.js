import { successResponse } from "../../utils/apiResponse.js";
import {
    cancelRentalBooking,
    createRentalBookingForCustomer,
    estimateRentalFare,
    getAvailableRentalDrivers,
    getAvailableRentalVehicles,
    getCurrentRentalBooking,
    getRentalBookingDetail,
    getRentalBookingHistory,
    getRentalPackages,
} from "../../services/customer/rentalService.js";

export async function getRentalPackagesHandler(req, res, next) {
    try {
        const result = await getRentalPackages(req.auth, req.query);
        return successResponse(res, result, "Rental packages fetched successfully.");
    } catch (error) {
        return next(error);
    }
}

export async function estimateRentalFareHandler(req, res, next) {
    try {
        const result = await estimateRentalFare(req.auth, req.body);
        return successResponse(res, result, "Rental fare estimated successfully.");
    } catch (error) {
        return next(error);
    }
}

export async function createRentalBookingHandler(req, res, next) {
    try {
        const result = await createRentalBookingForCustomer(req.auth, req.body);
        return successResponse(res, result, "Rental booking created successfully.", 201);
    } catch (error) {
        return next(error);
    }
}

export async function getCurrentRentalBookingHandler(req, res, next) {
    try {
        const result = await getCurrentRentalBooking(req.auth);
        return successResponse(res, result, "Current rental booking fetched successfully.");
    } catch (error) {
        return next(error);
    }
}

export async function getRentalBookingDetailHandler(req, res, next) {
    try {
        const result = await getRentalBookingDetail(req.auth, req.params.rentalId);
        return successResponse(res, result, "Rental booking detail fetched successfully.");
    } catch (error) {
        return next(error);
    }
}

export async function getRentalBookingHistoryHandler(req, res, next) {
    try {
        const result = await getRentalBookingHistory(req.auth, req.query);
        return successResponse(res, result, "Rental booking history fetched successfully.");
    } catch (error) {
        return next(error);
    }
}

export async function cancelRentalBookingHandler(req, res, next) {
    try {
        const result = await cancelRentalBooking(req.auth, req.params.rentalId, req.body);
        return successResponse(res, result, "Rental booking cancelled successfully.");
    } catch (error) {
        return next(error);
    }
}

export async function getAvailableRentalVehiclesHandler(req, res, next) {
    try {
        const result = await getAvailableRentalVehicles(req.auth, req.query);
        return successResponse(res, result, "Available vehicles fetched successfully.");
    } catch (error) {
        return next(error);
    }
}

export async function getAvailableRentalDriversHandler(req, res, next) {
    try {
        const result = await getAvailableRentalDrivers(req.auth, req.query);
        return successResponse(res, result, "Available drivers fetched successfully.");
    } catch (error) {
        return next(error);
    }
}
