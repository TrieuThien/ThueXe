import { successResponse } from "../utils/apiResponse.js";
import {
    adminDashboardService,
    dispatcherDashboardService,
    operationsReportService,
} from "../services/dashboardService.js";

export async function adminDashboardHandler(req, res, next) {
    try {
        const result = await adminDashboardService({ query: req.query });
        return successResponse(res, result, "Admin dashboard fetched successfully");
    } catch (error) {
        return next(error);
    }
}

export async function dispatcherDashboardHandler(req, res, next) {
    try {
        const result = await dispatcherDashboardService();
        return successResponse(res, result, "Dispatcher dashboard fetched successfully");
    } catch (error) {
        return next(error);
    }
}

export async function operationsReportHandler(req, res, next) {
    try {
        const result = await operationsReportService({ query: req.query });
        return successResponse(res, result, "Operations report fetched successfully");
    } catch (error) {
        return next(error);
    }
}

