import { successResponse } from "../utils/apiResponse.js";
import {
    assignRentalService,
    createRentalBookingService,
    createRentalPackageService,
    getRentalBookingDetailService,
    getRentalPackageList,
    listRentalBookingsService,
    rentalMetaService,
    updateRentalPackageService,
    updateRentalStatusService,
} from "../services/rentalService.js";

export async function listRentalPackagesHandler(req, res, next) {
    try {
        const result = await getRentalPackageList({ query: req.query });
        return successResponse(res, result, "Rental packages fetched successfully");
    } catch (error) {
        return next(error);
    }
}

export async function createRentalPackageHandler(req, res, next) {
    try {
        const result = await createRentalPackageService({ payload: req.body });
        return successResponse(res, result, "Rental package created successfully", 201);
    } catch (error) {
        return next(error);
    }
}

export async function updateRentalPackageHandler(req, res, next) {
    try {
        const result = await updateRentalPackageService({
            packageId: req.params.packageId,
            payload: req.body,
        });
        return successResponse(res, result, "Rental package updated successfully");
    } catch (error) {
        return next(error);
    }
}

export async function rentalMetaHandler(req, res, next) {
    try {
        const result = await rentalMetaService({ query: req.query });
        return successResponse(res, result, "Rental meta fetched successfully");
    } catch (error) {
        return next(error);
    }
}

export async function createRentalBookingHandler(req, res, next) {
    try {
        const result = await createRentalBookingService({ payload: req.body, auth: req.auth });
        return successResponse(res, result, "Rental booking created successfully", 201);
    } catch (error) {
        return next(error);
    }
}

export async function listRentalBookingsHandler(req, res, next) {
    try {
        const result = await listRentalBookingsService({ query: req.query, auth: req.auth });
        return successResponse(res, result, "Rental bookings fetched successfully");
    } catch (error) {
        return next(error);
    }
}

export async function getRentalBookingDetailHandler(req, res, next) {
    try {
        const result = await getRentalBookingDetailService({
            rentalId: req.params.rentalId,
            auth: req.auth,
        });
        return successResponse(res, result, "Rental booking detail fetched successfully");
    } catch (error) {
        return next(error);
    }
}

export async function updateRentalStatusHandler(req, res, next) {
    try {
        const result = await updateRentalStatusService({
            rentalId: req.params.rentalId,
            payload: req.body,
            auth: req.auth,
        });
        return successResponse(res, result, "Rental booking status updated successfully");
    } catch (error) {
        return next(error);
    }
}

export async function assignRentalHandler(req, res, next) {
    try {
        const result = await assignRentalService({
            rentalId: req.params.rentalId,
            payload: req.body,
        });
        return successResponse(res, result, "Rental booking assignment updated successfully");
    } catch (error) {
        return next(error);
    }
}

