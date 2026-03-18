import { Router } from "express";
import requireAuth from "../middlewares/authMiddleware.js";
import requireRole from "../middlewares/roleMiddleware.js";
import validateRequest from "../middlewares/validateRequest.js";
import {
    createTariffHandler,
    createZoneHandler,
    getTariffDetailHandler,
    getTariffListHandler,
    getTariffMetaHandler,
    getZoneDetailHandler,
    getZoneListHandler,
    getZoneMetaHandler,
    updateTariffHandler,
    updateZoneHandler,
} from "../controllers/tariffZoneController.js";
import {
    createTariffValidator,
    createZoneValidator,
    getTariffDetailValidator,
    getTariffListValidator,
    getZoneDetailValidator,
    getZoneListValidator,
    updateTariffValidator,
    updateZoneValidator,
} from "../validators/tariffZoneValidators.js";

const router = Router();

router.get(
    "/api/admin/tariffs/meta",
    requireAuth,
    requireRole("admin"),
    getTariffMetaHandler
);

router.get(
    "/api/admin/tariffs",
    requireAuth,
    requireRole("admin"),
    getTariffListValidator,
    validateRequest,
    getTariffListHandler
);

router.get(
    "/api/admin/tariffs/:id",
    requireAuth,
    requireRole("admin"),
    getTariffDetailValidator,
    validateRequest,
    getTariffDetailHandler
);

router.post(
    "/api/admin/tariffs",
    requireAuth,
    requireRole("admin"),
    createTariffValidator,
    validateRequest,
    createTariffHandler
);

router.put(
    "/api/admin/tariffs/:id",
    requireAuth,
    requireRole("admin"),
    updateTariffValidator,
    validateRequest,
    updateTariffHandler
);

router.get(
    "/api/admin/zones/meta",
    requireAuth,
    requireRole("admin"),
    getZoneMetaHandler
);

router.get(
    "/api/admin/zones",
    requireAuth,
    requireRole("admin"),
    getZoneListValidator,
    validateRequest,
    getZoneListHandler
);

router.get(
    "/api/admin/zones/:id",
    requireAuth,
    requireRole("admin"),
    getZoneDetailValidator,
    validateRequest,
    getZoneDetailHandler
);

router.post(
    "/api/admin/zones",
    requireAuth,
    requireRole("admin"),
    createZoneValidator,
    validateRequest,
    createZoneHandler
);

router.put(
    "/api/admin/zones/:id",
    requireAuth,
    requireRole("admin"),
    updateZoneValidator,
    validateRequest,
    updateZoneHandler
);

export default router;

