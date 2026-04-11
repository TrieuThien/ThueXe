import { Router } from "express";
import {
    forgotPasswordHandler,
    loginHandler,
    logoutHandler,
    meHandler,
    patchMeHandler,
    patchPushTokenHandler,
    refreshTokenHandler,
    registerHandler,
    resetPasswordHandler,
    verifyOtpHandler,
} from "../../controllers/customer/authController.mjs";
import requireAuth from "../../middlewares/authMiddleware.js";
import {
    authForgotPasswordLimiter,
    authLoginLimiter,
    authRegisterLimiter,
    authResetPasswordLimiter,
} from "../../middlewares/rateLimiters.js";
import {
    forgotPasswordValidator,
    loginValidator,
    logoutValidator,
    patchMeValidator,
    patchPushTokenValidator,
    refreshTokenValidator,
    registerValidator,
    resetPasswordValidator,
    verifyOtpValidator,
} from "../../validators/customer/authValidators.js";

const router = Router();

router.post("/register", authRegisterLimiter, registerValidator, registerHandler);
router.post("/verify-otp", verifyOtpValidator, verifyOtpHandler);
router.post("/login", authLoginLimiter, loginValidator, loginHandler);
router.post(
    "/forgot-password",
    authForgotPasswordLimiter,
    forgotPasswordValidator,
    forgotPasswordHandler
);
router.post(
    "/reset-password",
    authResetPasswordLimiter,
    resetPasswordValidator,
    resetPasswordHandler
);
router.post("/refresh-token", refreshTokenValidator, refreshTokenHandler);
router.post("/logout", logoutValidator, logoutHandler);
router.get("/me", requireAuth, meHandler);
router.patch("/me", requireAuth, patchMeValidator, patchMeHandler);
router.patch(
    "/me/push-token",
    requireAuth,
    patchPushTokenValidator,
    patchPushTokenHandler
);

export default router;
