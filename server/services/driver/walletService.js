import sqldb from "../../config/sqldatabase.js";
import AppError from "../../utils/appError.js";
import {
    countDriverTransactions,
    countDriverWithdrawals,
    countPendingWithdrawals,
    findDriverBankInfo,
    findDriverPaymentByCode,
    findDriverWallet,
    findDriverWithdrawalById,
    findTopupPaymentByCode,
    generatePaymentCode,
    getWalletLedgerSummary,
    insertDriverTopupPayment,
    insertWithdrawalRequest,
    listDriverTransactions,
    listDriverWithdrawals,
    updatePaymentStatus,
} from "../../repositories/driver/walletRepository.js";
import {
    findWalletByIdForUpdate,
    insertWalletLedger,
    updateWalletBalance,
} from "../../repositories/walletRepository.js";

// ─── Private helpers ──────────────────────────────────────────────────────────

function ensurePositiveAmount(value, field = "amount") {
    const n = Number(value);
    if (!Number.isFinite(n) || n <= 0) {
        throw new AppError(`${field} must be a positive number.`, 422, "INVALID_AMOUNT");
    }
    return Math.round(n * 100) / 100;
}

const TOPUP_TERMINAL_STATUSES = new Set(["paid", "failed", "cancelled", "refunded"]);

// ─── Helpers ──────────────────────────────────────────────────────────────────

function normalizePagination(query = {}) {
    const page = Math.max(Number(query.page || 1), 1);
    const limit = Math.min(Math.max(Number(query.limit || 20), 1), 100);
    return { page, limit, offset: (page - 1) * limit };
}

function assertDriver(auth) {
    const driverId = Number(auth?.userId || 0);
    if (!driverId) throw new AppError("Forbidden", 403, "FORBIDDEN");
    return driverId;
}

// ─── Service functions ────────────────────────────────────────────────────────

/**
 * Wallet summary: balance + ledger aggregates + pending withdrawal count.
 */
export async function getWalletSummary(auth) {
    const driverId = assertDriver(auth);

    const [wallet, ledgerRows, pendingWithdrawalCount] = await Promise.all([
        findDriverWallet(driverId),
        getWalletLedgerSummary(driverId),
        countPendingWithdrawals(driverId),
    ]);

    if (!wallet) throw new AppError("Wallet not found.", 404, "WALLET_NOT_FOUND");

    let total_credited = 0;
    let total_debited  = 0;
    const credits_by_type = {};
    const debits_by_type  = {};

    for (const row of ledgerRows) {
        if (row.direction === "credit") {
            total_credited += row.total;
            credits_by_type[row.entry_type] = (credits_by_type[row.entry_type] || 0) + row.total;
        } else {
            total_debited += row.total;
            debits_by_type[row.entry_type] = (debits_by_type[row.entry_type] || 0) + row.total;
        }
    }

    return {
        balance:                  wallet.balance,
        cur_symbol:               wallet.cur_symbol,
        cur_code:                 wallet.cur_code,
        wallet_status:            wallet.status,
        total_credited:           Math.round(total_credited * 100) / 100,
        total_debited:            Math.round(total_debited  * 100) / 100,
        credits_by_type,
        debits_by_type,
        pending_withdrawal_count: pendingWithdrawalCount,
    };
}

/**
 * Get wallet balance and metadata.
 */
export async function getWalletInfo(auth) {
    const driverId = assertDriver(auth);

    const wallet = await findDriverWallet(driverId);

    if (!wallet) {
        throw new AppError("Wallet not found.", 404, "WALLET_NOT_FOUND");
    }

    return { wallet };
}

/**
 * Paginated wallet transaction history with optional filters.
 * Filters: entryType, direction, fromDate (YYYY-MM-DD), toDate (YYYY-MM-DD)
 */
export async function getTransactionHistory(auth, query = {}) {
    const driverId = assertDriver(auth);
    const { page, limit, offset } = normalizePagination(query);

    const filters = {
        entryType: query.entry_type  || undefined,
        direction: query.direction   || undefined,
        fromDate:  query.fromDate    || undefined,
        toDate:    query.toDate      || undefined,
    };

    const wallet = await findDriverWallet(driverId);

    if (!wallet) {
        throw new AppError("Wallet not found.", 404, "WALLET_NOT_FOUND");
    }

    const [items, total] = await Promise.all([
        listDriverTransactions(driverId, { limit, offset, ...filters }),
        countDriverTransactions(driverId, filters),
    ]);

    return {
        wallet: { balance: wallet.balance, cur_symbol: wallet.cur_symbol, cur_code: wallet.cur_code },
        items,
        pagination: {
            page,
            limit,
            total_items: total,
            total_pages: Math.ceil(total / limit),
        },
    };
}

/**
 * Paginated withdrawal request history.
 */
export async function getWithdrawalHistory(auth, query = {}) {
    const driverId = assertDriver(auth);
    const { page, limit, offset } = normalizePagination(query);

    const wallet = await findDriverWallet(driverId);

    if (!wallet) {
        throw new AppError("Wallet not found.", 404, "WALLET_NOT_FOUND");
    }

    const [items, total] = await Promise.all([
        listDriverWithdrawals(driverId, { limit, offset }),
        countDriverWithdrawals(driverId),
    ]);

    return {
        wallet: { balance: wallet.balance, cur_symbol: wallet.cur_symbol, cur_code: wallet.cur_code },
        items,
        pagination: {
            page,
            limit,
            total_items: total,
            total_pages: Math.ceil(total / limit),
        },
    };
}

/**
 * Request a cash withdrawal.
 * Rules:
 *  - Bank account info must be set on the driver profile
 *  - Wallet must exist and be active (status=1)
 *  - Amount must be > 0
 *  - Balance must be >= requested amount
 *  - No more than 1 pending withdrawal at a time
 *  - Does NOT debit wallet – admin processes and debits when approved
 */
export async function requestWithdrawal(auth, payload) {
    const driverId = assertDriver(auth);

    const amount = Number(payload.amount);
    const note = String(payload.note || "").trim() || null;

    if (!Number.isFinite(amount) || amount <= 0) {
        throw new AppError("Amount must be a positive number.", 422, "INVALID_AMOUNT");
    }

    // Round to 2 decimal places
    const roundedAmount = Math.round(amount * 100) / 100;

    // Bank info check (outside transaction — read-only)
    const bankInfo = await findDriverBankInfo(driverId);
    if (!bankInfo || !bankInfo.bank_name || !bankInfo.bank_acc_num) {
        throw new AppError(
            "Bank account information is required for withdrawal. Please update your profile.",
            422,
            "BANK_INFO_MISSING"
        );
    }

    const conn = await sqldb.getConnection();
    try {
        await conn.beginTransaction();

        // Lock wallet row for the duration of this transaction
        const wallet = await findDriverWallet(driverId, conn, true);

        if (!wallet) {
            throw new AppError("Wallet not found.", 404, "WALLET_NOT_FOUND");
        }

        if (wallet.status !== 1) {
            throw new AppError("Wallet is disabled.", 403, "WALLET_DISABLED");
        }

        if (wallet.balance < roundedAmount) {
            throw new AppError(
                "Insufficient wallet balance.",
                422,
                "INSUFFICIENT_BALANCE"
            );
        }

        // Check for existing pending withdrawal
        const pendingCount = await countPendingWithdrawals(driverId, conn);
        if (pendingCount > 0) {
            throw new AppError(
                "You already have a pending withdrawal request.",
                409,
                "PENDING_WITHDRAWAL_EXISTS"
            );
        }

        const withdrawalId = await insertWithdrawalRequest(
            { walletId: wallet.wallet_id, amount: roundedAmount, note },
            conn
        );

        await conn.commit();

        return {
            withdrawal: {
                id: withdrawalId,
                amount: roundedAmount,
                status: "pending",
                note,
                wallet_balance: wallet.balance,
                cur_symbol: wallet.cur_symbol,
                cur_code: wallet.cur_code,
            },
        };
    } catch (error) {
        await conn.rollback();
        throw error;
    } finally {
        conn.release();
    }
}

// ─── Topup flow ───────────────────────────────────────────────────────────────

/**
 * Create a pending topup payment.
 * Design: 2-step flow — create (pending) → gateway callback (credit wallet).
 * Balance is NOT touched here; it is credited only when the callback confirms.
 *
 * Pluggable gateway: set gateway_name in the request body.
 * The returned payment_code is passed to the payment gateway as the order ref.
 */
export async function createTopup(auth, payload) {
    const driverId   = assertDriver(auth);
    const amount     = ensurePositiveAmount(payload.amount);
    const gatewayName = String(payload.gateway_name || "").trim() || null;
    const note       = String(payload.note || "").trim() || "Wallet top-up";

    const wallet = await findDriverWallet(driverId);
    if (!wallet) throw new AppError("Wallet not found.", 404, "WALLET_NOT_FOUND");
    if (wallet.status !== 1) throw new AppError("Wallet is disabled.", 403, "WALLET_DISABLED");

    const paymentCode = generatePaymentCode("DRVTOP");
    const paymentId   = await insertDriverTopupPayment({
        walletId:    wallet.wallet_id,
        driverId,
        currencyId:  wallet.currency_id,
        amount,
        gatewayName,
        note,
        paymentCode,
    });

    return {
        payment: {
            payment_id:   paymentId,
            payment_code: paymentCode,
            amount,
            status:       "pending",
            gateway_name: gatewayName,
            description:  note,
        },
    };
}

/**
 * Driver polls their own topup payment status by payment_code.
 */
export async function getTopupDetail(auth, paymentCode) {
    const driverId = assertDriver(auth);
    const code = String(paymentCode || "").trim();
    if (!code) throw new AppError("paymentCode is required.", 422, "MISSING_PAYMENT_CODE");

    const payment = await findDriverPaymentByCode(driverId, code);
    if (!payment) throw new AppError("Payment not found.", 404, "PAYMENT_NOT_FOUND");

    return { payment };
}

/**
 * Gateway callback handler — processes payment gateway notifications.
 *
 * Security: validates `x-callback-secret` header against process.env.TOPUP_CALLBACK_SECRET
 * (if the env var is not set, validation is skipped — development mode).
 *
 * Idempotency guarantee:
 *   - Acquires FOR UPDATE lock on the payment row
 *   - If status is already in a terminal state, returns without re-processing
 *   - Wallet credit + ledger write happen in one atomic transaction
 *   - A second concurrent callback for the same code blocks at FOR UPDATE,
 *     then finds status='paid' and exits without double-crediting
 */
export async function processTopupCallback(callbackSecret, payload) {
    // ── Secret verification ───────────────────────────────────────────────────
    const expectedSecret = process.env.TOPUP_CALLBACK_SECRET;
    if (expectedSecret && callbackSecret !== expectedSecret) {
        throw new AppError("Invalid callback secret.", 401, "UNAUTHORIZED_CALLBACK");
    }

    const paymentCode = String(payload.payment_code || "").trim();
    const newStatus   = String(payload.status || "").trim().toLowerCase();
    const gatewayRef  = String(payload.gateway_transaction_ref || "").trim() || null;
    const gwAmount    = payload.amount !== undefined ? Number(payload.amount) : null;

    if (!paymentCode) throw new AppError("payment_code is required.", 422, "MISSING_PAYMENT_CODE");
    if (!["paid", "failed", "cancelled"].includes(newStatus)) {
        throw new AppError("status must be 'paid', 'failed', or 'cancelled'.", 422, "INVALID_CALLBACK_STATUS");
    }

    const conn = await sqldb.getConnection();
    try {
        await conn.beginTransaction();

        // ── Lock row ────────────────────────────────────────────────────────
        const payment = await findTopupPaymentByCode(paymentCode, conn, true);
        if (!payment) {
            throw new AppError("Payment not found.", 404, "PAYMENT_NOT_FOUND");
        }

        // ── Idempotency ─────────────────────────────────────────────────────
        if (payment.status === newStatus) {
            await conn.commit();
            return { processed: false, already_settled: true, payment_id: payment.payment_id, status: payment.status };
        }
        if (TOPUP_TERMINAL_STATUSES.has(payment.status)) {
            throw new AppError(
                `Payment is already finalized with status: ${payment.status}.`,
                409,
                "PAYMENT_ALREADY_FINALIZED"
            );
        }

        // ── Amount verification ─────────────────────────────────────────────
        if (gwAmount !== null && Math.abs(gwAmount - payment.amount) > 0.01) {
            throw new AppError(
                `Amount mismatch: expected ${payment.amount}, gateway sent ${gwAmount}.`,
                422,
                "AMOUNT_MISMATCH"
            );
        }

        // ── Update payment record ───────────────────────────────────────────
        await updatePaymentStatus(payment.payment_id, { status: newStatus, gatewayRef }, conn);

        // ── Credit wallet (only when paid) ──────────────────────────────────
        if (newStatus === "paid") {
            const wallet = await findWalletByIdForUpdate(payment.payer_wallet_id, conn);
            if (!wallet) throw new AppError("Wallet not found.", 404, "WALLET_NOT_FOUND");
            if (wallet.status !== 1) throw new AppError("Wallet is disabled.", 403, "WALLET_DISABLED");

            const nextBalance = Number((wallet.balance + payment.amount).toFixed(2));
            await updateWalletBalance(wallet.wallet_id, nextBalance, conn);
            await insertWalletLedger(
                {
                    wallet_id:    wallet.wallet_id,
                    payment_id:   payment.payment_id,
                    amount:       payment.amount,
                    balance_after: nextBalance,
                    direction:    "credit",
                    entry_type:   "topup",
                    source_type:  "gateway_payment",
                    source_id:    payment.payment_id,
                    description:  payment.description || "Wallet top-up",
                },
                conn
            );
        }

        await conn.commit();
        return { processed: true, payment_id: payment.payment_id, status: newStatus };
    } catch (error) {
        await conn.rollback();
        throw error;
    } finally {
        conn.release();
    }
}

// ─── Withdrawal detail ────────────────────────────────────────────────────────

/**
 * Fetch detail for a single withdrawal request owned by this driver.
 */
export async function getWithdrawalDetail(auth, withdrawalId) {
    const driverId = assertDriver(auth);
    const id = Number(withdrawalId);
    if (!Number.isInteger(id) || id < 1) {
        throw new AppError("Invalid withdrawal ID.", 422, "INVALID_WITHDRAWAL_ID");
    }

    const withdrawal = await findDriverWithdrawalById(driverId, id);
    if (!withdrawal) throw new AppError("Withdrawal not found.", 404, "WITHDRAWAL_NOT_FOUND");

    return { withdrawal };
}
