import { Router } from "express";
import {
    createDriverHandler,
    getDriverDetailHandler,
    getDriverListHandler,
    getDriverLocationHandler,
    getDriverMetaHandler,
    getDriverSummaryHandler,
    softDeleteDriverAccountHandler,
    updateDriverAccountStateHandler,
    updateDriverPersonalInformationHandler,
    updateDriverWithdrawalHandler,
} from "../controllers/driverController.mjs";
import requireAuth from "../middlewares/authMiddleware.js";
import requireRole from "../middlewares/roleMiddleware.js";
import { uploadSingleMemoryImage } from "../middlewares/uploadMemoryImage.js";
import validateRequest from "../middlewares/validateRequest.js";
import {
    createDriverValidator,
    deleteDriverAccountValidator,
    getDriverDetailValidator,
    getDriverListValidator,
    getDriverLocationValidator,
    getDriverMetaValidator,
    getDriverSummaryValidator,
    updateDriverAccountStateValidator,
    updateDriverPersonalInfoValidator,
    updateDriverWithdrawalValidator,
} from "../validators/driverValidators.js";

const router = Router();

router.get("/api/drivers/meta", requireAuth, requireRole("admin"), getDriverMetaValidator, validateRequest, getDriverMetaHandler);
router.get("/api/drivers/summary", requireAuth, requireRole("admin"), getDriverSummaryValidator, validateRequest, getDriverSummaryHandler);
router.get("/api/drivers", requireAuth, requireRole("admin", "dispatcher"), getDriverListValidator, validateRequest, getDriverListHandler);
router.get("/api/drivers/:driverId/location", requireAuth, requireRole("admin", "dispatcher"), getDriverLocationValidator, validateRequest, getDriverLocationHandler);
router.get("/api/drivers/:driverId", requireAuth, requireRole("admin"), getDriverDetailValidator, validateRequest, getDriverDetailHandler);
router.post("/api/drivers", requireAuth, requireRole("admin"), uploadSingleMemoryImage("photo_file"), createDriverValidator, validateRequest, createDriverHandler);
router.put("/api/drivers/:driverId/personal-info", requireAuth, requireRole("admin"), uploadSingleMemoryImage("photo_file"), updateDriverPersonalInfoValidator, validateRequest, updateDriverPersonalInformationHandler);
router.patch("/api/drivers/:driverId/account-status", requireAuth, requireRole("admin"), updateDriverAccountStateValidator, validateRequest, updateDriverAccountStateHandler);
router.patch("/api/drivers/:driverId/delete-account", requireAuth, requireRole("admin"), deleteDriverAccountValidator, validateRequest, softDeleteDriverAccountHandler);
router.patch("/api/drivers/:driverId/withdrawals/:withdrawalId", requireAuth, requireRole("admin"), updateDriverWithdrawalValidator, validateRequest, updateDriverWithdrawalHandler);

export default router;
