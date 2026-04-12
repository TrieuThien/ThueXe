import {
    changeDriverPassword,
    forgotDriverPassword,
    getDriverProfile,
    loginDriver,
    logoutDriver,
    patchDriverAddress,
    patchDriverPushToken,
    refreshDriverToken,
    registerDriver,
    resendDriverOtp,
    resetDriverPassword,
    verifyDriverOtp,
} from "../../services/driver/authService.js";
import { successResponse } from "../../utils/apiResponse.js";
import {
    REFRESH_COOKIE_NAME,
    buildRefreshCookieOptions,
    getRefreshTokenFromRequest,
} from "../../utils/refreshTokenCookie.js";

// ─── Cookie helpers (driver-specific path) ────────────────────────────────────

const DRIVER_REFRESH_COOKIE_PATH = "/api/driver/auth";

function shouldIncludeRefreshTokenInBody(req) {
    const platform = String(req?.headers?.["x-client-platform"] || "").trim().toLowerCase();
    return platform === "mobile" || platform === "app";
}

function buildDriverAuthResponse(req, result) {
    if (shouldIncludeRefreshTokenInBody(req)) {
        return result;
    }
    const data = { ...result };
    delete data.refreshToken;
    return data;
}

function setDriverRefreshCookie(res, refreshToken) {
    const options = buildRefreshCookieOptions();
    res.cookie(REFRESH_COOKIE_NAME, refreshToken, {
        ...options,
        path: DRIVER_REFRESH_COOKIE_PATH,
    });
}

function clearDriverRefreshCookie(res) {
    const options = buildRefreshCookieOptions();
    res.clearCookie(REFRESH_COOKIE_NAME, {
        httpOnly: options.httpOnly,
        secure: options.secure,
        sameSite: options.sameSite,
        path: DRIVER_REFRESH_COOKIE_PATH,
    });
}

// ─── Handlers ─────────────────────────────────────────────────────────────────

export async function loginHandler(req, res, next) {
    try {
        const result = await loginDriver(req.body);
        setDriverRefreshCookie(res, result.refreshToken);
        return successResponse(res, buildDriverAuthResponse(req, result), "Login successful");
    } catch (error) {
        return next(error);
    }
}

export async function refreshTokenHandler(req, res, next) {
    try {
        const refreshTokenValue = getRefreshTokenFromRequest(req);
        const result = await refreshDriverToken(refreshTokenValue);
        setDriverRefreshCookie(res, result.refreshToken);
        return successResponse(res, buildDriverAuthResponse(req, result), "Token refreshed");
    } catch (error) {
        return next(error);
    }
}

export async function logoutHandler(req, res, next) {
    try {
        const refreshTokenValue = getRefreshTokenFromRequest(req);
        const result = await logoutDriver(refreshTokenValue);
        clearDriverRefreshCookie(res);
        return successResponse(res, result, result.message);
    } catch (error) {
        return next(error);
    }
}

export async function meHandler(req, res, next) {
    try {
        const result = await getDriverProfile(req.auth);
        return successResponse(res, result, "Driver profile fetched");
    } catch (error) {
        return next(error);
    }
}

export async function patchPushTokenHandler(req, res, next) {
    try {
        const result = await patchDriverPushToken(req.auth, req.body);
        return successResponse(res, result, "Push token updated successfully");
    } catch (error) {
        return next(error);
    }
}

export async function patchAddressHandler(req, res, next) {
    try {
        const result = await patchDriverAddress(req.auth, req.body);
        return successResponse(res, result, "Address updated successfully");
    } catch (error) {
        return next(error);
    }
}

export async function changePasswordHandler(req, res, next) {
    try {
        const result = await changeDriverPassword(req.auth, req.body);
        return successResponse(res, result, result.message);
    } catch (error) {
        return next(error);
    }
}

export async function forgotPasswordHandler(req, res, next) {
    try {
        const result = await forgotDriverPassword(req.body);
        return successResponse(res, result, result.message);
    } catch (error) {
        return next(error);
    }
}

export async function resetPasswordHandler(req, res, next) {
    try {
        const result = await resetDriverPassword(req.body);
        return successResponse(res, result, result.message);
    } catch (error) {
        return next(error);
    }
}

export async function registerHandler(req, res, next) {
    try {
        const result = await registerDriver(req.body);
        setDriverRefreshCookie(res, result.refreshToken);
        return successResponse(res, buildDriverAuthResponse(req, result), "Registration successful", 201);
    } catch (error) {
        return next(error);
    }
}

export async function verifyOtpHandler(req, res, next) {
    try {
        const result = await verifyDriverOtp(req.body);
        setDriverRefreshCookie(res, result.refreshToken);
        return successResponse(res, buildDriverAuthResponse(req, result), "OTP verified successfully");
    } catch (error) {
        return next(error);
    }
}

export async function resendOtpHandler(req, res, next) {
    try {
        const result = await resendDriverOtp(req.body);
        return successResponse(res, result, result.message);
    } catch (error) {
        return next(error);
    }
}
