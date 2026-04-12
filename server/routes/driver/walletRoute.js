import { Router } from "express";
import {
    createTopupHandler,
    getTopupDetailHandler,
    getTransactionsHandler,
    getWithdrawalDetailHandler,
    getWithdrawalsHandler,
    getWalletHandler,
    getWalletSummaryHandler,
    requestWithdrawalHandler,
    topupCallbackHandler,
} from "../../controllers/driver/walletController.js";
import requireAuth from "../../middlewares/authMiddleware.js";
import requireRole from "../../middlewares/roleMiddleware.js";
import validateRequest from "../../middlewares/validateRequest.js";
import {
    createTopupValidator,
    getTopupDetailValidator,
    getTransactionsValidator,
    getWalletSummaryValidator,
    getWalletValidator,
    getWithdrawalDetailValidator,
    getWithdrawalsValidator,
    requestWithdrawalValidator,
    topupCallbackValidator,
} from "../../validators/driver/walletValidators.js";

const router = Router();

// ─── Public callback (NO auth — called by payment gateway server-to-server) ───
// Must be declared BEFORE router.use(requireAuth) so auth middleware is skipped.
router.post("/topup/callback", topupCallbackValidator, validateRequest, topupCallbackHandler);

// ─── All other endpoints require an authenticated driver ──────────────────────
router.use(requireAuth, requireRole("driver"));

router.get("/summary",       getWalletSummaryValidator,    validateRequest, getWalletSummaryHandler);
router.get("/transactions",  getTransactionsValidator,     validateRequest, getTransactionsHandler);

// Topup: static POST and static POST/callback before dynamic GET /:paymentCode
router.post("/topup",             createTopupValidator,    validateRequest, createTopupHandler);
router.get("/topup/:paymentCode", getTopupDetailValidator, validateRequest, getTopupDetailHandler);

// Withdrawals: static GET/POST before dynamic GET /:id
router.get("/withdrawals",               getWithdrawalsValidator,      validateRequest, getWithdrawalsHandler);
router.post("/withdrawals",              requestWithdrawalValidator,   validateRequest, requestWithdrawalHandler);
router.get("/withdrawals/:withdrawalId", getWithdrawalDetailValidator, validateRequest, getWithdrawalDetailHandler);

router.get("/", getWalletValidator, validateRequest, getWalletHandler);

export default router;
