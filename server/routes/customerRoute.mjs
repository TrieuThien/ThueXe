import { Router } from "express";
import {
    createCustomerHandler,
    getCustomerDetailHandler,
    getCustomerListHandler,
    getCustomerSummaryHandler,
    updateCustomerActivationStateHandler,
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
    updateCustomerActivationStateValidator,
    updateCustomerPersonalInfoValidator,
} from "../validators/customerValidators.js";
import customerAuthRoute from "./customer/authRoute.mjs";
import customerChatRoute from "./customer/chatRoute.js";
import customerCouponRoute from "./customer/couponRoute.js";
import customerHomeRoute from "./customer/homeRoute.js";
import customerRentalChatRoute from "./customer/rentalChatRoute.js";
import customerRealtimeRoute from "./customer/realtimeRoute.js";
import customerRideRoute from "./customer/rideRoute.js";
import customerRentalRoute from "./customer/rentalRoute.js";
import customerWalletRoute from "./customer/walletRoute.js";

const router = Router();

router.use("/api/customer/auth", customerAuthRoute);
router.use("/api/customer", customerHomeRoute);
router.use("/api/customer/chats", customerChatRoute);
router.use("/api/customer/ride", customerRideRoute);
router.use("/api/customer/rentals", customerRentalRoute);
router.use("/api/customer/rental-chats", customerRentalChatRoute);
router.use("/api/customer/coupons", customerCouponRoute);
router.use("/api/customer", customerWalletRoute);
router.use("/api/customer/realtime", customerRealtimeRoute);

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

router.patch(
    "/api/customers/:userId/activation-status",
    requireAuth,
    requireRole("admin"),
    updateCustomerActivationStateValidator,
    validateRequest,
    updateCustomerActivationStateHandler
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
