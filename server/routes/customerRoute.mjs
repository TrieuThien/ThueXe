import { Router } from "express";
import {
    createCustomerHandler,
    getCustomerDetailHandler,
    getCustomerListHandler,
    getCustomerSummaryHandler,
    updateCustomerAccountStateHandler,
    updateCustomerPersonalInformationHandler,
} from "../controllers/customerController.mjs";
import requireAuth from "../middlewares/authMiddleware.js";
import requireRole from "../middlewares/roleMiddleware.js";
import { uploadSingleMemoryImage } from "../middlewares/uploadMemoryImage.js";
import validateRequest from "../middlewares/validateRequest.js";
import {
    createCustomerValidator,
    getCustomerDetailValidator,
    getCustomerListValidator,
    getCustomerSummaryValidator,
    updateCustomerAccountStateValidator,
    updateCustomerPersonalInfoValidator,
} from "../validators/customerValidators.js";

const router = Router();

router.get(
    "/api/customers/summary",
    requireAuth,
    requireRole("admin"),
    getCustomerSummaryValidator,
    validateRequest,
    getCustomerSummaryHandler
);

router.get(
    "/api/customers",
    requireAuth,
    requireRole("admin"),
    getCustomerListValidator,
    validateRequest,
    getCustomerListHandler
);

router.get(
    "/api/customers/:userId",
    requireAuth,
    requireRole("admin"),
    getCustomerDetailValidator,
    validateRequest,
    getCustomerDetailHandler
);

router.post(
    "/api/customers",
    requireAuth,
    requireRole("admin"),
    uploadSingleMemoryImage("photo_file"),
    createCustomerValidator,
    validateRequest,
    createCustomerHandler
);

router.patch(
    "/api/customers/:userId/account-status",
    requireAuth,
    requireRole("admin"),
    updateCustomerAccountStateValidator,
    validateRequest,
    updateCustomerAccountStateHandler
);

router.put(
    "/api/customers/:userId/personal-info",
    requireAuth,
    requireRole("admin"),
    uploadSingleMemoryImage("photo_file"),
    updateCustomerPersonalInfoValidator,
    validateRequest,
    updateCustomerPersonalInformationHandler
);

export default router;
