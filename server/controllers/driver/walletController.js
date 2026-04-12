import {
    createTopup,
    getTopupDetail,
    getTransactionHistory,
    getWithdrawalDetail,
    getWithdrawalHistory,
    getWalletInfo,
    getWalletSummary,
    processTopupCallback,
    requestWithdrawal,
} from "../../services/driver/walletService.js";
import { successResponse } from "../../utils/apiResponse.js";

export async function getWalletSummaryHandler(req, res, next) {
    try {
        const result = await getWalletSummary(req.auth);
        return successResponse(res, result, "Wallet summary fetched");
    } catch (error) {
        return next(error);
    }
}

export async function getWalletHandler(req, res, next) {
    try {
        const result = await getWalletInfo(req.auth);
        return successResponse(res, result, "Wallet info fetched");
    } catch (error) {
        return next(error);
    }
}

export async function getTransactionsHandler(req, res, next) {
    try {
        const result = await getTransactionHistory(req.auth, req.query);
        return successResponse(res, result, "Transaction history fetched");
    } catch (error) {
        return next(error);
    }
}

export async function getWithdrawalsHandler(req, res, next) {
    try {
        const result = await getWithdrawalHistory(req.auth, req.query);
        return successResponse(res, result, "Withdrawal history fetched");
    } catch (error) {
        return next(error);
    }
}

export async function requestWithdrawalHandler(req, res, next) {
    try {
        const result = await requestWithdrawal(req.auth, req.body);
        return successResponse(res, result, "Withdrawal request submitted", 201);
    } catch (error) {
        return next(error);
    }
}

export async function createTopupHandler(req, res, next) {
    try {
        const result = await createTopup(req.auth, req.body);
        return successResponse(res, result, "Topup payment created", 201);
    } catch (error) {
        return next(error);
    }
}

export async function getTopupDetailHandler(req, res, next) {
    try {
        const result = await getTopupDetail(req.auth, req.params.paymentCode);
        return successResponse(res, result, "Topup payment fetched");
    } catch (error) {
        return next(error);
    }
}

export async function topupCallbackHandler(req, res, next) {
    try {
        const secret = req.headers["x-callback-secret"] || null;
        const result = await processTopupCallback(secret, req.body);
        return successResponse(res, result, "Callback processed");
    } catch (error) {
        return next(error);
    }
}

export async function getWithdrawalDetailHandler(req, res, next) {
    try {
        const result = await getWithdrawalDetail(req.auth, req.params.withdrawalId);
        return successResponse(res, result, "Withdrawal detail fetched");
    } catch (error) {
        return next(error);
    }
}
