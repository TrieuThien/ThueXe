import { Router } from "express";
import {
    createStaffHandler,
    getStaffDetailHandler,
    getStaffListHandler,
    getMyStaffProfileDetailHandler,
    getStaffSummaryHandler,
    softDeleteStaffAccountHandler,
    updateStaffPersonalInformationHandler,
} from "../controllers/staffController.mjs";
import requireAuth from "../middlewares/authMiddleware.js";
import requireRole from "../middlewares/roleMiddleware.js";
import { uploadSingleMemoryImage } from "../middlewares/uploadMemoryImage.js";
import validateRequest from "../middlewares/validateRequest.js";
import {
    createStaffValidator,
    deleteStaffAccountValidator,
    getStaffDetailValidator,
    getStaffListValidator,
    getStaffSummaryValidator,
    updateStaffPersonalInfoValidator,
} from "../validators/staffValidators.js";

const router = Router();

router.get(
    "/api/staff/me/detail",
    requireAuth,
    requireRole("admin", "dispatcher"),
    getMyStaffProfileDetailHandler
);

router.get(
    "/api/staff/summary",
    requireAuth,
    requireRole("admin"),
    getStaffSummaryValidator,
    validateRequest,
    getStaffSummaryHandler
);

router.get(
    "/api/staff",
    requireAuth,
    requireRole("admin"),
    getStaffListValidator,
    validateRequest,
    getStaffListHandler
);

router.get(
    "/api/staff/:userId",
    requireAuth,
    requireRole("admin"),
    getStaffDetailValidator,
    validateRequest,
    getStaffDetailHandler
);

router.post(
    "/api/staff",
    requireAuth,
    requireRole("admin"),
    uploadSingleMemoryImage("photo_file"),
    createStaffValidator,
    validateRequest,
    createStaffHandler
);

router.put(
    "/api/staff/:userId/personal-info",
    requireAuth,
    requireRole("admin"),
    uploadSingleMemoryImage("photo_file"),
    updateStaffPersonalInfoValidator,
    validateRequest,
    updateStaffPersonalInformationHandler
);

router.patch(
    "/api/staff/:userId/delete-account",
    requireAuth,
    requireRole("admin"),
    deleteStaffAccountValidator,
    validateRequest,
    softDeleteStaffAccountHandler
);

export default router;
