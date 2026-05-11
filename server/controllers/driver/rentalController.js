import {
    acceptRentalBooking,
    arrivedAtPickup,
    completeRentalBookingService,
    createAvailability,
    deleteAvailability,
    getAvailability,
    getRentalBookingDetail,
    getRentalBookings,
    getRentalSummary,
    patchAvailability,
    pauseRentalBooking,
    resumeRentalBooking,
    startRentalBooking,
} from "../../services/driver/rentalService.js";
import { successResponse } from "../../utils/apiResponse.js";

// ─── Schedule availability ────────────────────────────────────────────────────

export async function getAvailabilityHandler(req, res, next) {
    try {
        const result = await getAvailability(req.auth, req.query);
        return successResponse(res, result, "Availability schedule fetched");
    } catch (error) {
        return next(error);
    }
}

export async function createAvailabilityHandler(req, res, next) {
    try {
        const result = await createAvailability(req.auth, req.body);
        return successResponse(res, result, "Availability slot created", 201);
    } catch (error) {
        return next(error);
    }
}

export async function patchAvailabilityHandler(req, res, next) {
    try {
        const result = await patchAvailability(req.auth, req.params.scheduleId, req.body);
        return successResponse(res, result, "Availability slot updated");
    } catch (error) {
        return next(error);
    }
}

export async function deleteAvailabilityHandler(req, res, next) {
    try {
        const result = await deleteAvailability(req.auth, req.params.scheduleId);
        return successResponse(res, result, "Availability slot deleted");
    } catch (error) {
        return next(error);
    }
}

// ─── Rental bookings ──────────────────────────────────────────────────────────

export async function getRentalBookingsHandler(req, res, next) {
    try {
        const result = await getRentalBookings(req.auth, req.query);
        return successResponse(res, result, "Rental bookings fetched");
    } catch (error) {
        return next(error);
    }
}

export async function getRentalBookingDetailHandler(req, res, next) {
    try {
        const result = await getRentalBookingDetail(req.auth, req.params.rentalId);
        return successResponse(res, result, "Rental booking detail fetched");
    } catch (error) {
        return next(error);
    }
}

export async function acceptRentalBookingHandler(req, res, next) {
    try {
        const result = await acceptRentalBooking(req.auth, req.params.rentalId);
        return successResponse(res, result, "Rental booking accepted");
    } catch (error) {
        return next(error);
    }
}

export async function startRentalBookingHandler(req, res, next) {
    try {
        const result = await startRentalBooking(req.auth, req.params.rentalId);
        return successResponse(res, result, "Rental booking started");
    } catch (error) {
        return next(error);
    }
}

export async function completeRentalBookingHandler(req, res, next) {
    try {
        const result = await completeRentalBookingService(req.auth, req.params.rentalId, req.body);
        return successResponse(res, result, "Rental booking completed");
    } catch (error) {
        return next(error);
    }
}

export async function arrivedAtPickupHandler(req, res, next) {
    try {
        const result = await arrivedAtPickup(req.auth, req.params.rentalId);
        return successResponse(res, result, "Đã thông báo tài xế đến điểm đón");
    } catch (error) {
        return next(error);
    }
}

export async function pauseRentalBookingHandler(req, res, next) {
    try {
        const result = await pauseRentalBooking(req.auth, req.params.rentalId);
        return successResponse(res, result, "Dịch vụ đã tạm dừng");
    } catch (error) {
        return next(error);
    }
}

export async function resumeRentalBookingHandler(req, res, next) {
    try {
        const result = await resumeRentalBooking(req.auth, req.params.rentalId);
        return successResponse(res, result, "Dịch vụ đã tiếp tục");
    } catch (error) {
        return next(error);
    }
}

export async function getRentalSummaryHandler(req, res, next) {
    try {
        const result = await getRentalSummary(req.auth, req.params.rentalId);
        return successResponse(res, result, "Tổng kết dịch vụ");
    } catch (error) {
        return next(error);
    }
}
