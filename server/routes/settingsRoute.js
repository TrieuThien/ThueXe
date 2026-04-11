import { Router } from "express";
import requireAuth from "../middlewares/authMiddleware.js";
import requireRole from "../middlewares/roleMiddleware.js";
import requireAdminAccountType from "../middlewares/adminAccountTypeMiddleware.js";
import validateRequest from "../middlewares/validateRequest.js";
import {
    getSystemSettingsHandler,
    updateSystemSettingsHandler,
    getCurrenciesHandler,
    createCurrencyHandler,
    updateCurrencyHandler,
    setDefaultCurrencyHandler,
} from "../controllers/settingsController.js";
import {
    getSystemSettingsValidator,
    updateSystemSettingsValidator,
    currencyBodyValidator,
} from "../validators/settingsValidators.js";

const router = Router();

router.get(
    "/api/admin/settings/system",
    requireAuth,
    requireRole("admin"),
    requireAdminAccountType,
    getSystemSettingsValidator,
    validateRequest,
    getSystemSettingsHandler
);

router.patch(
    "/api/admin/settings/system",
    requireAuth,
    requireRole("admin"),
    requireAdminAccountType,
    updateSystemSettingsValidator,
    validateRequest,
    updateSystemSettingsHandler
);

router.get(
    "/api/admin/settings/currencies",
    requireAuth,
    requireRole("admin"),
    requireAdminAccountType,
    getCurrenciesHandler
);

router.post(
    "/api/admin/settings/currencies",
    requireAuth,
    requireRole("admin"),
    requireAdminAccountType,
    currencyBodyValidator,
    validateRequest,
    createCurrencyHandler
);

router.put(
    "/api/admin/settings/currencies/:id",
    requireAuth,
    requireRole("admin"),
    requireAdminAccountType,
    currencyBodyValidator,
    validateRequest,
    updateCurrencyHandler
);

router.patch(
    "/api/admin/settings/currencies/:id/default",
    requireAuth,
    requireRole("admin"),
    requireAdminAccountType,
    setDefaultCurrencyHandler
);

export default router;
