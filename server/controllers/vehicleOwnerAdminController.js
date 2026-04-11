import {
    createVehicleOwner,
    getVehicleOwnerDetail,
    getVehicleOwnerList,
    getVehicleOwnerMeta,
    getVehicleOwnerSummary,
    softDeleteVehicleOwner,
    updateVehicleOwnerAccountState,
    updateVehicleOwnerPersonalInformation,
} from "../services/vehicleOwnerAdminService.js";
import { successResponse } from "../utils/apiResponse.js";

export async function getVehicleOwnerMetaHandler(req, res, next) {
    try {
        const result = await getVehicleOwnerMeta();
        return successResponse(res, result, "Vehicle owner metadata fetched successfully");
    } catch (error) {
        return next(error);
    }
}

export async function getVehicleOwnerListHandler(req, res, next) {
    try {
        const result = await getVehicleOwnerList(req.query);
        return successResponse(res, result, "Vehicle owners fetched successfully");
    } catch (error) {
        return next(error);
    }
}

export async function getVehicleOwnerSummaryHandler(req, res, next) {
    try {
        const result = await getVehicleOwnerSummary(req.query);
        return successResponse(res, result, "Vehicle owner summary fetched successfully");
    } catch (error) {
        return next(error);
    }
}

export async function getVehicleOwnerDetailHandler(req, res, next) {
    try {
        const result = await getVehicleOwnerDetail(req.params.ownerId);
        return successResponse(res, result, "Vehicle owner detail fetched successfully");
    } catch (error) {
        return next(error);
    }
}

export async function createVehicleOwnerHandler(req, res, next) {
    try {
        const result = await createVehicleOwner(req.body);
        return successResponse(res, result, "Vehicle owner created successfully", 201);
    } catch (error) {
        return next(error);
    }
}

export async function updateVehicleOwnerPersonalInfoHandler(req, res, next) {
    try {
        const result = await updateVehicleOwnerPersonalInformation(req.params.ownerId, req.body);
        return successResponse(res, result, "Vehicle owner personal information updated successfully");
    } catch (error) {
        return next(error);
    }
}

export async function updateVehicleOwnerAccountStatusHandler(req, res, next) {
    try {
        const result = await updateVehicleOwnerAccountState(req.params.ownerId, req.body);
        return successResponse(res, result, "Vehicle owner account status updated successfully");
    } catch (error) {
        return next(error);
    }
}

export async function deleteVehicleOwnerAccountHandler(req, res, next) {
    try {
        const result = await softDeleteVehicleOwner(req.params.ownerId, req.body);
        return successResponse(res, result, "Vehicle owner account deleted successfully");
    } catch (error) {
        return next(error);
    }
}

