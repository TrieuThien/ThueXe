import {
    applyCouponForUser,
    createCouponByAdmin,
    getAvailableCouponsForUser,
    getCouponDetailByAdmin,
    getCouponListByAdmin,
    getCouponMetaByAdmin,
    toggleCouponStatusByAdmin,
    updateCouponByAdmin,
    validateCouponForUser,
} from "../services/couponService.js";
import { successResponse } from "../utils/apiResponse.js";

export async function getCouponMetaHandler(req, res, next) {
    try {
        const result = await getCouponMetaByAdmin(req.auth);
        return successResponse(res, result, "Get coupon meta successfully.");
    } catch (error) {
        return next(error);
    }
}

export async function getAdminCouponListHandler(req, res, next) {
    try {
        const result = await getCouponListByAdmin(req.query, req.auth);
        return successResponse(res, result, "Get coupon list successfully.");
    } catch (error) {
        return next(error);
    }
}

export async function getAdminCouponDetailHandler(req, res, next) {
    try {
        const result = await getCouponDetailByAdmin(req.params.id, req.auth);
        return successResponse(res, result, "Get coupon detail successfully.");
    } catch (error) {
        return next(error);
    }
}

export async function createAdminCouponHandler(req, res, next) {
    try {
        const result = await createCouponByAdmin(req.body, req.auth);
        return successResponse(res, result, "Create coupon successfully.", 201);
    } catch (error) {
        return next(error);
    }
}

export async function updateAdminCouponHandler(req, res, next) {
    try {
        const result = await updateCouponByAdmin(req.params.id, req.body, req.auth);
        return successResponse(res, result, "Update coupon successfully.");
    } catch (error) {
        return next(error);
    }
}

export async function updateAdminCouponStatusHandler(req, res, next) {
    try {
        const result = await toggleCouponStatusByAdmin(req.params.id, req.body, req.auth);
        return successResponse(res, result, "Update coupon status successfully.");
    } catch (error) {
        return next(error);
    }
}

export async function getAvailableCouponsHandler(req, res, next) {
    try {
        const result = await getAvailableCouponsForUser(req.query, req.auth);
        return successResponse(res, result, "Get available coupons successfully.");
    } catch (error) {
        return next(error);
    }
}

export async function validateCouponHandler(req, res, next) {
    try {
        const result = await validateCouponForUser(req.body, req.auth);
        return successResponse(res, result, result.valid ? "Validate coupon successfully." : "Validate coupon failed.");
    } catch (error) {
        return next(error);
    }
}

export async function applyCouponHandler(req, res, next) {
    try {
        const result = await applyCouponForUser(req.body, req.auth);
        return successResponse(res, result, "Apply coupon successfully.");
    } catch (error) {
        return next(error);
    }
}

