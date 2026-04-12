import { Router } from "express";
import {
    createAdminBannerHandler,
    getAdminBannerDetailHandler,
    getAdminBannerListHandler,
    getBannerMetaHandler,
    updateAdminBannerHandler,
    updateAdminBannerStatusHandler,
} from "../controllers/bannerController.js";
import requireAuth from "../middlewares/authMiddleware.js";
import requireAdminAccountType from "../middlewares/adminAccountTypeMiddleware.js";
import requireRole from "../middlewares/roleMiddleware.js";
import validateRequest from "../middlewares/validateRequest.js";
import {
    createAdminBannerValidator,
    getAdminBannerDetailValidator,
    getAdminBannerListValidator,
    getAdminBannerMetaValidator,
    updateAdminBannerStatusValidator,
    updateAdminBannerValidator,
} from "../validators/bannerValidators.js";

const router = Router();

router.get(
    "/api/admin/banners/meta",
    requireAuth,
    requireRole("admin"),
    requireAdminAccountType,
    getAdminBannerMetaValidator,
    validateRequest,
    getBannerMetaHandler
);

router.get(
    "/api/admin/banners",
    requireAuth,
    requireRole("admin"),
    requireAdminAccountType,
    getAdminBannerListValidator,
    validateRequest,
    getAdminBannerListHandler
);

router.get(
    "/api/admin/banners/:id",
    requireAuth,
    requireRole("admin"),
    requireAdminAccountType,
    getAdminBannerDetailValidator,
    validateRequest,
    getAdminBannerDetailHandler
);

router.post(
    "/api/admin/banners",
    requireAuth,
    requireRole("admin"),
    requireAdminAccountType,
    createAdminBannerValidator,
    validateRequest,
    createAdminBannerHandler
);

router.patch(
    "/api/admin/banners/:id",
    requireAuth,
    requireRole("admin"),
    requireAdminAccountType,
    updateAdminBannerValidator,
    validateRequest,
    updateAdminBannerHandler
);

router.patch(
    "/api/admin/banners/:id/status",
    requireAuth,
    requireRole("admin"),
    requireAdminAccountType,
    updateAdminBannerStatusValidator,
    validateRequest,
    updateAdminBannerStatusHandler
);

export default router;
