import { successResponse } from "../utils/apiResponse.js";
import {
    adminAdjustWallet,
    adminListWalletAccounts,
    adminListWalletLedger,
    adminProcessWithdrawal,
    adminWalletOverview,
    createWithdrawal,
    getMyWallet,
    getMyWalletTransactions,
    getMyWithdrawals,
    payBookingByWallet,
    payRentalByWallet,
    topupMyWallet,
} from "../services/walletService.js";

export async function getMyWalletHandler(req, res, next) {
    try {
        const result = await getMyWallet({ auth: req.auth });
        return successResponse(res, result, "Wallet fetched successfully");
    } catch (error) {
        return next(error);
    }
}

export async function getMyWalletTransactionsHandler(req, res, next) {
    try {
        const result = await getMyWalletTransactions({ auth: req.auth, query: req.query });
        return successResponse(res, result, "Wallet transactions fetched successfully");
    } catch (error) {
        return next(error);
    }
}

export async function topupMyWalletHandler(req, res, next) {
    try {
        const result = await topupMyWallet({ auth: req.auth, payload: req.body });
        return successResponse(res, result, "Wallet top-up successful", 201);
    } catch (error) {
        return next(error);
    }
}

export async function createWithdrawalHandler(req, res, next) {
    try {
        const result = await createWithdrawal({ auth: req.auth, payload: req.body });
        return successResponse(res, result, "Withdrawal request created", 201);
    } catch (error) {
        return next(error);
    }
}

export async function getMyWithdrawalsHandler(req, res, next) {
    try {
        const result = await getMyWithdrawals({ auth: req.auth, query: req.query });
        return successResponse(res, result, "Withdrawal list fetched successfully");
    } catch (error) {
        return next(error);
    }
}

export async function payBookingByWalletHandler(req, res, next) {
    try {
        const result = await payBookingByWallet({
            auth: req.auth,
            bookingId: req.params.bookingId,
        });
        return successResponse(res, result, "Booking paid by wallet successfully");
    } catch (error) {
        return next(error);
    }
}

export async function payRentalByWalletHandler(req, res, next) {
    try {
        const result = await payRentalByWallet({
            auth: req.auth,
            rentalId: req.params.rentalId,
        });
        return successResponse(res, result, "Rental paid by wallet successfully");
    } catch (error) {
        return next(error);
    }
}

export async function adminWalletOverviewHandler(req, res, next) {
    try {
        const result = await adminWalletOverview();
        return successResponse(res, result, "Wallet overview fetched successfully");
    } catch (error) {
        return next(error);
    }
}

export async function adminListWalletAccountsHandler(req, res, next) {
    try {
        const result = await adminListWalletAccounts({ query: req.query });
        return successResponse(res, result, "Wallet accounts fetched successfully");
    } catch (error) {
        return next(error);
    }
}

export async function adminListWalletLedgerHandler(req, res, next) {
    try {
        const result = await adminListWalletLedger({ query: req.query });
        return successResponse(res, result, "Wallet ledger fetched successfully");
    } catch (error) {
        return next(error);
    }
}

export async function adminAdjustWalletHandler(req, res, next) {
    try {
        const result = await adminAdjustWallet({ payload: req.body, auth: req.auth });
        return successResponse(res, result, "Wallet adjusted successfully", 201);
    } catch (error) {
        return next(error);
    }
}

export async function adminProcessWithdrawalHandler(req, res, next) {
    try {
        const result = await adminProcessWithdrawal({
            withdrawalId: req.params.withdrawalId,
            payload: req.body,
        });
        return successResponse(res, result, "Withdrawal processed successfully");
    } catch (error) {
        return next(error);
    }
}

