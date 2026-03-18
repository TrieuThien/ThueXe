import { Router } from "express";
import {
    adjustRewardPointsHandler,
    getAdminRewardConfigHandler,
    getAdminRewardHistoryHandler,
    getMyRewardHistoryHandler,
    getMyRewardPointsHandler,
    processBookingRewardPointsHandler,
    redeemRewardPointsHandler,
    updateAdminRewardConfigHandler,
} from "../controllers/rewardPointsController.js";
import requireAdminAccountType from "../middlewares/adminAccountTypeMiddleware.js";
import requireAuth from "../middlewares/authMiddleware.js";
import requireRole from "../middlewares/roleMiddleware.js";
import validateRequest from "../middlewares/validateRequest.js";
import {
    adjustRewardPointsValidator,
    getAdminRewardConfigValidator,
    getAdminRewardHistoryValidator,
    getMyRewardHistoryValidator,
    getMyRewardPointsValidator,
    processBookingRewardPointsValidator,
    redeemRewardPointsValidator,
    updateAdminRewardConfigValidator,
} from "../validators/rewardPointsValidators.js";

const router = Router();

router.get(
    "/api/admin/reward-points/config",
    requireAuth,
    requireRole("admin"),
    requireAdminAccountType,
    getAdminRewardConfigValidator,
    validateRequest,
    getAdminRewardConfigHandler
);

router.patch(
    "/api/admin/reward-points/config",
    requireAuth,
    requireRole("admin"),
    requireAdminAccountType,
    updateAdminRewardConfigValidator,
    validateRequest,
    updateAdminRewardConfigHandler
);

router.get(
    "/api/admin/reward-points/history",
    requireAuth,
    requireRole("admin"),
    requireAdminAccountType,
    getAdminRewardHistoryValidator,
    validateRequest,
    getAdminRewardHistoryHandler
);

router.post(
    "/api/admin/reward-points/adjust",
    requireAuth,
    requireRole("admin"),
    requireAdminAccountType,
    adjustRewardPointsValidator,
    validateRequest,
    adjustRewardPointsHandler
);

router.post(
    "/api/admin/reward-points/redeem",
    requireAuth,
    requireRole("admin"),
    requireAdminAccountType,
    redeemRewardPointsValidator,
    validateRequest,
    redeemRewardPointsHandler
);

router.post(
    "/api/admin/reward-points/bookings/:bookingId/process",
    requireAuth,
    requireRole("admin"),
    requireAdminAccountType,
    processBookingRewardPointsValidator,
    validateRequest,
    processBookingRewardPointsHandler
);

router.get(
    "/api/reward-points/me",
    requireAuth,
    getMyRewardPointsValidator,
    validateRequest,
    getMyRewardPointsHandler
);

router.get(
    "/api/reward-points/me/history",
    requireAuth,
    getMyRewardHistoryValidator,
    validateRequest,
    getMyRewardHistoryHandler
);

export default router;
