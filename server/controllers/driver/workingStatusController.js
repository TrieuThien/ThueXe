import { successResponse } from "../../utils/apiResponse.js";
import {
    getWorkingStatus,
    patchOnlineStatus,
    patchServiceType,
    getWorkingAreas,
    postLocation,
    postHeartbeat,
} from "../../services/driver/workingStatusService.js";

export async function getWorkingStatusHandler(req, res, next) {
    try {
        const result = await getWorkingStatus(req.auth);
        return successResponse(res, result, "Working status fetched successfully");
    } catch (error) {
        return next(error);
    }
}

export async function patchOnlineStatusHandler(req, res, next) {
    try {
        const result = await patchOnlineStatus(req.auth, req.body);
        return successResponse(res, result, "Online status updated successfully");
    } catch (error) {
        return next(error);
    }
}

export async function patchServiceTypeHandler(req, res, next) {
    try {
        const result = await patchServiceType(req.auth, req.body);
        return successResponse(res, result, "Service type updated successfully");
    } catch (error) {
        return next(error);
    }
}

export async function getWorkingAreasHandler(req, res, next) {
    try {
        const result = await getWorkingAreas(req.auth);
        return successResponse(res, result, "Working areas fetched successfully");
    } catch (error) {
        return next(error);
    }
}

export async function postLocationHandler(req, res, next) {
    try {
        const result = await postLocation(req.auth, req.body);
        return successResponse(res, result, "Location updated successfully");
    } catch (error) {
        return next(error);
    }
}

export async function postHeartbeatHandler(req, res, next) {
    try {
        const result = await postHeartbeat(req.auth, req.body);
        return successResponse(res, result, "Heartbeat acknowledged");
    } catch (error) {
        return next(error);
    }
}
