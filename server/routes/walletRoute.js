import { Router } from "express";
import requireAuth from "../middlewares/authMiddleware.js";
import requireRole from "../middlewares/roleMiddleware.js";
import validateRequest from "../middlewares/validateRequest.js";
import {
    adminAdjustWalletHandler,
    adminDisputeRefundHandler,
    adminListWalletAccountsHandler,
    adminListWalletLedgerHandler,
    adminProcessWithdrawalHandler,
    adminUpdateWalletStatusHandler,
    adminWalletOverviewHandler,
    createWithdrawalHandler,
    getMyWalletHandler,
    getMyWalletTransactionsHandler,
    getMyWithdrawalsHandler,
    payBookingByWalletHandler,
    payRentalByWalletHandler,
    topupMyWalletHandler,
} from "../controllers/walletController.js";
import {
    adminAdjustWalletValidator,
    adminDisputeRefundValidator,
    adminProcessWithdrawalValidator,
    adminUpdateWalletStatusValidator,
    adminWalletAccountsValidator,
    adminWalletLedgerValidator,
    createWithdrawalValidator,
    payBookingByWalletValidator,
    payRentalByWalletValidator,
    topupWalletValidator,
    walletPaginationValidator,
} from "../validators/walletValidators.js";

const router = Router();

router.get("/api/wallets/me", requireAuth, getMyWalletHandler);
router.get(
    "/api/wallets/me/transactions",
    requireAuth,
    walletPaginationValidator,
    validateRequest,
    getMyWalletTransactionsHandler
);
router.post(
    "/api/wallets/me/topup",
    requireAuth,
    topupWalletValidator,
    validateRequest,
    topupMyWalletHandler
);
router.post(
    "/api/wallets/me/withdrawals",
    requireAuth,
    createWithdrawalValidator,
    validateRequest,
    createWithdrawalHandler
);
router.get(
    "/api/wallets/me/withdrawals",
    requireAuth,
    walletPaginationValidator,
    validateRequest,
    getMyWithdrawalsHandler
);

router.post(
    "/api/wallets/bookings/:bookingId/pay",
    requireAuth,
    requireRole("passenger"),
    payBookingByWalletValidator,
    validateRequest,
    payBookingByWalletHandler
);

router.post(
    "/api/wallets/rentals/:rentalId/pay",
    requireAuth,
    requireRole("passenger"),
    payRentalByWalletValidator,
    validateRequest,
    payRentalByWalletHandler
);

router.get(
    "/api/wallets/admin/overview",
    requireAuth,
    requireRole("admin"),
    adminWalletOverviewHandler
);
router.get(
    "/api/wallets/admin/accounts",
    requireAuth,
    requireRole("admin"),
    adminWalletAccountsValidator,
    validateRequest,
    adminListWalletAccountsHandler
);
router.get(
    "/api/wallets/admin/transactions",
    requireAuth,
    requireRole("admin"),
    adminWalletLedgerValidator,
    validateRequest,
    adminListWalletLedgerHandler
);
router.post(
    "/api/wallets/admin/adjustments",
    requireAuth,
    requireRole("admin"),
    adminAdjustWalletValidator,
    validateRequest,
    adminAdjustWalletHandler
);
router.patch(
    "/api/wallets/admin/accounts/:walletId/status",
    requireAuth,
    requireRole("admin"),
    adminUpdateWalletStatusValidator,
    validateRequest,
    adminUpdateWalletStatusHandler
);
router.patch(
    "/api/wallets/admin/withdrawals/:withdrawalId",
    requireAuth,
    requireRole("admin"),
    adminProcessWithdrawalValidator,
    validateRequest,
    adminProcessWithdrawalHandler
);
router.post(
    "/api/wallets/admin/dispute-refund",
    requireAuth,
    requireRole("admin"),
    adminDisputeRefundValidator,
    validateRequest,
    adminDisputeRefundHandler
);

export default router;
