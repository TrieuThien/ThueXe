import {
    getIncomeChart,
    getIncomeHistory,
    getIncomeSummary,
} from "../../services/driver/incomeService.js";
import { successResponse } from "../../utils/apiResponse.js";

export async function getIncomeSummaryHandler(req, res, next) {
    try {
        const result = await getIncomeSummary(req.auth);
        return successResponse(res, result, "Income summary fetched");
    } catch (error) {
        return next(error);
    }
}

export async function getIncomeChartHandler(req, res, next) {
    try {
        const result = await getIncomeChart(req.auth, req.query);
        return successResponse(res, result, "Income chart data fetched");
    } catch (error) {
        return next(error);
    }
}

export async function getIncomeHistoryHandler(req, res, next) {
    try {
        const result = await getIncomeHistory(req.auth, req.query);
        return successResponse(res, result, "Income history fetched");
    } catch (error) {
        return next(error);
    }
}
