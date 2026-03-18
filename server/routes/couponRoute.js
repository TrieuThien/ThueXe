import { Router } from "express";
import {
    applyCouponHandler,
    createAdminCouponHandler,
    getAdminCouponDetailHandler,
    getAdminCouponListHandler,
    getAvailableCouponsHandler,
    getCouponMetaHandler,
    updateAdminCouponHandler,
    updateAdminCouponStatusHandler,
    validateCouponHandler,
} from "../controllers/couponController.js";
import requireAuth from "../middlewares/authMiddleware.js";
import requireAdminAccountType from "../middlewares/adminAccountTypeMiddleware.js";
import requireRole from "../middlewares/roleMiddleware.js";
import validateRequest from "../middlewares/validateRequest.js";
import {
    applyCouponValidator,
    createAdminCouponValidator,
    getAdminCouponDetailValidator,
    getAdminCouponListValidator,
    getAdminCouponMetaValidator,
    getAvailableCouponValidator,
    updateAdminCouponStatusValidator,
    updateAdminCouponValidator,
    validateCouponCodeValidator,
} from "../validators/couponValidators.js";

const router = Router();

router.get(
    "/api/admin/coupons/meta",
    requireAuth,
    requireRole("admin"),
    requireAdminAccountType,
    getAdminCouponMetaValidator,
    validateRequest,
    getCouponMetaHandler
);

router.get(
    "/api/admin/coupons",
    requireAuth,
    requireRole("admin"),
    requireAdminAccountType,
    getAdminCouponListValidator,
    validateRequest,
    getAdminCouponListHandler
);

router.get(
    "/api/admin/coupons/:id",
    requireAuth,
    requireRole("admin"),
    requireAdminAccountType,
    getAdminCouponDetailValidator,
    validateRequest,
    getAdminCouponDetailHandler
);

router.post(
    "/api/admin/coupons",
    requireAuth,
    requireRole("admin"),
    requireAdminAccountType,
    createAdminCouponValidator,
    validateRequest,
    createAdminCouponHandler
);

router.patch(
    "/api/admin/coupons/:id",
    requireAuth,
    requireRole("admin"),
    requireAdminAccountType,
    updateAdminCouponValidator,
    validateRequest,
    updateAdminCouponHandler
);

router.patch(
    "/api/admin/coupons/:id/status",
    requireAuth,
    requireRole("admin"),
    requireAdminAccountType,
    updateAdminCouponStatusValidator,
    validateRequest,
    updateAdminCouponStatusHandler
);

router.get(
    "/api/coupons/available",
    requireAuth,
    getAvailableCouponValidator,
    validateRequest,
    getAvailableCouponsHandler
);

router.post(
    "/api/coupons/validate",
    requireAuth,
    validateCouponCodeValidator,
    validateRequest,
    validateCouponHandler
);

router.post(
    "/api/coupons/apply",
    requireAuth,
    applyCouponValidator,
    validateRequest,
    applyCouponHandler
);

export default router;

