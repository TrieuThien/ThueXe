import crypto from "crypto";
import sqldb from "../../config/sqldatabase.js";
import AppError from "../../utils/appError.js";
import { createMomoPayment } from "../payment/momoService.js";
import {
    countWalletTransactionsByWallet,
    countWithdrawalsByWallet,
    createCustomerWallet,
    createWalletForActor,
    findBookingForCustomerPayment,
    findCustomerWallet,
    findCustomerWalletForUpdate,
    findDefaultCurrency,
    findPaymentByIdForUpdate,
    findPaymentByIdForUser,
    findRentalForCustomerPayment,
    findRentalForDepositPayment,
    findUserBankAccount,
    findWalletByActorForUpdate,
    insertGatewayLog,
    insertPayment,
    insertWalletLedger,
    insertWithdrawalRequest,
    listWalletTransactionsByWallet,
    listWithdrawalsByWallet,
    markBookingPaid,
    markRentalDepositPaid,
    markRentalPaid,
    updatePaymentGatewayRef,
    updatePaymentStatus,
    updateWalletBalance,
} from "../../repositories/customer/walletRepository.js";
import { emitPaymentUpdated, emitWalletUpdated } from "./realtimeService.js";

const ENTRY_TYPES = new Set([
    "topup",
    "ride_payment",
    "rental_payment",
    "withdrawal",
    "refund",
    "commission",
    "manual_adjustment",
]);

function assertCustomer(auth) {
    const userId = Number(auth?.userId || 0);
    const isPassengerRole = auth?.role === "passenger";
    if (!userId || (!isPassengerRole && Number(auth?.userType) !== 0)) {
        throw new AppError("Forbidden", 403, "FORBIDDEN");
    }
    return userId;
}

function round2(value) {
    return Number(Number(value || 0).toFixed(2));
}

function ensurePositiveAmount(value, field = "amount") {
    const amount = Number(value);
    if (!Number.isFinite(amount) || amount <= 0) {
        throw new AppError(`${field} must be a positive number.`, 422, "INVALID_AMOUNT");
    }
    return round2(amount);
}

function normalizePagination(query = {}) {
    const page = Math.max(Number(query.page || 1), 1);
    const limit = Math.min(Math.max(Number(query.limit || 20), 1), 100);
    return { page, limit, offset: (page - 1) * limit };
}

function paymentCode(prefix = "PAY") {
    return `${prefix}-${Date.now()}-${crypto.randomBytes(4).toString("hex").toUpperCase()}`;
}

function gatewayTransactionRef() {
    return crypto.randomBytes(8).toString("hex").toUpperCase();
}

function shortTransactionRef() {
    return crypto.randomBytes(7).toString("hex").toUpperCase().slice(0, 15);
}

function resolveGatewayStatus(value) {
    const status = String(value || "").trim().toLowerCase();
    if (["paid", "success", "succeeded", "ok", "authorized"].includes(status)) return "paid";
    if (["failed", "fail", "error"].includes(status)) return "failed";
    if (["cancelled", "canceled"].includes(status)) return "cancelled";
    if (["refunded"].includes(status)) return "refunded";
    return "pending";
}

function mapServiceDomainToGatewayServiceType(serviceDomain) {
    if (Number(serviceDomain) === 1) return 1;
    return 0;
}

function getRedirectUrl(paymentId, gatewayName) {
    const base = process.env.PAYMENT_GATEWAY_REDIRECT_BASE || "https://pay.local/checkout";
    const query = new URLSearchParams({ payment_id: String(paymentId), gateway: String(gatewayName || "mock") });
    return `${base}?${query.toString()}`;
}

async function runInTransaction(work) {
    const conn = await sqldb.getConnection();
    try {
        await conn.beginTransaction();
        const result = await work(conn);
        await conn.commit();
        return result;
    } catch (error) {
        await conn.rollback();
        throw error;
    } finally {
        conn.release();
    }
}

async function ensureWalletForCustomer(userId, conn = null, forUpdate = false) {
    let wallet = forUpdate
        ? await findCustomerWalletForUpdate(userId, conn)
        : await findCustomerWallet(userId, conn);

    if (!wallet) {
        const currency = await findDefaultCurrency(conn);
        await createCustomerWallet({ userId, currencyId: Number(currency.id) }, conn);
        wallet = forUpdate
            ? await findCustomerWalletForUpdate(userId, conn)
            : await findCustomerWallet(userId, conn);
    }

    if (!wallet) throw new AppError("Failed to initialize wallet.", 500, "WALLET_INIT_FAILED");
    if (Number(wallet.status || 0) !== 1) throw new AppError("Wallet is disabled.", 409, "WALLET_DISABLED");

    return wallet;
}

async function applySuccessfulPaymentSideEffects(paymentRow, conn) {
    const serviceDomain = Number(paymentRow.service_domain);

    if (serviceDomain === 2) {
        const wallet = await ensureWalletForCustomer(Number(paymentRow.actor_id), conn, true);
        const nextBalance = round2(Number(wallet.balance || 0) + Number(paymentRow.amount || 0));

        await updateWalletBalance(Number(wallet.wallet_id), nextBalance, conn);
        await insertWalletLedger(
            {
                wallet_id: Number(wallet.wallet_id),
                payment_id: Number(paymentRow.payment_id),
                amount: Number(paymentRow.amount || 0),
                balance_after: nextBalance,
                direction: "credit",
                entry_type: "topup",
                source_type: "gateway_payment",
                source_id: Number(paymentRow.payment_id),
                description: `Wallet topup via ${paymentRow.gateway_name || "gateway"}`,
            },
            conn
        );

        return { wallet_balance_after: nextBalance };
    }

    if (serviceDomain === 0 && paymentRow.booking_id) {
        await markBookingPaid(
            {
                bookingId: Number(paymentRow.booking_id),
                paymentId: Number(paymentRow.payment_id),
                paymentType: 3,
                amount: Number(paymentRow.amount || 0),
            },
            conn
        );
        return { booking_paid: true };
    }

    if (serviceDomain === 1 && paymentRow.rental_id) {
        await markRentalPaid(
            {
                rentalId: Number(paymentRow.rental_id),
                paymentId: Number(paymentRow.payment_id),
                paymentType: 3,
            },
            conn
        );
        return { rental_paid: true };
    }

    return {};
}

async function confirmPaymentWithGateway({ payment, callbackData, conn }) {
    const normalizedGatewayStatus = resolveGatewayStatus(callbackData?.status || callbackData?.gateway_status);
    const pgatewayStatus =
        normalizedGatewayStatus === "paid"
            ? "SUCCESS"
            : normalizedGatewayStatus === "failed"
                ? "FAILED"
                : normalizedGatewayStatus === "cancelled"
                    ? "ABANDONED"
                    : "PENDING";

    await insertGatewayLog(
        {
            p_transaction_ref: callbackData?.p_transaction_ref || callbackData?.gateway_transaction_ref || null,
            transaction_ref: shortTransactionRef(),
            access_code: callbackData?.access_code || null,
            status: pgatewayStatus,
            gateway_resp: callbackData?.gateway_resp || callbackData?.message || null,
            amount: Number(payment.amount || 0),
            gateway: payment.gateway_name || callbackData?.gateway_name || "mock",
            cur: callbackData?.currency || null,
            user_type: 0,
            service_type: mapServiceDomainToGatewayServiceType(payment.service_domain),
            user_id: Number(payment.actor_id),
            rental_id: payment.rental_id ? Number(payment.rental_id) : null,
            memo: callbackData ? JSON.stringify(callbackData).slice(0, 2000) : null,
        },
        conn
    );

    if (callbackData?.gateway_transaction_ref) {
        await updatePaymentGatewayRef(Number(payment.payment_id), String(callbackData.gateway_transaction_ref), conn);
    }

    return normalizedGatewayStatus;
}

export async function getWallet(auth) {
    const userId = assertCustomer(auth);
    const wallet = await ensureWalletForCustomer(userId);

    return {
        wallet: {
            wallet_id: Number(wallet.wallet_id),
            balance: Number(wallet.balance || 0),
            currency: {
                currency_id: Number(wallet.currency_id),
                code: wallet.currency_code || null,
                symbol: wallet.currency_symbol || null,
            },
        },
    };
}

export async function getWalletTransactions(auth, query = {}) {
    const userId = assertCustomer(auth);
    const wallet = await ensureWalletForCustomer(userId);

    const entryType = query.entry_type ? String(query.entry_type).trim() : null;
    if (entryType && !ENTRY_TYPES.has(entryType)) {
        throw new AppError("entry_type is invalid.", 422, "INVALID_ENTRY_TYPE");
    }

    const { page, limit, offset } = normalizePagination(query);

    const [items, totalItems] = await Promise.all([
        listWalletTransactionsByWallet(Number(wallet.wallet_id), { entryType, limit, offset }),
        countWalletTransactionsByWallet(Number(wallet.wallet_id), { entryType }),
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
        filters: { entry_type: entryType },
    };
}

export async function createWalletTopupPayment(auth, payload) {
    const userId = assertCustomer(auth);
    const amount = ensurePositiveAmount(payload.amount);
    const gatewayName = String(payload.gateway_name || "mock").trim();

    return runInTransaction(async (conn) => {
        const wallet = await ensureWalletForCustomer(userId, conn, true);

        const thePaymentCode = paymentCode("TOPUP");
        const paymentId = await insertPayment(
            {
                payment_code: thePaymentCode,
                payer_wallet_id: Number(wallet.wallet_id),
                actor_type: 0,
                actor_id: userId,
                service_domain: 2,
                amount,
                currency_id: Number(wallet.currency_id),
                status: "pending",
                gateway_name: gatewayName,
                gateway_transaction_ref: null,
                description: "Customer wallet topup",
            },
            conn
        );

        if (gatewayName === "momo") {
            const momoResult = await createMomoPayment({
                paymentCode: thePaymentCode,
                amount,
                orderInfo: "Nạp tiền ví ThueXe",
                ipnUrl: process.env.MOMO_IPN_URL,
                redirectUrl: process.env.MOMO_REDIRECT_URL,
            });
            return {
                payment_id: paymentId,
                payment_status: "pending",
                amount,
                gateway_name: "momo",
                redirect_url: momoResult.payUrl,
                payer_wallet_id: Number(wallet.wallet_id),
            };
        }

        if (gatewayName === "sepay") {
            const relayUrl = `${process.env.SERVER_BASE_URL || "http://localhost:8000"}/api/customer/payments/checkout/sepay?code=${thePaymentCode}`;
            return {
                payment_id: paymentId,
                payment_status: "pending",
                amount,
                gateway_name: "sepay",
                redirect_url: relayUrl,
                payer_wallet_id: Number(wallet.wallet_id),
            };
        }

        return {
            payment_id: paymentId,
            payment_status: "pending",
            amount,
            gateway_name: gatewayName,
            redirect_url: getRedirectUrl(paymentId, gatewayName),
            payer_wallet_id: Number(wallet.wallet_id),
        };
    });
}

export async function confirmWalletTopup(auth, payload) {
    const userId = assertCustomer(auth);
    const paymentId = Number(payload.payment_id);

    if (!Number.isInteger(paymentId) || paymentId < 1) {
        throw new AppError("payment_id is invalid.", 422, "INVALID_PAYMENT_ID");
    }

    return runInTransaction(async (conn) => {
        const payment = await findPaymentByIdForUpdate(paymentId, conn);
        if (!payment || Number(payment.actor_type) !== 0 || Number(payment.actor_id) !== userId) {
            throw new AppError("Payment not found.", 404, "PAYMENT_NOT_FOUND");
        }
        if (Number(payment.service_domain) !== 2) {
            throw new AppError("Payment is not a wallet topup payment.", 409, "PAYMENT_DOMAIN_MISMATCH");
        }

        const gatewayStatus = await confirmPaymentWithGateway({
            payment,
            callbackData: payload.callback_data || payload,
            conn,
        });

        const prevStatus = String(payment.status || "").toLowerCase();
        const targetStatus = gatewayStatus;

        if (prevStatus !== targetStatus) {
            await updatePaymentStatus(paymentId, targetStatus, conn);
        }

        let sideEffects = {};
        if (targetStatus === "paid" && prevStatus !== "paid") {
            sideEffects = await applySuccessfulPaymentSideEffects({ ...payment, status: targetStatus }, conn);
        }

        if (targetStatus === "paid") {
            const refreshedWallet = await findCustomerWallet(userId, conn);
            if (refreshedWallet) {
                await emitWalletUpdated({
                    walletId: Number(refreshedWallet.wallet_id),
                    balance: Number(refreshedWallet.balance || 0),
                    userId,
                });
            }
        }

        await emitPaymentUpdated({
            paymentId,
            status: targetStatus,
            userId,
        });

        return {
            payment_id: paymentId,
            status: targetStatus,
            ...sideEffects,
            realtime: {
                channel: "payment.updated",
                payload: { payment_id: paymentId, status: targetStatus },
            },
        };
    });
}

export async function createWithdrawal(auth, payload) {
    const userId = assertCustomer(auth);
    const amount = ensurePositiveAmount(payload.amount);
    const bankAccountId = Number(payload.bank_account_id);

    if (!Number.isInteger(bankAccountId) || bankAccountId < 1) {
        throw new AppError("bank_account_id is invalid.", 422, "INVALID_BANK_ACCOUNT_ID");
    }

    const result = await runInTransaction(async (conn) => {
        const wallet = await ensureWalletForCustomer(userId, conn, true);
        const bankAccount = await findUserBankAccount(bankAccountId, userId, conn);
        if (!bankAccount) {
            throw new AppError("Bank account not found.", 404, "BANK_ACCOUNT_NOT_FOUND");
        }

        if (Number(wallet.balance || 0) < amount) {
            throw new AppError("Insufficient wallet balance.", 402, "INSUFFICIENT_WALLET_BALANCE");
        }

        const nextBalance = round2(Number(wallet.balance || 0) - amount);
        await updateWalletBalance(Number(wallet.wallet_id), nextBalance, conn);

        const note = JSON.stringify({
            bank_account_id: Number(bankAccount.bank_account_id),
            bank_name: bankAccount.bank_name,
            bank_account_number: bankAccount.bank_account_number,
            memo: payload.note || null,
        }).slice(0, 255);

        const withdrawalId = await insertWithdrawalRequest(
            {
                walletId: Number(wallet.wallet_id),
                amount,
                note,
            },
            conn
        );

        await insertWalletLedger(
            {
                wallet_id: Number(wallet.wallet_id),
                payment_id: null,
                amount,
                balance_after: nextBalance,
                direction: "debit",
                entry_type: "withdrawal",
                source_type: "withdrawal",
                source_id: withdrawalId,
                description: `Withdrawal request #${withdrawalId}`,
            },
            conn
        );

        return {
            withdrawal_id: withdrawalId,
            amount,
            status: "pending",
            wallet_balance_after: nextBalance,
            wallet_id: Number(wallet.wallet_id),
            bank_account_id: Number(bankAccount.bank_account_id),
        };
    });

    await emitWalletUpdated({
        walletId: Number(result.wallet_id),
        balance: Number(result.wallet_balance_after),
        userId,
    });

    return result;
}

export async function getWithdrawals(auth, query = {}) {
    const userId = assertCustomer(auth);
    const wallet = await ensureWalletForCustomer(userId);

    const { page, limit, offset } = normalizePagination(query);
    const [items, totalItems] = await Promise.all([
        listWithdrawalsByWallet(Number(wallet.wallet_id), { limit, offset }),
        countWithdrawalsByWallet(Number(wallet.wallet_id)),
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

export async function getPaymentDetail(auth, paymentIdInput) {
    const userId = assertCustomer(auth);
    const paymentId = Number(paymentIdInput);
    if (!Number.isInteger(paymentId) || paymentId < 1) {
        throw new AppError("paymentId is invalid.", 422, "INVALID_PAYMENT_ID");
    }

    const payment = await findPaymentByIdForUser(paymentId, userId);
    if (!payment) throw new AppError("Payment not found.", 404, "PAYMENT_NOT_FOUND");

    return { payment };
}

export async function payRideBooking(auth, bookingIdInput, payload) {
    const userId = assertCustomer(auth);
    const bookingId = Number(bookingIdInput);
    const paymentType = Number(payload.payment_type);

    if (!Number.isInteger(bookingId) || bookingId < 1) {
        throw new AppError("bookingId is invalid.", 422, "INVALID_BOOKING_ID");
    }
    if (![1, 2, 3, 4].includes(paymentType)) {
        throw new AppError("payment_type is invalid.", 422, "INVALID_PAYMENT_TYPE");
    }

    return runInTransaction(async (conn) => {
        const booking = await findBookingForCustomerPayment(bookingId, userId, conn, true);
        if (!booking) throw new AppError("Booking not found.", 404, "BOOKING_NOT_FOUND");
        if (Number(booking.haspaid || 0) === 1) {
            throw new AppError("Booking already paid.", 409, "BOOKING_ALREADY_PAID");
        }

        const amount = ensurePositiveAmount(
            Number(booking.actual_cost || 0) > 0 ? booking.actual_cost : booking.estimated_cost
        );

        const wallet = await ensureWalletForCustomer(userId, conn, true);

        if (paymentType === 2) {
            if (Number(wallet.balance || 0) < amount) {
                throw new AppError("Insufficient wallet balance.", 402, "INSUFFICIENT_WALLET_BALANCE");
            }

            const paymentId = await insertPayment(
                {
                    payment_code: paymentCode("RIDE"),
                    payer_wallet_id: Number(wallet.wallet_id),
                    actor_type: 0,
                    actor_id: userId,
                    service_domain: 0,
                    booking_id: bookingId,
                    amount,
                    currency_id: Number(wallet.currency_id),
                    status: "paid",
                    gateway_name: null,
                    gateway_transaction_ref: null,
                    description: `Ride payment for booking #${bookingId}`,
                },
                conn
            );

            const nextBalance = round2(Number(wallet.balance || 0) - amount);
            await updateWalletBalance(Number(wallet.wallet_id), nextBalance, conn);

            await insertWalletLedger(
                {
                    wallet_id: Number(wallet.wallet_id),
                    payment_id: paymentId,
                    amount,
                    balance_after: nextBalance,
                    direction: "debit",
                    entry_type: "ride_payment",
                    source_type: "ride_booking",
                    source_id: bookingId,
                    description: `Ride payment for booking #${bookingId}`,
                },
                conn
            );

            await markBookingPaid({ bookingId, paymentId, paymentType, amount }, conn);

            await emitWalletUpdated({
                walletId: Number(wallet.wallet_id),
                balance: nextBalance,
                userId,
            });
            await emitPaymentUpdated({
                paymentId,
                status: "paid",
                userId,
            });

            return {
                payment_id: paymentId,
                booking_id: bookingId,
                status: "paid",
                amount,
                wallet_balance_after: nextBalance,
                realtime: {
                    channel: "payment.updated",
                    payload: { payment_id: paymentId, status: "paid" },
                },
            };
        }

        const gatewayName = String(payload.gateway_name || "mock").trim();
        const thePaymentCode = paymentCode("RIDE");
        const paymentId = await insertPayment(
            {
                payment_code: thePaymentCode,
                payer_wallet_id: Number(wallet.wallet_id),
                actor_type: 0,
                actor_id: userId,
                service_domain: 0,
                booking_id: bookingId,
                amount,
                currency_id: Number(wallet.currency_id),
                status: "pending",
                gateway_name: gatewayName,
                gateway_transaction_ref: null,
                description: `Ride gateway payment for booking #${bookingId}`,
            },
            conn
        );

        if (gatewayName === "momo") {
            const momoResult = await createMomoPayment({
                paymentCode: thePaymentCode,
                amount,
                orderInfo: `Thanh toán chuyến đi #${bookingId}`,
                ipnUrl: process.env.MOMO_IPN_URL,
                redirectUrl: process.env.MOMO_REDIRECT_URL,
            });
            return {
                payment_id: paymentId,
                booking_id: bookingId,
                status: "pending",
                amount,
                redirect_url: momoResult.payUrl,
            };
        }

        if (gatewayName === "sepay") {
            const relayUrl = `${process.env.SERVER_BASE_URL || "http://localhost:8000"}/api/customer/payments/checkout/sepay?code=${thePaymentCode}`;
            return {
                payment_id: paymentId,
                booking_id: bookingId,
                status: "pending",
                amount,
                redirect_url: relayUrl,
            };
        }

        return {
            payment_id: paymentId,
            booking_id: bookingId,
            status: "pending",
            amount,
            redirect_url: getRedirectUrl(paymentId, gatewayName),
        };
    });
}

export async function payRentalBooking(auth, rentalIdInput, payload) {
    const userId = assertCustomer(auth);
    const rentalId = Number(rentalIdInput);
    const paymentType = Number(payload.payment_type);

    if (!Number.isInteger(rentalId) || rentalId < 1) {
        throw new AppError("rentalId is invalid.", 422, "INVALID_RENTAL_ID");
    }
    if (![1, 2, 3, 4].includes(paymentType)) {
        throw new AppError("payment_type is invalid.", 422, "INVALID_PAYMENT_TYPE");
    }

    return runInTransaction(async (conn) => {
        const rental = await findRentalForCustomerPayment(rentalId, userId, conn, true);
        if (!rental) throw new AppError("Rental not found.", 404, "RENTAL_NOT_FOUND");
        if (String(rental.payment_status || "").toLowerCase() === "paid") {
            throw new AppError("Rental already paid.", 409, "RENTAL_ALREADY_PAID");
        }

        const amount = ensurePositiveAmount(rental.total_price);
        const wallet = await ensureWalletForCustomer(userId, conn, true);

        if (paymentType === 2) {
            if (Number(wallet.balance || 0) < amount) {
                throw new AppError("Insufficient wallet balance.", 402, "INSUFFICIENT_WALLET_BALANCE");
            }

            const paymentId = await insertPayment(
                {
                    payment_code: paymentCode("RNT"),
                    payer_wallet_id: Number(wallet.wallet_id),
                    actor_type: 0,
                    actor_id: userId,
                    service_domain: 1,
                    rental_id: rentalId,
                    amount,
                    currency_id: Number(wallet.currency_id),
                    status: "paid",
                    gateway_name: null,
                    gateway_transaction_ref: null,
                    description: `Rental payment for rental #${rentalId}`,
                },
                conn
            );

            const nextBalance = round2(Number(wallet.balance || 0) - amount);
            await updateWalletBalance(Number(wallet.wallet_id), nextBalance, conn);

            await insertWalletLedger(
                {
                    wallet_id: Number(wallet.wallet_id),
                    payment_id: paymentId,
                    amount,
                    balance_after: nextBalance,
                    direction: "debit",
                    entry_type: "rental_payment",
                    source_type: "rental_booking",
                    source_id: rentalId,
                    description: `Rental payment for rental #${rentalId}`,
                },
                conn
            );

            await markRentalPaid({ rentalId, paymentId, paymentType }, conn);

            await emitWalletUpdated({
                walletId: Number(wallet.wallet_id),
                balance: nextBalance,
                userId,
            });
            await emitPaymentUpdated({
                paymentId,
                status: "paid",
                userId,
            });

            return {
                payment_id: paymentId,
                rental_id: rentalId,
                status: "paid",
                amount,
                wallet_balance_after: nextBalance,
                realtime: {
                    channel: "payment.updated",
                    payload: { payment_id: paymentId, status: "paid" },
                },
            };
        }

        const gatewayName = String(payload.gateway_name || "mock").trim();
        const thePaymentCode = paymentCode("RNT");
        const paymentId = await insertPayment(
            {
                payment_code: thePaymentCode,
                payer_wallet_id: Number(wallet.wallet_id),
                actor_type: 0,
                actor_id: userId,
                service_domain: 1,
                rental_id: rentalId,
                amount,
                currency_id: Number(wallet.currency_id),
                status: "pending",
                gateway_name: gatewayName,
                gateway_transaction_ref: null,
                description: `Rental gateway payment for rental #${rentalId}`,
            },
            conn
        );

        if (gatewayName === "momo") {
            const momoResult = await createMomoPayment({
                paymentCode: thePaymentCode,
                amount,
                orderInfo: `Thanh toán thuê xe #${rentalId}`,
                ipnUrl: process.env.MOMO_IPN_URL,
                redirectUrl: process.env.MOMO_REDIRECT_URL,
            });
            return {
                payment_id: paymentId,
                rental_id: rentalId,
                status: "pending",
                amount,
                redirect_url: momoResult.payUrl,
            };
        }

        if (gatewayName === "sepay") {
            const relayUrl = `${process.env.SERVER_BASE_URL || "http://localhost:8000"}/api/customer/payments/checkout/sepay?code=${thePaymentCode}`;
            return {
                payment_id: paymentId,
                rental_id: rentalId,
                status: "pending",
                amount,
                redirect_url: relayUrl,
            };
        }

        return {
            payment_id: paymentId,
            rental_id: rentalId,
            status: "pending",
            amount,
            redirect_url: getRedirectUrl(paymentId, gatewayName),
        };
    });
}

export async function payRentalDeposit(auth, rentalIdInput) {
    const userId = assertCustomer(auth);
    const rentalId = Number(rentalIdInput);

    if (!Number.isInteger(rentalId) || rentalId < 1) {
        throw new AppError("rentalId is invalid.", 422, "INVALID_RENTAL_ID");
    }

    const result = await runInTransaction(async (conn) => {
        const rental = await findRentalForDepositPayment(rentalId, userId, conn, true);
        if (!rental) throw new AppError("Rental not found.", 404, "RENTAL_NOT_FOUND");

        const depositAmount = round2(Number(rental.deposit_amount || 0));
        const paymentStatus = String(rental.payment_status || "").toLowerCase();

        if (paymentStatus === "deposit_paid" || paymentStatus === "paid") {
            throw new AppError("Deposit already paid.", 409, "DEPOSIT_ALREADY_PAID");
        }

        if (depositAmount <= 0) {
            await markRentalDepositPaid({ rentalId }, conn);
            return { rental_id: rentalId, status: "deposit_paid", amount: 0, skipped: true };
        }

        const customerWallet = await ensureWalletForCustomer(userId, conn, true);

        if (Number(customerWallet.balance || 0) < depositAmount) {
            throw new AppError(
                "Số dư ví không đủ để thanh toán tiền cọc.",
                402,
                "INSUFFICIENT_WALLET_BALANCE"
            );
        }

        // Find or create owner wallet (actor_type = 2 for vehicle_owners)
        let ownerWallet = null;
        if (rental.owner_id) {
            ownerWallet = await findWalletByActorForUpdate(2, rental.owner_id, conn);
            if (!ownerWallet) {
                const currency = await findDefaultCurrency(conn);
                await createWalletForActor({ actorType: 2, actorId: rental.owner_id, currencyId: Number(currency.id) }, conn);
                ownerWallet = await findWalletByActorForUpdate(2, rental.owner_id, conn);
            }
        }

        const paymentId = await insertPayment(
            {
                payment_code: paymentCode("DEP"),
                payer_wallet_id: Number(customerWallet.wallet_id),
                actor_type: 0,
                actor_id: userId,
                service_domain: 1,
                rental_id: rentalId,
                amount: depositAmount,
                currency_id: Number(customerWallet.currency_id),
                status: "paid",
                gateway_name: null,
                gateway_transaction_ref: null,
                description: `Deposit payment for rental #${rentalId}`,
            },
            conn
        );

        const customerNextBalance = round2(Number(customerWallet.balance || 0) - depositAmount);
        await updateWalletBalance(Number(customerWallet.wallet_id), customerNextBalance, conn);

        await insertWalletLedger(
            {
                wallet_id: Number(customerWallet.wallet_id),
                payment_id: paymentId,
                amount: depositAmount,
                balance_after: customerNextBalance,
                direction: "debit",
                entry_type: "rental_payment",
                source_type: "rental_booking",
                source_id: rentalId,
                description: `Tiền cọc thuê xe #${rentalId}`,
            },
            conn
        );

        if (ownerWallet) {
            const ownerNextBalance = round2(Number(ownerWallet.balance || 0) + depositAmount);
            await updateWalletBalance(Number(ownerWallet.wallet_id), ownerNextBalance, conn);
            await insertWalletLedger(
                {
                    wallet_id: Number(ownerWallet.wallet_id),
                    payment_id: paymentId,
                    amount: depositAmount,
                    balance_after: ownerNextBalance,
                    direction: "credit",
                    entry_type: "rental_payment",
                    source_type: "rental_booking",
                    source_id: rentalId,
                    description: `Nhận tiền cọc thuê xe #${rentalId}`,
                },
                conn
            );
        }

        await markRentalDepositPaid({ rentalId }, conn);

        return {
            payment_id: paymentId,
            rental_id: rentalId,
            status: "deposit_paid",
            amount: depositAmount,
            wallet_balance_after: customerNextBalance,
            wallet_id: Number(customerWallet.wallet_id),
        };
    });

    if (!result.skipped) {
        await emitWalletUpdated({
            walletId: result.wallet_id,
            balance: result.wallet_balance_after,
            userId,
        });
        await emitPaymentUpdated({
            paymentId: result.payment_id,
            status: "paid",
            userId,
        });
    }

    return {
        payment_id: result.payment_id ?? null,
        rental_id: result.rental_id,
        status: result.status,
        amount: result.amount,
        wallet_balance_after: result.wallet_balance_after ?? null,
        realtime: {
            channel: "payment.updated",
            payload: { rental_id: result.rental_id, status: result.status },
        },
    };
}

export async function retryPayment(auth, paymentIdInput) {
    const userId = assertCustomer(auth);
    const paymentId = Number(paymentIdInput);

    if (!Number.isInteger(paymentId) || paymentId < 1) {
        throw new AppError("paymentId is invalid.", 422, "INVALID_PAYMENT_ID");
    }

    return runInTransaction(async (conn) => {
        const payment = await findPaymentByIdForUpdate(paymentId, conn);
        if (!payment || Number(payment.actor_type) !== 0 || Number(payment.actor_id) !== userId) {
            throw new AppError("Payment not found.", 404, "PAYMENT_NOT_FOUND");
        }

        const currentStatus = String(payment.status || "").toLowerCase();
        if (!["failed", "cancelled", "pending"].includes(currentStatus)) {
            throw new AppError("Payment cannot be retried in current status.", 409, "PAYMENT_RETRY_NOT_ALLOWED");
        }

        const newPaymentId = await insertPayment(
            {
                payment_code: paymentCode("RETRY"),
                payer_wallet_id: payment.payer_wallet_id ? Number(payment.payer_wallet_id) : null,
                actor_type: 0,
                actor_id: userId,
                service_domain: Number(payment.service_domain),
                booking_id: payment.booking_id ? Number(payment.booking_id) : null,
                rental_id: payment.rental_id ? Number(payment.rental_id) : null,
                amount: Number(payment.amount || 0),
                currency_id: Number(payment.currency_id),
                status: "pending",
                gateway_name: payment.gateway_name || "mock",
                gateway_transaction_ref: null,
                description: `Retry from payment #${paymentId}`,
            },
            conn
        );

        return {
            previous_payment_id: paymentId,
            payment_id: newPaymentId,
            status: "pending",
            redirect_url: getRedirectUrl(newPaymentId, payment.gateway_name || "mock"),
        };
    });
}

export async function webhookConfirmPayment(payload) {
    const paymentId = Number(payload.payment_id);
    if (!Number.isInteger(paymentId) || paymentId < 1) {
        throw new AppError("payment_id is invalid.", 422, "INVALID_PAYMENT_ID");
    }

    return runInTransaction(async (conn) => {
        const payment = await findPaymentByIdForUpdate(paymentId, conn);
        if (!payment) throw new AppError("Payment not found.", 404, "PAYMENT_NOT_FOUND");

        const gatewayStatus = await confirmPaymentWithGateway({
            payment,
            callbackData: payload,
            conn,
        });

        const prevStatus = String(payment.status || "").toLowerCase();
        if (prevStatus !== gatewayStatus) {
            await updatePaymentStatus(paymentId, gatewayStatus, conn);
        }

        let sideEffects = {};
        if (gatewayStatus === "paid" && prevStatus !== "paid") {
            sideEffects = await applySuccessfulPaymentSideEffects({ ...payment, status: gatewayStatus }, conn);
        }

        await emitPaymentUpdated({
            paymentId,
            status: gatewayStatus,
            userId: Number(payment.actor_id),
        });
        if (gatewayStatus === "paid" && Number(payment.service_domain) === 2) {
            const refreshedWallet = await findCustomerWallet(Number(payment.actor_id), conn);
            if (refreshedWallet) {
                await emitWalletUpdated({
                    walletId: Number(refreshedWallet.wallet_id),
                    balance: Number(refreshedWallet.balance || 0),
                    userId: Number(payment.actor_id),
                });
            }
        }

        return {
            payment_id: paymentId,
            status: gatewayStatus,
            ...sideEffects,
            realtime: {
                channel: "payment.updated",
                payload: { payment_id: paymentId, status: gatewayStatus },
            },
        };
    });
}
