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
        return successResponse(res, result, "Get reward config successfully.");
    } catch (error) {
        return next(error);
    }
}

export async function updateAdminRewardConfigHandler(req, res, next) {
    try {
        const result = await updateRewardConfigByAdmin(req.body, req.auth);
        return successResponse(res, result, "Update reward config successfully.");
    } catch (error) {
        return next(error);
    }
}

export async function getAdminRewardHistoryHandler(req, res, next) {
    try {
        const result = await getRewardHistoryByAdmin(req.query, req.auth);
        return successResponse(res, result, "Get reward history successfully.");
    } catch (error) {
        return next(error);
    }
}

export async function adjustRewardPointsHandler(req, res, next) {
    try {
        const result = await adjustRewardPointsByAdmin(req.body, req.auth);
        return successResponse(res, result, "Adjust reward points successfully.");
    } catch (error) {
        return next(error);
    }
}

export async function redeemRewardPointsHandler(req, res, next) {
    try {
        const result = await redeemRewardPointsByAdmin(req.body, req.auth);
        return successResponse(res, result, "Redeem reward points successfully.");
    } catch (error) {
        return next(error);
    }
}

export async function processBookingRewardPointsHandler(req, res, next) {
    try {
        const result = await processBookingRewardPointsByAdmin(req.params.bookingId, req.auth);
        return successResponse(res, result, result.processed ? "Successfully added reward points for booking." : result.message);
    } catch (error) {
        return next(error);
    }
}

export async function getMyRewardPointsHandler(req, res, next) {
    try {
        const result = await getMyRewardPoints(req.auth);
        return successResponse(res, result, "Get my reward points successfully.");
    } catch (error) {
        return next(error);
    }
}

export async function getMyRewardHistoryHandler(req, res, next) {
    try {
        const result = await getMyRewardHistory(req.query, req.auth);
        return successResponse(res, result, "Get my reward history successfully.");
    } catch (error) {
        return next(error);
    }
}
