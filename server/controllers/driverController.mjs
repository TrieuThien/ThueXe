import {
    createDriver,
    getDriverDetail,
    getDriverList,
    getDriverLocation,
    getDriverMeta,
    getDriverSummary,
    softDeleteDriverAccount,
    updateDriverAccountState,
    updateDriverPersonalInformation,
    updateDriverWithdrawal,
} from "../services/driverService.js";
import { successResponse } from "../utils/apiResponse.js";

export async function getDriverMetaHandler(req, res, next) {
    try {
        const result = await getDriverMeta();
        return successResponse(res, result, "Driver metadata fetched successfully");
    } catch (error) {
        return next(error);
    }
}

export async function createDriverHandler(req, res, next) {
    try {
        const result = await createDriver(req.body, req.file);
        return successResponse(res, result, "Driver created successfully", 201);
    } catch (error) {
        return next(error);
    }
}

export async function getDriverListHandler(req, res, next) {
    try {
        const result = await getDriverList(req.query);
        return successResponse(res, result, "Drivers fetched successfully");
    } catch (error) {
        return next(error);
    }
}

export async function getDriverSummaryHandler(req, res, next) {
    try {
        const result = await getDriverSummary(req.query);
        return successResponse(res, result, "Driver summary fetched successfully");
    } catch (error) {
        return next(error);
    }
}

export async function getDriverDetailHandler(req, res, next) {
    try {
        const result = await getDriverDetail(req.params.driverId);
        return successResponse(res, result, "Driver detail fetched successfully");
    } catch (error) {
        return next(error);
    }
}

export async function updateDriverAccountStateHandler(req, res, next) {
    try {
        const result = await updateDriverAccountState(req.params.driverId, req.body);
        return successResponse(res, result, "Driver account status updated successfully");
    } catch (error) {
        return next(error);
    }
}

export async function updateDriverPersonalInformationHandler(req, res, next) {
    try {
        const result = await updateDriverPersonalInformation(req.params.driverId, req.body, req.file);
        return successResponse(res, result, "Driver personal information updated successfully");
    } catch (error) {
        return next(error);
    }
}

export async function softDeleteDriverAccountHandler(req, res, next) {
    try {
        const result = await softDeleteDriverAccount(req.params.driverId, req.body, req.auth);
        return successResponse(res, result, "Driver account deleted successfully");
    } catch (error) {
        return next(error);
    }
}

export async function updateDriverWithdrawalHandler(req, res, next) {
    try {
        const result = await updateDriverWithdrawal(
            req.params.driverId,
            req.params.withdrawalId,
            req.body
        );
        return successResponse(res, result, "Driver withdrawal updated successfully");
    } catch (error) {
        return next(error);
    }
}

export async function getDriverLocationHandler(req, res, next) {
    try {
        const result = await getDriverLocation(req.params.driverId);
        return successResponse(res, result, "Driver location fetched successfully");
    } catch (error) {
        return next(error);
    }
}
