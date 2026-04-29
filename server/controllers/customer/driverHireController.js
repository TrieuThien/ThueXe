import { successResponse } from "../../utils/apiResponse.js";
import {
    createDriverHireBookingService,
    getDriverHireStatus,
} from "../../services/customer/driverHireService.js";
import {
    handleDriverResponse,
    cancelSearchingBooking,
} from "../../services/matching/driverMatchingService.js";

export async function createDriverHireHandler(req, res, next) {
    try {
        const result = await createDriverHireBookingService(req.auth, req.body);
        return successResponse(res, result, result.message, 201);
    } catch (error) {
        return next(error);
    }
}

export async function getDriverHireStatusHandler(req, res, next) {
    try {
        const result = await getDriverHireStatus(req.auth, req.params.bookingId);
        return successResponse(res, result, "Trạng thái booking");
    } catch (error) {
        return next(error);
    }
}

export async function cancelDriverSearchHandler(req, res, next) {
    try {
        await cancelSearchingBooking(Number(req.params.bookingId), Number(req.auth.userId));
        return successResponse(res, {}, "Đã hủy tìm tài xế");
    } catch (error) {
        return next(error);
    }
}

// Tài xế gọi endpoint này để accept/reject yêu cầu
export async function driverRespondToRequestHandler(req, res, next) {
    try {
        const { action } = req.body; // 'accept' | 'reject'
        const requestId = Number(req.params.requestId);
        const driverId  = Number(req.auth.userId);

        if (!["accept", "reject"].includes(action)) {
            return res.status(422).json({ success: false, message: "action phải là accept hoặc reject" });
        }

        const result = await handleDriverResponse(requestId, driverId, action);
        return successResponse(res, result, action === "accept" ? "Đã nhận chuyến" : "Đã từ chối chuyến");
    } catch (error) {
        return next(error);
    }
}
