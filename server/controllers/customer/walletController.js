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
    payRentalDeposit,
    payRideBooking,
    retryPayment,
    webhookConfirmPayment,
} from "../../services/customer/walletService.js";
import { verifyMomoIpnSignature, mapMomoResultCode } from "../../services/payment/momoService.js";
import { findPaymentByCode } from "../../repositories/customer/walletRepository.js";

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

export async function payRentalDepositHandler(req, res, next) {
    try {
        const result = await payRentalDeposit(req.auth, req.params.rentalId);
        return successResponse(res, result, "Deposit payment processed successfully.");
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

// MoMo IPN handler (server-to-server, không cần auth)
export async function momoIpnHandler(req, res, next) {
    try {
        // 1. Xác minh chữ ký HMAC-SHA256 từ MoMo
        const isValid = verifyMomoIpnSignature(req.body);
        if (!isValid) {
            return res.status(400).json({ resultCode: 1, message: "Invalid signature" });
        }

        // 2. Tìm payment theo orderId (= payment_code trong hệ thống)
        const payment = await findPaymentByCode(req.body.orderId);
        if (!payment) {
            // Trả 200 để MoMo không retry – payment không tồn tại trong hệ thống
            return res.status(200).json({ resultCode: 0, message: "ok" });
        }

        // 3. Map resultCode MoMo sang trạng thái nội bộ
        const status = mapMomoResultCode(req.body.resultCode);

        // 4. Gọi luồng confirm chuẩn (cập nhật payment, wallet, ledger, emit realtime)
        const callbackData = {
            payment_id: Number(payment.payment_id),
            status,
            gateway_status: status,
            gateway_name: "momo",
            gateway_transaction_ref: req.body.transId != null ? String(req.body.transId) : null,
            p_transaction_ref: req.body.transId != null ? String(req.body.transId) : null,
            gateway_resp: req.body.message || null,
            currency: "VND",
        };
        await webhookConfirmPayment(callbackData);

        // 5. Trả về 200 JSON theo yêu cầu MoMo
        return res.status(200).json({ resultCode: 0, message: "ok" });
    } catch (error) {
        // Vẫn trả 200 để tránh MoMo retry liên tục; log lỗi qua next
        next(error);
    }
}
