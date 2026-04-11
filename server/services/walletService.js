import crypto from "crypto";
import sqldb from "../config/sqldatabase.js";
import AppError from "../utils/appError.js";
import {
    countWalletLedgerByWallet,
    findBookingForWalletPayment,
    findDefaultCurrencyId,
    findOrCreateWallet,
    findRentalForWalletPayment,
    findWalletByActor,
    findWalletByIdForUpdate,
    findWithdrawalByIdForUpdate,
    insertPayment,
    insertWalletLedger,
    insertWithdrawalRequest,
    listLedgerEntries,
    listPendingWithdrawals,
    listWalletAccounts,
    listWalletLedgerByWallet,
    listWithdrawalsByWallet,
    markBookingPaidByWallet,
    markRentalPaidByWallet,
    updateWalletBalance,
    updateWithdrawalStatus,
    walletOverview,
} from "../repositories/walletRepository.js";

function toActorType(auth) {
    if (auth.role === "driver") return 1;
    if (auth.role === "owner") return 2;
    if (auth.role === "admin" || auth.role === "dispatcher") return 3;
    return 0;
}

function ensurePositiveAmount(amountInput, field = "amount") {
    const amount = Number(amountInput);
    if (!Number.isFinite(amount) || amount <= 0) {
        throw new AppError(`${field} must be a positive number.`, 422, "INVALID_AMOUNT");
    }
    return Number(amount.toFixed(2));
}

function normalizePagination(query = {}) {
    const page = Math.max(Number(query.page) || 1, 1);
    const limit = Math.min(Math.max(Number(query.limit) || 20, 1), 100);
    return { page, limit, offset: (page - 1) * limit };
}

function generatePaymentCode(prefix = "PAY") {
    const random = crypto.randomBytes(6).toString("hex").toUpperCase();
    return `${prefix}-${Date.now()}-${random}`;
}

async function runInTransaction(work) {
    const connection = await sqldb.getConnection();
    try {
        await connection.beginTransaction();
        const result = await work(connection);
        await connection.commit();
        return result;
    } catch (error) {
        await connection.rollback();
        throw error;
    } finally {
        connection.release();
    }
}

async function ensureMyWallet(auth, conn = null) {
    const actorType = toActorType(auth);
    const actorId = Number(auth.userId);
    const currencyId = await findDefaultCurrencyId();
    return findOrCreateWallet({ actorType, actorId, currencyId }, conn);
}

export async function getMyWallet({ auth }) {
    const wallet = await ensureMyWallet(auth);
    return { wallet };
}

export async function getMyWalletTransactions({ auth, query }) {
    const wallet = await ensureMyWallet(auth);
    const { page, limit, offset } = normalizePagination(query);
    const [items, totalItems] = await Promise.all([
        listWalletLedgerByWallet(wallet.wallet_id, { limit, offset }),
        countWalletLedgerByWallet(wallet.wallet_id),
    ]);
    const totalPages = totalItems === 0 ? 0 : Math.ceil(totalItems / limit);
    return {
        items,
        pagination: {
            page,
            limit,
            totalPages,
            hasNextPage: totalPages > 0 && page < totalPages,
            hasPrevPage: page > 1,
        },
        totalItems,
    };
}

export async function topupMyWallet({ auth, payload }) {
    const amount = ensurePositiveAmount(payload.amount);
    const gatewayName = payload.gateway_name ? String(payload.gateway_name).trim() : "manual";
    return runInTransaction(async (conn) => {
        const wallet = await ensureMyWallet(auth, conn);
        const locked = await findWalletByIdForUpdate(wallet.wallet_id, conn);
        if (!locked || locked.status !== 1) {
            throw new AppError("Wallet is disabled.", 409, "WALLET_DISABLED");
        }
        const nextBalance = Number((locked.balance + amount).toFixed(2));
        const paymentId = await insertPayment(
            {
                payment_code: generatePaymentCode("TOPUP"),
                payer_wallet_id: locked.wallet_id,
                actor_type: locked.actor_type,
                actor_id: locked.actor_id,
                service_domain: 2,
                amount,
                currency_id: locked.currency_id,
                status: "paid",
                gateway_name: gatewayName,
                gateway_transaction_ref: payload.gateway_ref || null,
                description: payload.note || "Wallet top-up",
            },
            conn
        );
        await updateWalletBalance(locked.wallet_id, nextBalance, conn);
        await insertWalletLedger(
            {
                wallet_id: locked.wallet_id,
                payment_id: paymentId,
                amount,
                balance_after: nextBalance,
                direction: "credit",
                entry_type: "topup",
                source_type: "funding",
                source_id: paymentId,
                description: payload.note || "Wallet top-up",
            },
            conn
        );
        return {
            wallet_id: locked.wallet_id,
            amount,
            balance_before: locked.balance,
            balance_after: nextBalance,
            payment_id: paymentId,
        };
    });
}

export async function createWithdrawal({ auth, payload }) {
    const amount = ensurePositiveAmount(payload.amount);
    return runInTransaction(async (conn) => {
        const wallet = await ensureMyWallet(auth, conn);
        const locked = await findWalletByIdForUpdate(wallet.wallet_id, conn);
        if (!locked || locked.status !== 1) {
            throw new AppError("Wallet is disabled.", 409, "WALLET_DISABLED");
        }
        if (locked.balance < amount) {
            throw new AppError("Insufficient wallet balance.", 409, "INSUFFICIENT_WALLET_BALANCE");
        }
        const withdrawalId = await insertWithdrawalRequest(
            { walletId: locked.wallet_id, amount, note: payload.note || null },
            conn
        );
        return {
            withdrawal_id: withdrawalId,
            wallet_id: locked.wallet_id,
            amount,
            status: "pending",
        };
    });
}

export async function getMyWithdrawals({ auth, query }) {
    const wallet = await ensureMyWallet(auth);
    const { page, limit, offset } = normalizePagination(query);
    const items = await listWithdrawalsByWallet(wallet.wallet_id, { limit, offset });
    return {
        items,
        pagination: { page, limit },
    };
}

export async function payBookingByWallet({ auth, bookingId }) {
    if (auth.role !== "passenger") {
        throw new AppError("Only passengers can pay booking from wallet.", 403, "FORBIDDEN");
    }
    const numericBookingId = Number(bookingId);
    if (!Number.isInteger(numericBookingId) || numericBookingId < 1) {
        throw new AppError("Invalid booking id.", 422, "INVALID_BOOKING_ID");
    }

    return runInTransaction(async (conn) => {
        const booking = await findBookingForWalletPayment(numericBookingId, conn);
        if (!booking) throw new AppError("Booking not found.", 404, "BOOKING_NOT_FOUND");
        if (booking.user_id !== Number(auth.userId)) throw new AppError("Forbidden", 403, "FORBIDDEN");
        if (booking.haspaid === 1) throw new AppError("Booking has been paid.", 409, "BOOKING_ALREADY_PAID");

        const amount = ensurePositiveAmount(booking.actual_cost > 0 ? booking.actual_cost : booking.estimated_cost);
        const wallet = await ensureMyWallet(auth, conn);
        const lockedWallet = await findWalletByIdForUpdate(wallet.wallet_id, conn);
        if (lockedWallet.balance < amount) {
            throw new AppError("Insufficient wallet balance.", 409, "INSUFFICIENT_WALLET_BALANCE");
        }

        const nextBalance = Number((lockedWallet.balance - amount).toFixed(2));
        const paymentId = await insertPayment(
            {
                payment_code: generatePaymentCode("BKG"),
                payer_wallet_id: lockedWallet.wallet_id,
                actor_type: 0,
                actor_id: Number(auth.userId),
                service_domain: 0,
                booking_id: numericBookingId,
                amount,
                currency_id: lockedWallet.currency_id,
                status: "paid",
                description: `Wallet payment for booking #${numericBookingId}`,
            },
            conn
        );
        await updateWalletBalance(lockedWallet.wallet_id, nextBalance, conn);
        await insertWalletLedger(
            {
                wallet_id: lockedWallet.wallet_id,
                payment_id: paymentId,
                amount,
                balance_after: nextBalance,
                direction: "debit",
                entry_type: "ride_payment",
                source_type: "ride_booking",
                source_id: numericBookingId,
                description: `Wallet payment for booking #${numericBookingId}`,
            },
            conn
        );
        await markBookingPaidByWallet({ bookingId: numericBookingId, paymentId, amount }, conn);

        return {
            booking_id: numericBookingId,
            payment_id: paymentId,
            amount,
            wallet_balance_after: nextBalance,
        };
    });
}

export async function payRentalByWallet({ auth, rentalId }) {
    if (auth.role !== "passenger") {
        throw new AppError("Only passengers can pay rental from wallet.", 403, "FORBIDDEN");
    }
    const numericRentalId = Number(rentalId);
    if (!Number.isInteger(numericRentalId) || numericRentalId < 1) {
        throw new AppError("Invalid rental id.", 422, "INVALID_RENTAL_ID");
    }
    return runInTransaction(async (conn) => {
        const rental = await findRentalForWalletPayment(numericRentalId, conn);
        if (!rental) throw new AppError("Rental booking not found.", 404, "RENTAL_NOT_FOUND");
        if (rental.user_id !== Number(auth.userId)) throw new AppError("Forbidden", 403, "FORBIDDEN");
        if (rental.payment_status === "paid") throw new AppError("Rental has been paid.", 409, "RENTAL_ALREADY_PAID");
        const amount = ensurePositiveAmount(rental.total_price);
        const wallet = await ensureMyWallet(auth, conn);
        const lockedWallet = await findWalletByIdForUpdate(wallet.wallet_id, conn);
        if (lockedWallet.balance < amount) {
            throw new AppError("Insufficient wallet balance.", 409, "INSUFFICIENT_WALLET_BALANCE");
        }
        const nextBalance = Number((lockedWallet.balance - amount).toFixed(2));
        const paymentId = await insertPayment(
            {
                payment_code: generatePaymentCode("RNT"),
                payer_wallet_id: lockedWallet.wallet_id,
                actor_type: 0,
                actor_id: Number(auth.userId),
                service_domain: 1,
                rental_id: numericRentalId,
                amount,
                currency_id: lockedWallet.currency_id,
                status: "paid",
                description: `Wallet payment for rental #${numericRentalId}`,
            },
            conn
        );
        await updateWalletBalance(lockedWallet.wallet_id, nextBalance, conn);
        await insertWalletLedger(
            {
                wallet_id: lockedWallet.wallet_id,
                payment_id: paymentId,
                amount,
                balance_after: nextBalance,
                direction: "debit",
                entry_type: "rental_payment",
                source_type: "rental_booking",
                source_id: numericRentalId,
                description: `Wallet payment for rental #${numericRentalId}`,
            },
            conn
        );
        await markRentalPaidByWallet({ rentalId: numericRentalId, paymentId }, conn);
        return {
            rental_id: numericRentalId,
            payment_id: paymentId,
            amount,
            wallet_balance_after: nextBalance,
        };
    });
}

export async function adminWalletOverview() {
    const [overview, pendingWithdrawals] = await Promise.all([
        walletOverview(),
        listPendingWithdrawals(),
    ]);
    return { overview, pending_withdrawals: pendingWithdrawals };
}

export async function adminListWalletAccounts({ query }) {
    return listWalletAccounts({
        actorType: query.actor_type === undefined || query.actor_type === "" ? undefined : Number(query.actor_type),
        status: query.status === undefined || query.status === "" ? undefined : Number(query.status),
        search: query.search ? String(query.search).trim() : null,
        page: query.page,
        limit: query.limit,
    });
}

export async function adminListWalletLedger({ query }) {
    return listLedgerEntries({
        actorType: query.actor_type === undefined || query.actor_type === "" ? undefined : Number(query.actor_type),
        actorId: query.actor_id === undefined || query.actor_id === "" ? undefined : Number(query.actor_id),
        direction: query.direction ? String(query.direction).trim() : undefined,
        entryType: query.entry_type ? String(query.entry_type).trim() : undefined,
        page: query.page,
        limit: query.limit,
    });
}

export async function adminAdjustWallet({ payload, auth }) {
    const actorType = Number(payload.actor_type);
    const actorId = Number(payload.actor_id);
    if (!Number.isInteger(actorType) || actorType < 0 || actorType > 3) {
        throw new AppError("actor_type must be between 0 and 3.", 422, "INVALID_ACTOR_TYPE");
    }
    if (!Number.isInteger(actorId) || actorId < 1) {
        throw new AppError("actor_id must be a positive integer.", 422, "INVALID_ACTOR_ID");
    }
    const direction = String(payload.direction || "").trim().toLowerCase();
    if (!["credit", "debit"].includes(direction)) {
        throw new AppError("direction must be credit or debit.", 422, "INVALID_DIRECTION");
    }
    const amount = ensurePositiveAmount(payload.amount);

    return runInTransaction(async (conn) => {
        const currencyId = await findDefaultCurrencyId();
        const wallet = await findOrCreateWallet({ actorType, actorId, currencyId }, conn);
        const locked = await findWalletByIdForUpdate(wallet.wallet_id, conn);
        if (!locked || locked.status !== 1) {
            throw new AppError("Wallet is disabled.", 409, "WALLET_DISABLED");
        }

        let nextBalance = locked.balance;
        if (direction === "credit") {
            nextBalance = Number((locked.balance + amount).toFixed(2));
        } else {
            if (locked.balance < amount) {
                throw new AppError("Insufficient wallet balance for debit adjustment.", 409, "INSUFFICIENT_WALLET_BALANCE");
            }
            nextBalance = Number((locked.balance - amount).toFixed(2));
        }

        const paymentId = await insertPayment(
            {
                payment_code: generatePaymentCode("ADJ"),
                payer_wallet_id: locked.wallet_id,
                actor_type: actorType,
                actor_id: actorId,
                service_domain: 4,
                amount,
                currency_id: locked.currency_id,
                status: "paid",
                description: payload.note || `Manual ${direction} by admin #${auth.userId}`,
            },
            conn
        );

        await updateWalletBalance(locked.wallet_id, nextBalance, conn);
        await insertWalletLedger(
            {
                wallet_id: locked.wallet_id,
                payment_id: paymentId,
                amount,
                balance_after: nextBalance,
                direction,
                entry_type: "manual_adjustment",
                source_type: "manual_adjustment",
                source_id: paymentId,
                description: payload.note || `Manual ${direction} by admin #${auth.userId}`,
            },
            conn
        );

        return {
            wallet_id: locked.wallet_id,
            actor_type: actorType,
            actor_id: actorId,
            direction,
            amount,
            balance_before: locked.balance,
            balance_after: nextBalance,
            payment_id: paymentId,
        };
    });
}

export async function adminProcessWithdrawal({ withdrawalId, payload }) {
    const numericWithdrawalId = Number(withdrawalId);
    if (!Number.isInteger(numericWithdrawalId) || numericWithdrawalId < 1) {
        throw new AppError("Invalid withdrawal id.", 422, "INVALID_WITHDRAWAL_ID");
    }
    const status = String(payload.status || "").trim().toLowerCase();
    if (!["approved", "rejected", "paid", "cancelled"].includes(status)) {
        throw new AppError("status must be one of approved, rejected, paid, cancelled.", 422, "INVALID_WITHDRAWAL_STATUS");
    }

    return runInTransaction(async (conn) => {
        const withdrawal = await findWithdrawalByIdForUpdate(numericWithdrawalId, conn);
        if (!withdrawal) {
            throw new AppError("Withdrawal not found.", 404, "WITHDRAWAL_NOT_FOUND");
        }
        if (withdrawal.status !== "pending" && withdrawal.status !== "approved") {
            throw new AppError("Withdrawal is already finalized.", 409, "WITHDRAWAL_FINALIZED");
        }

        if (status === "paid") {
            const wallet = await findWalletByIdForUpdate(withdrawal.wallet_id, conn);
            if (!wallet) throw new AppError("Wallet not found.", 404, "WALLET_NOT_FOUND");
            if (wallet.balance < withdrawal.amount) {
                throw new AppError("Insufficient wallet balance to settle withdrawal.", 409, "INSUFFICIENT_WALLET_BALANCE");
            }
            const nextBalance = Number((wallet.balance - withdrawal.amount).toFixed(2));
            await updateWalletBalance(wallet.wallet_id, nextBalance, conn);
            await insertWalletLedger(
                {
                    wallet_id: wallet.wallet_id,
                    payment_id: null,
                    amount: withdrawal.amount,
                    balance_after: nextBalance,
                    direction: "debit",
                    entry_type: "withdrawal",
                    source_type: "withdrawal",
                    source_id: withdrawal.withdrawal_id,
                    description: `Withdrawal paid #${withdrawal.withdrawal_id}`,
                },
                conn
            );
        }

        await updateWithdrawalStatus(
            {
                withdrawalId: numericWithdrawalId,
                status,
                note: payload.note || withdrawal.note || null,
            },
            conn
        );

        return {
            withdrawal_id: numericWithdrawalId,
            status,
        };
    });
}
