import {
    forgotPassword,
    getCurrentProfile,
    login,
    logout,
    refreshToken,
    registerPassenger,
    resetPassword,
} from "../services/authService.js";
import { successResponse } from "../utils/apiResponse.js";

export async function register(req, res, next) {
    try {
        const result = await registerPassenger(req.body);
        return successResponse(res, result, "Register successful", 201);
    } catch (error) {
        return next(error);
    }
}

export async function loginByIdentifier(req, res, next) {
    try {
        const result = await login(req.body);
        return successResponse(res, result, "Login successful");
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
        const result = await refreshToken(req.body);
        return successResponse(res, result, "Token refreshed");
    } catch (error) {
        return next(error);
    }
}

export async function logoutHandler(req, res, next) {
    try {
        const result = await logout(req.body);
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
