import {
    forgotPassword,
    getCurrentProfile,
    loginCustomer,
    logout,
    refreshToken,
    registerCustomer,
    resetPassword,
    updateCurrentProfile,
    updateCurrentPushToken,
    verifyOtpCode,
} from "../../services/customer/authService.js";
import { successResponse } from "../../utils/apiResponse.js";
import {
    REFRESH_COOKIE_NAME,
    buildRefreshCookieOptions,
    getRefreshTokenFromRequest,
} from "../../utils/refreshTokenCookie.js";

function setCustomerRefreshCookie(res, refreshToken) {
    const options = buildRefreshCookieOptions();

    res.cookie(REFRESH_COOKIE_NAME, refreshToken, {
        ...options,
        path: "/api/customer/auth",
    });
}

function clearCustomerRefreshCookie(res) {
    const options = buildRefreshCookieOptions();

    res.clearCookie(REFRESH_COOKIE_NAME, {
        httpOnly: options.httpOnly,
        secure: options.secure,
        sameSite: options.sameSite,
        path: "/api/customer/auth",
    });
}

export async function registerHandler(req, res, next) {
    try {
        const result = await registerCustomer(req.body);
        setCustomerRefreshCookie(res, result.refreshToken);

        const responseData = { ...result };
        delete responseData.refreshToken;

        return successResponse(res, responseData, "Register successful", 201);
    } catch (error) {
        return next(error);
    }
}

export async function verifyOtpHandler(req, res, next) {
    try {
        const result = await verifyOtpCode(req.body);
        return successResponse(res, result, "OTP verified successfully");
    } catch (error) {
        return next(error);
    }
}

export async function loginHandler(req, res, next) {
    try {
        const result = await loginCustomer(req.body);
        setCustomerRefreshCookie(res, result.refreshToken);

        const responseData = { ...result };
        delete responseData.refreshToken;

        return successResponse(res, responseData, "Login successful");
    } catch (error) {
        return next(error);
    }
}

export async function forgotPasswordHandler(req, res, next) {
    try {
        const result = await forgotPassword(req.body);
        return successResponse(res, result, result.message);
    } catch (error) {
        return next(error);
    }
}

export async function resetPasswordHandler(req, res, next) {
    try {
        const result = await resetPassword(req.body);
        return successResponse(res, result, result.message);
    } catch (error) {
        return next(error);
    }
}

export async function refreshTokenHandler(req, res, next) {
    try {
        const refreshTokenValue = getRefreshTokenFromRequest(req);
        const result = await refreshToken(refreshTokenValue);

        setCustomerRefreshCookie(res, result.refreshToken);

        const responseData = { ...result };
        delete responseData.refreshToken;

        return successResponse(res, responseData, "Token refreshed");
    } catch (error) {
        return next(error);
    }
}

export async function logoutHandler(req, res, next) {
    try {
        const refreshTokenValue = getRefreshTokenFromRequest(req);
        const result = await logout(refreshTokenValue);

        clearCustomerRefreshCookie(res);

        return successResponse(res, result, result.message);
    } catch (error) {
        return next(error);
    }
}

export async function meHandler(req, res, next) {
    try {
        const result = await getCurrentProfile(req.auth);
        return successResponse(res, result, "Current user fetched");
    } catch (error) {
        return next(error);
    }
}

export async function patchMeHandler(req, res, next) {
    try {
        const result = await updateCurrentProfile(req.auth, req.body);
        return successResponse(res, result, "Profile updated successfully");
    } catch (error) {
        return next(error);
    }
}

export async function patchPushTokenHandler(req, res, next) {
    try {
        const result = await updateCurrentPushToken(req.auth, req.body);
        return successResponse(res, result, "Push token updated successfully");
    } catch (error) {
        return next(error);
    }
}
