import { Router } from "express";
import requireAuth from "../../middlewares/authMiddleware.js";
import validateRequest from "../../middlewares/validateRequest.js";
import {
    confirmTopupPaymentHandler,
    createTopupPaymentHandler,
    createWithdrawalHandler,
    getPaymentDetailHandler,
    getWalletHandler,
    getWalletTransactionsHandler,
    getWithdrawalsHandler,
    momoIpnHandler,
    sepayIpnHandler,
    sepayCheckoutPageHandler,
    payRentalBookingHandler,
    payRentalDepositHandler,
    payRideBookingHandler,
    retryPaymentHandler,
    webhookConfirmPaymentHandler,
} from "../../controllers/customer/walletController.js";
import {
    confirmTopupValidator,
    createTopupPaymentValidator,
    createWithdrawalValidator,
    momoIpnValidator,
    sepayIpnValidator,
    paymentIdParamValidator,
    rentalDepositValidator,
    rentalPaymentValidator,
    retryPaymentValidator,
    ridePaymentValidator,
    walletTransactionsValidator,
    webhookConfirmValidator,
    withdrawalsQueryValidator,
} from "../../validators/customer/walletValidators.js";

const router = Router();

router.get("/wallet", requireAuth, getWalletHandler);
router.get("/wallet/transactions", requireAuth, walletTransactionsValidator, validateRequest, getWalletTransactionsHandler);
router.post(
    "/wallet/topup/create-payment",
    requireAuth,
    createTopupPaymentValidator,
    validateRequest,
    createTopupPaymentHandler
);
router.post(
    "/wallet/topup/confirm",
    requireAuth,
    confirmTopupValidator,
    validateRequest,
    confirmTopupPaymentHandler
);
router.post("/wallet/withdrawals", requireAuth, createWithdrawalValidator, validateRequest, createWithdrawalHandler);
router.get("/wallet/withdrawals", requireAuth, withdrawalsQueryValidator, validateRequest, getWithdrawalsHandler);

router.get("/payments/:paymentId", requireAuth, paymentIdParamValidator, validateRequest, getPaymentDetailHandler);
router.post("/payments/ride/:bookingId/pay", requireAuth, ridePaymentValidator, validateRequest, payRideBookingHandler);
router.post(
    "/payments/rental/:rentalId/pay",
    requireAuth,
    rentalPaymentValidator,
    validateRequest,
    payRentalBookingHandler
);
router.post(
    "/payments/rental/:rentalId/pay-deposit",
    requireAuth,
    rentalDepositValidator,
    validateRequest,
    payRentalDepositHandler
);
router.post("/payments/:paymentId/retry", requireAuth, retryPaymentValidator, validateRequest, retryPaymentHandler);
router.post(
    "/payments/webhook/confirm",
    webhookConfirmValidator,
    validateRequest,
    webhookConfirmPaymentHandler
);

// SePay checkout relay – browser/WebView mở URL này, nhận HTML tự POST đến SePay
router.get("/payments/checkout/sepay", sepayCheckoutPageHandler);

// MoMo IPN endpoint – server-to-server callback, không cần requireAuth
router.post(
    "/payments/webhook/momo",
    momoIpnValidator,
    validateRequest,
    momoIpnHandler
);

// SePay IPN endpoint – server-to-server callback, không cần requireAuth
router.post(
    "/payments/webhook/sepay",
    sepayIpnValidator,
    validateRequest,
    sepayIpnHandler
);

export default router;
