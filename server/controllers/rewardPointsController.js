import {
    adjustRewardPointsByAdmin,
    getMyRewardHistory,
    getMyRewardPoints,
    getRewardConfigByAdmin,
    getRewardHistoryByAdmin,
    processBookingRewardPointsByAdmin,
    redeemRewardPointsByAdmin,
    updateRewardConfigByAdmin,
} from "../services/rewardPointsService.js";
import { successResponse } from "../utils/apiResponse.js";

export async function getAdminRewardConfigHandler(req, res, next) {
    try {
        const result = await getRewardConfigByAdmin(req.auth);
        return successResponse(res, result, "L?y c?u hình tích di?m thành công");
    } catch (error) {
        return next(error);
    }
}

export async function updateAdminRewardConfigHandler(req, res, next) {
    try {
        const result = await updateRewardConfigByAdmin(req.body, req.auth);
        return successResponse(res, result, "C?p nh?t c?u hình tích di?m thành công");
    } catch (error) {
        return next(error);
    }
}

export async function getAdminRewardHistoryHandler(req, res, next) {
    try {
        const result = await getRewardHistoryByAdmin(req.query, req.auth);
        return successResponse(res, result, "L?y l?ch s? tích di?m thành công");
    } catch (error) {
        return next(error);
    }
}

export async function adjustRewardPointsHandler(req, res, next) {
    try {
        const result = await adjustRewardPointsByAdmin(req.body, req.auth);
        return successResponse(res, result, "Ði?u ch?nh di?m thành công");
    } catch (error) {
        return next(error);
    }
}

export async function redeemRewardPointsHandler(req, res, next) {
    try {
        const result = await redeemRewardPointsByAdmin(req.body, req.auth);
        return successResponse(res, result, "Ð?i di?m thành công");
    } catch (error) {
        return next(error);
    }
}

export async function processBookingRewardPointsHandler(req, res, next) {
    try {
        const result = await processBookingRewardPointsByAdmin(req.params.bookingId, req.auth);
        return successResponse(res, result, result.processed ? "Ðã c?ng di?m cho booking" : result.message);
    } catch (error) {
        return next(error);
    }
}

export async function getMyRewardPointsHandler(req, res, next) {
    try {
        const result = await getMyRewardPoints(req.auth);
        return successResponse(res, result, "L?y thông tin tích di?m thành công");
    } catch (error) {
        return next(error);
    }
}

export async function getMyRewardHistoryHandler(req, res, next) {
    try {
        const result = await getMyRewardHistory(req.query, req.auth);
        return successResponse(res, result, "L?y l?ch s? di?m c?a b?n thành công");
    } catch (error) {
        return next(error);
    }
}
