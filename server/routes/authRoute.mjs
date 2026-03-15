import { Router } from "express";
import {
    createStaffAccountHandler,
    forgotPasswordHandler,
    loginByIdentifier,
    logoutHandler,
    meHandler,
    refreshTokenHandler,
    register,
    resetPasswordHandler,
} from "../controllers/authController.mjs";
import requireAuth from "../middlewares/authMiddleware.js";
import requireRole from "../middlewares/roleMiddleware.js";
import validateRequest from "../middlewares/validateRequest.js";
import {
    authCreateStaffLimiter,
    authForgotPasswordLimiter,
    authLoginLimiter,
    authRegisterLimiter,
    authResetPasswordLimiter,
} from "../middlewares/rateLimiters.js";
import {
    createStaffValidator,
    forgotPasswordValidator,
    loginValidator,
    logoutValidator,
    refreshTokenValidator,
    registerValidator,
    resetPasswordValidator,
} from "../validators/authValidators.js";

const router = Router();

router.post(
    "/api/auth/staff",
    requireAuth,
    requireRole("admin"),
    authCreateStaffLimiter,
    createStaffValidator,
    validateRequest,
    createStaffAccountHandler
);

router.post(
    "/api/auth/register",
    authRegisterLimiter,
    registerValidator,
    validateRequest,
    register
);

router.post(
    "/api/auth/login",
    authLoginLimiter,
    loginValidator,
    validateRequest,
    loginByIdentifier
);

router.post(
    "/api/auth/forgot-password",
    authForgotPasswordLimiter,
    forgotPasswordValidator,
    validateRequest,
    forgotPasswordHandler
);

router.post(
    "/api/auth/reset-password",
    authResetPasswordLimiter,
    resetPasswordValidator,
    validateRequest,
    resetPasswordHandler
);

router.post(
    "/api/auth/refresh-token",
    refreshTokenValidator,
    validateRequest,
    refreshTokenHandler
);

router.post(
    "/api/auth/logout",
    requireAuth,
    logoutValidator,
    validateRequest,
    logoutHandler
);

router.get("/api/auth/me", requireAuth, meHandler);

export default router;
