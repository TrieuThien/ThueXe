import {
    createTariffByAdmin,
    createZoneByAdmin,
    getTariffDetailByAdmin,
    getTariffListByAdmin,
    getTariffMetaByAdmin,
    getZoneDetailByAdmin,
    getZoneListByAdmin,
    getZoneMetaByAdmin,
    updateTariffByAdmin,
    updateZoneByAdmin,
} from "../services/tariffZoneService.js";
import { successResponse } from "../utils/apiResponse.js";

export async function getTariffMetaHandler(req, res, next) {
    try {
        const result = await getTariffMetaByAdmin(req.auth);
        return successResponse(res, result, "Get tariff meta successfully");
    } catch (error) {
        return next(error);
    }
}

export async function getTariffListHandler(req, res, next) {
    try {
        const result = await getTariffListByAdmin(req.query, req.auth);
        return successResponse(res, result, "Get tariff list successfully");
    } catch (error) {
        return next(error);
    }
}

export async function getTariffDetailHandler(req, res, next) {
    try {
        const result = await getTariffDetailByAdmin(req.params.id, req.auth);
        return successResponse(res, result, "Get tariff detail successfully");
    } catch (error) {
        return next(error);
    }
}

export async function createTariffHandler(req, res, next) {
    try {
        const result = await createTariffByAdmin(req.body, req.auth);
        return successResponse(res, result, "Create tariff successfully.", 201);
    } catch (error) {
        return next(error);
    }
}

export async function updateTariffHandler(req, res, next) {
    try {
        const result = await updateTariffByAdmin(req.params.id, req.body, req.auth);
        return successResponse(res, result, "Update tariff successfully.");
    } catch (error) {
        return next(error);
    }
}

export async function getZoneMetaHandler(req, res, next) {
    try {
        const result = await getZoneMetaByAdmin(req.auth);
        return successResponse(res, result, "Get zone meta successfully.");
    } catch (error) {
        return next(error);
    }
}

export async function getZoneListHandler(req, res, next) {
    try {
        const result = await getZoneListByAdmin(req.query, req.auth);
        return successResponse(res, result, "Get zone list successfully.");
    } catch (error) {
        return next(error);
    }
}

export async function getZoneDetailHandler(req, res, next) {
    try {
        const result = await getZoneDetailByAdmin(req.params.id, req.auth);
        return successResponse(res, result, "Get zone detail successfully.");
    } catch (error) {
        return next(error);
    }
}

export async function createZoneHandler(req, res, next) {
    try {
        const result = await createZoneByAdmin(req.body, req.auth);
        return successResponse(res, result, "Create zone successfully.", 201);
    } catch (error) {
        return next(error);
    }
}

export async function updateZoneHandler(req, res, next) {
    try {
        const result = await updateZoneByAdmin(req.params.id, req.body, req.auth);
        return successResponse(res, result, "Update zone successfully.");
    } catch (error) {
        return next(error);
    }
}

