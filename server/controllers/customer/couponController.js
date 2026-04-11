import { successResponse } from "../../utils/apiResponse.js";
import { applyCoupon, getMyAvailableCoupons, validateCoupon } from "../../services/customer/couponService.js";

export async function validateCouponHandler(req, res, next) {
    try {
        const result = await validateCoupon(req.auth, req.body);
        return successResponse(res, result, "Coupon validated successfully.");
    } catch (error) {
        return next(error);
    }
}

export async function applyCouponHandler(req, res, next) {
    try {
        const result = await applyCoupon(req.auth, req.body);
        return successResponse(res, result, "Coupon applied successfully.");
    } catch (error) {
        return next(error);
    }
}

export async function getMyAvailableCouponsHandler(req, res, next) {
    try {
        const result = await getMyAvailableCoupons(req.auth);
        return successResponse(res, result, "Available coupons fetched successfully.");
    } catch (error) {
        return next(error);
    }
}
