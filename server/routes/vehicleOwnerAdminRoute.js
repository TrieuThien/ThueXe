import { Router } from "express";
import {
    createVehicleOwnerHandler,
    deleteVehicleOwnerAccountHandler,
    getVehicleOwnerDetailHandler,
    getVehicleOwnerListHandler,
    getVehicleOwnerMetaHandler,
    getVehicleOwnerSummaryHandler,
    updateVehicleOwnerAccountStatusHandler,
    updateVehicleOwnerPersonalInfoHandler,
} from "../controllers/vehicleOwnerAdminController.js";
import requireAuth from "../middlewares/authMiddleware.js";
import requireRole from "../middlewares/roleMiddleware.js";
import validateRequest from "../middlewares/validateRequest.js";
import {
    createVehicleOwnerValidator,
    deleteVehicleOwnerAccountValidator,
    getVehicleOwnerDetailValidator,
    getVehicleOwnerListValidator,
    getVehicleOwnerMetaValidator,
    getVehicleOwnerSummaryValidator,
    updateVehicleOwnerAccountStatusValidator,
    updateVehicleOwnerPersonalInfoValidator,
} from "../validators/vehicleOwnerAdminValidators.js";

const router = Router();

router.get("/api/vehicle-owners/meta", requireAuth, requireRole("admin"), getVehicleOwnerMetaValidator, validateRequest, getVehicleOwnerMetaHandler);
router.get("/api/vehicle-owners", requireAuth, requireRole("admin"), getVehicleOwnerListValidator, validateRequest, getVehicleOwnerListHandler);
router.get("/api/vehicle-owners/summary", requireAuth, requireRole("admin"), getVehicleOwnerSummaryValidator, validateRequest, getVehicleOwnerSummaryHandler);
router.get("/api/vehicle-owners/:ownerId", requireAuth, requireRole("admin"), getVehicleOwnerDetailValidator, validateRequest, getVehicleOwnerDetailHandler);
router.post("/api/vehicle-owners", requireAuth, requireRole("admin"), createVehicleOwnerValidator, validateRequest, createVehicleOwnerHandler);
router.put("/api/vehicle-owners/:ownerId/personal-info", requireAuth, requireRole("admin"), updateVehicleOwnerPersonalInfoValidator, validateRequest, updateVehicleOwnerPersonalInfoHandler);
router.patch("/api/vehicle-owners/:ownerId/account-status", requireAuth, requireRole("admin"), updateVehicleOwnerAccountStatusValidator, validateRequest, updateVehicleOwnerAccountStatusHandler);
router.patch("/api/vehicle-owners/:ownerId/delete-account", requireAuth, requireRole("admin"), deleteVehicleOwnerAccountValidator, validateRequest, deleteVehicleOwnerAccountHandler);

export default router;

