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
        return successResponse(res, result, "Lấy dữ liệu cước phí thành công");
    } catch (error) {
        return next(error);
    }
}

export async function getTariffListHandler(req, res, next) {
    try {
        const result = await getTariffListByAdmin(req.query, req.auth);
        return successResponse(res, result, "Lấy danh sách cước phí thành công");
    } catch (error) {
        return next(error);
    }
}

export async function getTariffDetailHandler(req, res, next) {
    try {
        const result = await getTariffDetailByAdmin(req.params.id, req.auth);
        return successResponse(res, result, "Lấy chi tiết cước phí thành công");
    } catch (error) {
        return next(error);
    }
}

export async function createTariffHandler(req, res, next) {
    try {
        const result = await createTariffByAdmin(req.body, req.auth);
        return successResponse(res, result, "Tạo cước phí thành công", 201);
    } catch (error) {
        return next(error);
    }
}

export async function updateTariffHandler(req, res, next) {
    try {
        const result = await updateTariffByAdmin(req.params.id, req.body, req.auth);
        return successResponse(res, result, "Cập nhật cước phí thành công");
    } catch (error) {
        return next(error);
    }
}

export async function getZoneMetaHandler(req, res, next) {
    try {
        const result = await getZoneMetaByAdmin(req.auth);
        return successResponse(res, result, "Lấy dữ liệu vùng thành công");
    } catch (error) {
        return next(error);
    }
}

export async function getZoneListHandler(req, res, next) {
    try {
        const result = await getZoneListByAdmin(req.query, req.auth);
        return successResponse(res, result, "Lấy danh sách vùng thành công");
    } catch (error) {
        return next(error);
    }
}

export async function getZoneDetailHandler(req, res, next) {
    try {
        const result = await getZoneDetailByAdmin(req.params.id, req.auth);
        return successResponse(res, result, "Lấy chi tiết vùng thành công");
    } catch (error) {
        return next(error);
    }
}

export async function createZoneHandler(req, res, next) {
    try {
        const result = await createZoneByAdmin(req.body, req.auth);
        return successResponse(res, result, "Tạo vùng thành công", 201);
    } catch (error) {
        return next(error);
    }
}

export async function updateZoneHandler(req, res, next) {
    try {
        const result = await updateZoneByAdmin(req.params.id, req.body, req.auth);
        return successResponse(res, result, "Cập nhật vùng thành công");
    } catch (error) {
        return next(error);
    }
}

