import {
    createBannerByAdmin,
    getBannerDetailByAdmin,
    getBannerListByAdmin,
    getBannerMetaByAdmin,
    toggleBannerStatusByAdmin,
    updateBannerByAdmin,
} from "../services/bannerService.js";
import { successResponse } from "../utils/apiResponse.js";

export async function getBannerMetaHandler(req, res, next) {
    try {
        const result = await getBannerMetaByAdmin(req.auth);
        return successResponse(res, result, "Get banner meta successfully.");
    } catch (error) {
        return next(error);
    }
}

export async function getAdminBannerListHandler(req, res, next) {
    try {
        const result = await getBannerListByAdmin(req.query, req.auth);
        return successResponse(res, result, "Get banner list successfully.");
    } catch (error) {
        return next(error);
    }
}

export async function getAdminBannerDetailHandler(req, res, next) {
    try {
        const result = await getBannerDetailByAdmin(req.params.id, req.auth);
        return successResponse(res, result, "Get banner detail successfully.");
    } catch (error) {
        return next(error);
    }
}

export async function createAdminBannerHandler(req, res, next) {
    try {
        const result = await createBannerByAdmin(req.body, req.auth);
        return successResponse(res, result, "Create banner successfully.", 201);
    } catch (error) {
        return next(error);
    }
}

export async function updateAdminBannerHandler(req, res, next) {
    try {
        const result = await updateBannerByAdmin(req.params.id, req.body, req.auth);
        return successResponse(res, result, "Update banner successfully.");
    } catch (error) {
        return next(error);
    }
}

export async function updateAdminBannerStatusHandler(req, res, next) {
    try {
        const result = await toggleBannerStatusByAdmin(req.params.id, req.body, req.auth);
        return successResponse(res, result, "Update banner status successfully.");
    } catch (error) {
        return next(error);
    }
}
