import { Router } from "express";
import requireAuth from "../../middlewares/authMiddleware.js";
import validateRequest from "../../middlewares/validateRequest.js";
import {
    getAvailableCouponsHandler,
    getBannersHandler,
    getHomeHandler,
    getNotificationsHandler,
    getNotificationUnreadCountHandler,
    getRidesHandler,
    getRoutesHandler,
} from "../../controllers/customer/homeController.js";
import {
    getAvailableCouponsValidator,
    getNotificationsValidator,
    getRidesValidator,
} from "../../validators/customer/homeValidators.js";

const router = Router();

router.get("/home", requireAuth, getHomeHandler);
router.get("/banners", requireAuth, getBannersHandler);
router.get("/routes", requireAuth, getRoutesHandler);
router.get("/rides", requireAuth, getRidesValidator, validateRequest, getRidesHandler);
router.get(
    "/coupons/available",
    requireAuth,
    getAvailableCouponsValidator,
    validateRequest,
    getAvailableCouponsHandler
);
router.get(
    "/notifications",
    requireAuth,
    getNotificationsValidator,
    validateRequest,
    getNotificationsHandler
);
router.get(
    "/notifications/unread-count",
    requireAuth,
    getNotificationUnreadCountHandler
);

export default router;
