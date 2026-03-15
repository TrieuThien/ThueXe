import {
    createStaffByAdmin,
    forgotPassword,
    getCurrentProfile,
    login,
    logout,
    refreshToken,
    registerPassenger,
    resetPassword,
} from "../services/authService.js";
import { successResponse } from "../utils/apiResponse.js";
import {
    clearRefreshTokenCookie,
    getRefreshTokenFromRequest,
    setRefreshTokenCookie,
} from "../utils/refreshTokenCookie.js";

export async function register(req, res, next) {
    try {
        const result = await registerPassenger(req.body);
        setRefreshTokenCookie(res, result.refreshToken);
        const responseData = { ...result };
        delete responseData.refreshToken;

        return successResponse(
            res,
            responseData,
            "Register successful",
            201
        );
    } catch (error) {
        return next(error);
    }
}

export async function loginByIdentifier(req, res, next) {
    try {
        const result = await login(req.body);
        setRefreshTokenCookie(res, result.refreshToken);
        const responseData = { ...result };
        delete responseData.refreshToken;

        return successResponse(res, responseData, "Login successful");
    } catch (error) {
        return next(error);
    }
}

export async function createStaffAccountHandler(req, res, next) {
    try {
        const result = await createStaffByAdmin(req.body);

        return successResponse(
            res,
            result,
            "Staff account created successfully",
            201
        );
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

        setRefreshTokenCookie(res, result.refreshToken);
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
        clearRefreshTokenCookie(res);
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
