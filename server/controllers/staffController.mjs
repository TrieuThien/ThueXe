import {
    createStaffByAdmin,
    getCurrentStaffProfileDetail,
    getStaffDetailByAdmin,
    getStaffListByAdmin,
    getStaffSummaryByAdmin,
    softDeleteStaffAccountByAdmin,
    updateStaffPersonalInformationByAdmin,
} from "../services/staffService.js";
import { successResponse } from "../utils/apiResponse.js";

export async function createStaffHandler(req, res, next) {
    try {
        const result = await createStaffByAdmin(req.body, req.file, req.auth);
        return successResponse(res, result, "Staff created successfully", 201);
    } catch (error) {
        return next(error);
    }
}

export async function getStaffListHandler(req, res, next) {
    try {
        const result = await getStaffListByAdmin(req.query, req.auth);
        return successResponse(res, result, "Staff list fetched successfully");
    } catch (error) {
        return next(error);
    }
}

export async function getStaffSummaryHandler(req, res, next) {
    try {
        const result = await getStaffSummaryByAdmin(req.query, req.auth);
        return successResponse(res, result, "Staff summary fetched successfully");
    } catch (error) {
        return next(error);
    }
}

export async function getStaffDetailHandler(req, res, next) {
    try {
        const result = await getStaffDetailByAdmin(req.params.userId, req.auth);
        return successResponse(res, result, "Staff detail fetched successfully");
    } catch (error) {
        return next(error);
    }
}

export async function updateStaffPersonalInformationHandler(req, res, next) {
    try {
        const result = await updateStaffPersonalInformationByAdmin(
            req.params.userId,
            req.body,
            req.file,
            req.auth
        );
        return successResponse(res, result, "Staff personal information updated successfully");
    } catch (error) {
        return next(error);
    }
}

export async function softDeleteStaffAccountHandler(req, res, next) {
    try {
        const result = await softDeleteStaffAccountByAdmin(req.params.userId, req.body, req.auth);
        return successResponse(res, result, "Staff account soft deleted successfully");
    } catch (error) {
        return next(error);
    }
}

export async function getMyStaffProfileDetailHandler(req, res, next) {
    try {
        const result = await getCurrentStaffProfileDetail(req.auth);
        return successResponse(res, result, "Current staff profile fetched successfully");
    } catch (error) {
        return next(error);
    }
}
