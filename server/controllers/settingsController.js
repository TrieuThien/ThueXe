import { successResponse } from "../utils/apiResponse.js";
import {
    getSystemSettingsService,
    updateSystemSettingsService,
    getCurrenciesService,
    createCurrencyService,
    updateCurrencyService,
    setDefaultCurrencyService,
} from "../services/settingsService.js";

export async function getSystemSettingsHandler(req, res, next) {
    try {
        const result = await getSystemSettingsService();
        return successResponse(res, result, "System settings fetched successfully.");
    } catch (error) {
        return next(error);
    }
}

export async function updateSystemSettingsHandler(req, res, next) {
    try {
        const result = await updateSystemSettingsService(req.auth, req.body);
        return successResponse(res, result, "System settings updated successfully.");
    } catch (error) {
        return next(error);
    }
}

export async function getCurrenciesHandler(req, res, next) {
    try {
        const result = await getCurrenciesService();
        return successResponse(res, { currencies: result }, "Currencies fetched successfully.");
    } catch (error) {
        return next(error);
    }
}

export async function createCurrencyHandler(req, res, next) {
    try {
        const result = await createCurrencyService(req.body);
        return successResponse(res, { currency: result }, "Currency created successfully.", 201);
    } catch (error) {
        return next(error);
    }
}

export async function updateCurrencyHandler(req, res, next) {
    try {
        const result = await updateCurrencyService(req.params.id, req.body);
        return successResponse(res, { currency: result }, "Currency updated successfully.");
    } catch (error) {
        return next(error);
    }
}

export async function setDefaultCurrencyHandler(req, res, next) {
    try {
        const result = await setDefaultCurrencyService(req.params.id);
        return successResponse(res, { currencies: result }, "Default currency updated successfully.");
    } catch (error) {
        return next(error);
    }
}
