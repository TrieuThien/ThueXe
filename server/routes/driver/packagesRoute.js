/**
 * routes/driver/packagesRoute.js
 *
 * Tài xế quản lý gói thuê tài xế mà họ tham gia bán.
 * Mounted at /api/driver/packages by driverAppRoute.js
 */

import { Router } from "express";
import requireAuth from "../../middlewares/authMiddleware.js";
import requireRole from "../../middlewares/roleMiddleware.js";
import validateRequest from "../../middlewares/validateRequest.js";
import {
    getDriverPackagesHandler,
    selectDriverPackageHandler,
    removeDriverPackageHandler,
    getDriverActivePackagesHandler,
} from "../../controllers/driver/packagesController.js";
import {
    selectPackageValidator,
    enrollmentIdParamValidator,
} from "../../validators/driver/packagesValidators.js";

const router = Router();

router.use(requireAuth, requireRole("driver"));

// GET /api/driver/packages — Tất cả gói hệ thống + trạng thái đăng ký
router.get("/", getDriverPackagesHandler);

// GET /api/driver/packages/active — Chỉ gói đang bán
router.get("/active", getDriverActivePackagesHandler);

// POST /api/driver/packages/select — Đăng ký bán gói
router.post("/select", selectPackageValidator, validateRequest, selectDriverPackageHandler);

// DELETE /api/driver/packages/:enrollmentId — Ngừng bán gói
router.delete("/:enrollmentId", enrollmentIdParamValidator, validateRequest, removeDriverPackageHandler);

export default router;
