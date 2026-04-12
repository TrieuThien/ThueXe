import { Router } from "express";
import {
    changePasswordHandler,
    forgotPasswordHandler,
    loginHandler,
    logoutHandler,
    meHandler,
    patchAddressHandler,
    patchPushTokenHandler,
    refreshTokenHandler,
    registerHandler,
    resendOtpHandler,
    resetPasswordHandler,
    verifyOtpHandler,
} from "../../controllers/driver/authController.js";
import requireAuth from "../../middlewares/authMiddleware.js";
import requireRole from "../../middlewares/roleMiddleware.js";
import {
    authLoginLimiter,
    authForgotPasswordLimiter,
    authRegisterLimiter,
    authResetPasswordLimiter,
} from "../../middlewares/rateLimiters.js";
import validateRequest from "../../middlewares/validateRequest.js";
import {
    changePasswordValidator,
    forgotPasswordValidator,
    loginValidator,
    logoutValidator,
    patchAddressValidator,
    patchPushTokenValidator,
    refreshTokenValidator,
    registerValidator,
    resendOtpValidator,
    resetPasswordValidator,
    verifyOtpValidator,
} from "../../validators/driver/authValidators.js";

const router = Router();

// Public endpoints – registration & OTP
router.post(
    "/register",
    authRegisterLimiter,
    registerValidator,
    validateRequest,
    registerHandler
);
router.post("/verify-otp", verifyOtpValidator, validateRequest, verifyOtpHandler);
router.post(
    "/resend-otp",
    authForgotPasswordLimiter,   // reuse forgot-password limiter (same risk profile)
    resendOtpValidator,
    validateRequest,
    resendOtpHandler
);

// Public endpoints – login & token
router.post("/login", authLoginLimiter, loginValidator, validateRequest, loginHandler);
router.post("/refresh-token", refreshTokenValidator, validateRequest, refreshTokenHandler);
router.post("/logout", logoutValidator, validateRequest, logoutHandler);
router.post(
    "/forgot-password",
    authForgotPasswordLimiter,
    forgotPasswordValidator,
    validateRequest,
    forgotPasswordHandler
);
router.post(
    "/reset-password",
    authResetPasswordLimiter,
    resetPasswordValidator,
    validateRequest,
    resetPasswordHandler
);

// Protected endpoints – require authenticated driver
router.get("/me", requireAuth, requireRole("driver"), meHandler);
router.patch(
    "/me/push-token",
    requireAuth,
    requireRole("driver"),
    patchPushTokenValidator,
    validateRequest,
    patchPushTokenHandler
);
router.patch(
    "/me/address",
    requireAuth,
    requireRole("driver"),
    patchAddressValidator,
    validateRequest,
    patchAddressHandler
);
router.post(
    "/change-password",
    requireAuth,
    requireRole("driver"),
    changePasswordValidator,
    validateRequest,
    changePasswordHandler
);

export default router;
