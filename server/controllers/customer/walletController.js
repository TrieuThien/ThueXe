import { successResponse } from "../../utils/apiResponse.js";
import {
    createWalletTopupPayment,
    createWithdrawal,
    confirmWalletTopup,
    getPaymentDetail,
    getWallet,
    getWalletTransactions,
    getWithdrawals,
    payRentalBooking,
    payRideBooking,
    retryPayment,
    webhookConfirmPayment,
} from "../../services/customer/walletService.js";

export async function getWalletHandler(req, res, next) {
    try {
        const result = await getWallet(req.auth);
        return successResponse(res, result, "Wallet fetched successfully.");
    } catch (error) {
        return next(error);
    }
}

export async function getWalletTransactionsHandler(req, res, next) {
    try {
        const result = await getWalletTransactions(req.auth, req.query);
        return successResponse(res, result, "Wallet transactions fetched successfully.");
    } catch (error) {
        return next(error);
    }
}

export async function createTopupPaymentHandler(req, res, next) {
    try {
        const result = await createWalletTopupPayment(req.auth, req.body);
        return successResponse(res, result, "Topup payment created successfully.", 201);
    } catch (error) {
        return next(error);
    }
}

export async function confirmTopupPaymentHandler(req, res, next) {
    try {
        const result = await confirmWalletTopup(req.auth, req.body);
        return successResponse(res, result, "Topup payment confirmed successfully.");
    } catch (error) {
        return next(error);
    }
}

export async function createWithdrawalHandler(req, res, next) {
    try {
        const result = await createWithdrawal(req.auth, req.body);
        return successResponse(res, result, "Withdrawal request created successfully.", 201);
    } catch (error) {
        return next(error);
    }
}

export async function getWithdrawalsHandler(req, res, next) {
    try {
        const result = await getWithdrawals(req.auth, req.query);
        return successResponse(res, result, "Withdrawals fetched successfully.");
    } catch (error) {
        return next(error);
    }
}

export async function getPaymentDetailHandler(req, res, next) {
    try {
        const result = await getPaymentDetail(req.auth, req.params.paymentId);
        return successResponse(res, result, "Payment detail fetched successfully.");
    } catch (error) {
        return next(error);
    }
}

export async function payRideBookingHandler(req, res, next) {
    try {
        const result = await payRideBooking(req.auth, req.params.bookingId, req.body);
        return successResponse(res, result, "Ride payment processed successfully.");
    } catch (error) {
        return next(error);
    }
}

export async function payRentalBookingHandler(req, res, next) {
    try {
        const result = await payRentalBooking(req.auth, req.params.rentalId, req.body);
        return successResponse(res, result, "Rental payment processed successfully.");
    } catch (error) {
        return next(error);
    }
}

export async function retryPaymentHandler(req, res, next) {
    try {
        const result = await retryPayment(req.auth, req.params.paymentId);
        return successResponse(res, result, "Payment retry created successfully.");
    } catch (error) {
        return next(error);
    }
}

export async function webhookConfirmPaymentHandler(req, res, next) {
    try {
        const result = await webhookConfirmPayment(req.body);
        return successResponse(res, result, "Webhook payment confirmed successfully.");
    } catch (error) {
        return next(error);
    }
}
