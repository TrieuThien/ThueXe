import {
    createCustomer,
    getCustomerDetail,
    getCustomerList,
    getCustomerSummary,
    updateCustomerActivationState,
    updateCustomerAccountState,
    updateCustomerPersonalInformation,
} from "../services/customerService.js";
import { successResponse } from "../utils/apiResponse.js";

export async function createCustomerHandler(req, res, next) {
    try {
        const result = await createCustomer(req.body, req.file);
        return successResponse(res, result, "Customer created successfully", 201);
    } catch (error) {
        return next(error);
    }
}

export async function getCustomerListHandler(req, res, next) {
    try {
        const result = await getCustomerList(req.query);
        return successResponse(res, result, "Customers fetched successfully");
    } catch (error) {
        return next(error);
    }
}

export async function getCustomerSummaryHandler(req, res, next) {
    try {
        const result = await getCustomerSummary(req.query);
        return successResponse(res, result, "Customer summary fetched successfully");
    } catch (error) {
        return next(error);
    }
}

export async function getCustomerDetailHandler(req, res, next) {
    try {
        const result = await getCustomerDetail(req.params.userId);
        return successResponse(res, result, "Customer detail fetched successfully");
    } catch (error) {
        return next(error);
    }
}

export async function updateCustomerAccountStateHandler(req, res, next) {
    try {
        const result = await updateCustomerAccountState(req.params.userId, req.body);
        return successResponse(res, result, "Customer account status updated successfully");
    } catch (error) {
        return next(error);
    }
}

export async function updateCustomerActivationStateHandler(req, res, next) {
    try {
        const result = await updateCustomerActivationState(req.params.userId, req.body);
        return successResponse(res, result, "Customer account activation status updated successfully");
    } catch (error) {
        return next(error);
    }
}

export async function updateCustomerPersonalInformationHandler(req, res, next) {
    try {
        const result = await updateCustomerPersonalInformation(req.params.userId, req.body, req.file);
        return successResponse(res, result, "Customer personal information updated successfully");
    } catch (error) {
        return next(error);
    }
}
