import crypto from "crypto";
import sqldb from "../config/sqldatabase.js";
import AppError from "../utils/appError.js";
import { emitToUser, emitToDriver } from "../socket/index.js";
import {
    findOrCreateWallet,
    findDefaultCurrencyId,
    findWalletByIdForUpdate,
    updateWalletBalance,
    insertWalletLedger,
    insertPayment,
} from "../repositories/walletRepository.js";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function generatePaymentCode(prefix = "PAY") {
    return `${prefix}-${Date.now()}-${crypto.randomBytes(4).toString("hex").toUpperCase()}`;
}

function round2(v) {
    return Number(Number(v || 0).toFixed(2));
}

/**
 * Update rental_bookings.payment_status (and optionally transaction_id).
 * Allowed enum values: 'pending', 'deposit_paid', 'paid'
 */
async function updateRentalPaymentStatus(rentalId, status, transactionId, db) {
    const query = transactionId
        ? `UPDATE rental_bookings SET payment_status = ?, transaction_id = ?, updated_at = NOW() WHERE rental_id = ? LIMIT 1`
        : `UPDATE rental_bookings SET payment_status = ?, updated_at = NOW() WHERE rental_id = ? LIMIT 1`;
    const params = transactionId ? [status, transactionId, rentalId] : [status, rentalId];
    await db.query(query, params);
}

/**
 * Credit driver wallet with their earned commission from a rental.
 * entry_type = 'commission', source_type = 'rental_booking' (valid enum values).
 */
async function creditDriverEarnings(driverId, amount, rentalId, db) {
    const currencyId = await findDefaultCurrencyId(db);
    const driverWallet = await findOrCreateWallet({ actorType: 1, actorId: driverId, currencyId }, db);
    const locked = await findWalletByIdForUpdate(driverWallet.wallet_id, db);
    const nextBalance = round2(Number(locked.balance) + amount);

    const paymentId = await insertPayment({
        payment_code:    generatePaymentCode("DRV"),
        payer_wallet_id: locked.wallet_id,
        actor_type:      1,
        actor_id:        driverId,
        service_domain:  1,
        rental_id:       rentalId,
        amount,
        currency_id:     locked.currency_id,
        status:          "paid",
        description:     `Driver earning from rental #${rentalId}`,
    }, db);

    await updateWalletBalance(locked.wallet_id, nextBalance, db);
    await insertWalletLedger({
        wallet_id:     locked.wallet_id,
        payment_id:    paymentId,
        amount,
        balance_after: nextBalance,
        direction:     "credit",
        entry_type:    "commission",       // ✅ valid enum value
        source_type:   "rental_booking",   // ✅ valid enum value
        source_id:     rentalId,
        description:   `Driver earning from rental #${rentalId}`,
    }, db);
}

/**
 * Deduct platform commission fee from driver wallet for cash-paid rentals.
 * Driver collected the full amount in cash — platform recoups its share.
 * Negative balance is allowed (debt tracking).
 * entry_type = 'commission', direction = 'debit'
 */
async function deductPlatformFeeFromDriver(driverId, platformFee, rentalId, db) {
    const currencyId = await findDefaultCurrencyId(db);
    const driverWallet = await findOrCreateWallet({ actorType: 1, actorId: driverId, currencyId }, db);
    const locked = await findWalletByIdForUpdate(driverWallet.wallet_id, db);
    // Allow negative balance — driver owes the platform.
    const nextBalance = round2(Number(locked.balance) - platformFee);

    const paymentId = await insertPayment({
        payment_code:    generatePaymentCode("FEE"),
        payer_wallet_id: locked.wallet_id,
        actor_type:      1,
        actor_id:        driverId,
        service_domain:  1,
        rental_id:       rentalId,
        amount:          platformFee,
        currency_id:     locked.currency_id,
        status:          "paid",
        description:     `Platform commission for cash rental #${rentalId}`,
    }, db);

    await updateWalletBalance(locked.wallet_id, nextBalance, db);
    await insertWalletLedger({
        wallet_id:     locked.wallet_id,
        payment_id:    paymentId,
        amount:        platformFee,
        balance_after: nextBalance,
        direction:     "debit",
        entry_type:    "commission",       // ✅ valid enum value
        source_type:   "rental_booking",   // ✅ valid enum value
        source_id:     rentalId,
        description:   `Platform commission for cash rental #${rentalId}`,
    }, db);
}

// ─── Main payment processor ───────────────────────────────────────────────────

/**
 * processPaymentAfterRentalCompletion
 *
 * Called after rental_bookings.status is set to 'completed'.
 * Must be called WITHIN an existing DB transaction (pass conn).
 *
 * Business rules:
 *
 *  payment_type = 1 (CASH):
 *    Driver already collected full amount from customer in cash.
 *    → Deduct platform fee (100 - commissionRate %) from driver wallet.
 *    → Mark rental as 'paid'.
 *
 *  payment_type = 2 (WALLET):
 *    Case A — payment_status = 'deposit_paid':
 *      Customer's wallet was already debited at booking creation.
 *      → Skip customer wallet deduction.
 *      → Credit driver earning (commissionRate %) to driver wallet.
 *      → Update payment_status to 'paid'.
 *
 *    Case B — payment_status = 'pending':
 *      Customer has not paid yet.
 *      → Deduct total_price from customer wallet.
 *      → Credit driver earning (commissionRate %) to driver wallet.
 *      → Update payment_status to 'paid'.
 *
 *  Idempotency:
 *    If payment_status is already 'paid', return early without double-processing.
 *
 * @param {object} rental  - { rental_id, user_id, driver_id, payment_type, total_price, payment_status, commission_rate }
 * @param {object} conn    - Active DB connection (required — caller must manage transaction)
 */
export async function processPaymentAfterRentalCompletion(rental, conn) {
    if (!rental?.rental_id || !rental?.driver_id) {
        throw new AppError("Invalid rental object for payment processing.", 422, "INVALID_RENTAL");
    }
    if (!conn) {
        throw new AppError("DB connection required for processPaymentAfterRentalCompletion.", 500, "MISSING_DB_CONNECTION");
    }

    // Idempotency guard — already fully settled
    if (rental.payment_status === "paid") {
        return { status: "already_processed", rental_id: rental.rental_id };
    }

    const paymentType    = Number(rental.payment_type);
    const totalAmount    = round2(rental.total_price);
    const commissionRate = Number(rental.commission_rate || 0) || 80;
    const platformFeeRate = round2(100 - commissionRate);

    // ── CASE A: Cash payment ────────────────────────────────────────────────
    if (paymentType === 1) {
        // Driver already holds the cash. Platform deducts its share from driver wallet.
        const platformFee = round2(totalAmount * platformFeeRate / 100);

        await updateRentalPaymentStatus(rental.rental_id, "paid", null, conn);

        if (platformFee > 0) {
            await deductPlatformFeeFromDriver(rental.driver_id, platformFee, rental.rental_id, conn);
        }

        emitToDriver(rental.driver_id, "rental_payment_confirmed", {
            rentalId:      rental.rental_id,
            amount:        totalAmount,
            platformFee,
            driverNet:     round2(totalAmount - platformFee),
            paymentMethod: "cash",
        });

        return { status: "cash_payment_processed", rental_id: rental.rental_id };
    }

    // ── CASE B: Wallet payment ──────────────────────────────────────────────
    if (paymentType === 2) {
        const depositAlreadyPaid = rental.payment_status === "deposit_paid";

        if (!depositAlreadyPaid) {
            // Customer has not paid yet — deduct wallet now.
            const currencyId     = await findDefaultCurrencyId(conn);
            const customerWallet = await findOrCreateWallet({ actorType: 0, actorId: rental.user_id, currencyId }, conn);
            const lockedWallet   = await findWalletByIdForUpdate(customerWallet.wallet_id, conn);

            if (Number(lockedWallet.balance) < totalAmount) {
                emitToUser(rental.user_id, "rental_payment_failed", {
                    rentalId:  rental.rental_id,
                    reason:    "insufficient_balance",
                    required:  totalAmount,
                    available: Number(lockedWallet.balance),
                });
                throw new AppError(
                    "Insufficient wallet balance for rental payment.",
                    402,
                    "INSUFFICIENT_WALLET_BALANCE"
                );
            }

            const nextBalance = round2(Number(lockedWallet.balance) - totalAmount);
            const paymentId   = await insertPayment({
                payment_code:    generatePaymentCode("RNT"),
                payer_wallet_id: lockedWallet.wallet_id,
                actor_type:      0,
                actor_id:        rental.user_id,
                service_domain:  1,
                rental_id:       rental.rental_id,
                amount:          totalAmount,
                currency_id:     lockedWallet.currency_id,
                status:          "paid",
                description:     `Wallet payment for rental #${rental.rental_id}`,
            }, conn);

            await updateWalletBalance(lockedWallet.wallet_id, nextBalance, conn);
            await insertWalletLedger({
                wallet_id:     lockedWallet.wallet_id,
                payment_id:    paymentId,
                amount:        totalAmount,
                balance_after: nextBalance,
                direction:     "debit",
                entry_type:    "rental_payment",   // ✅ valid enum value
                source_type:   "rental_booking",   // ✅ valid enum value
                source_id:     rental.rental_id,
                description:   `Wallet payment for rental #${rental.rental_id}`,
            }, conn);

            await updateRentalPaymentStatus(rental.rental_id, "paid", paymentId, conn);

            emitToUser(rental.user_id, "rental_payment_success", {
                rentalId:   rental.rental_id,
                amount:     totalAmount,
                newBalance: nextBalance,
            });
        } else {
            // Customer already paid at booking creation (deposit_paid).
            // Only update payment_status to 'paid' — no wallet deduction.
            await updateRentalPaymentStatus(rental.rental_id, "paid", null, conn);
        }

        // Credit driver their commission share.
        const driverEarning = round2(totalAmount * commissionRate / 100);
        if (driverEarning > 0) {
            await creditDriverEarnings(rental.driver_id, driverEarning, rental.rental_id, conn);
        }

        emitToDriver(rental.driver_id, "rental_payment_confirmed", {
            rentalId:      rental.rental_id,
            amount:        totalAmount,
            driverEarning,
            paymentMethod: "wallet",
        });

        return { status: "wallet_payment_processed", rental_id: rental.rental_id };
    }

    // Other payment types (card, POS) — not auto-processed.
    return { status: "payment_type_not_auto_processed", rental_id: rental.rental_id };
}

// ─── Rental timeout refund ────────────────────────────────────────────────────

/**
 * handleRentalTimeout
 *
 * Called when no driver accepted within the timeout window.
 * Cancels the rental and refunds the customer if they paid via wallet.
 * Idempotent: safe to call multiple times.
 *
 * @param {number} rentalId
 * @param {object|null} conn - optional DB connection (opens its own transaction if omitted)
 */
export async function handleRentalTimeout(rentalId, conn = null) {
    const work = async (db) => {
        const [rows] = await db.query(
            `SELECT rental_id, user_id, driver_id, status, payment_type, payment_status, total_price
             FROM rental_bookings WHERE rental_id = ? LIMIT 1`,
            [rentalId]
        );
        const rental = rows[0];
        if (!rental) {
            return { status: "not_found" };
        }

        // Only process if still waiting for driver
        if (!["scheduled", "pending"].includes(rental.status)) {
            return { status: "not_waiting_for_driver" };
        }

        // Cancel the rental
        await db.query(
            `UPDATE rental_bookings
             SET status = 'cancelled', cancel_reason = 'no_driver_available', updated_at = NOW()
             WHERE rental_id = ? LIMIT 1`,
            [rentalId]
        );
        await db.query(
            `INSERT INTO rental_booking_status_history (rental_id, status, note)
             VALUES (?, 'cancelled', 'Timeout - no driver accepted')`,
            [rentalId]
        );

        // Refund if wallet payment and customer already paid
        let refundAmount = 0;
        const customerHasPaid = rental.payment_status === "paid" || rental.payment_status === "deposit_paid";

        if (Number(rental.payment_type) === 2 && customerHasPaid) {
            refundAmount = round2(rental.total_price);

            const currencyId     = await findDefaultCurrencyId(db);
            const customerWallet = await findOrCreateWallet({ actorType: 0, actorId: rental.user_id, currencyId }, db);
            const lockedWallet   = await findWalletByIdForUpdate(customerWallet.wallet_id, db);
            const nextBalance    = round2(Number(lockedWallet.balance) + refundAmount);

            const refundPaymentId = await insertPayment({
                payment_code:    generatePaymentCode("REF"),
                payer_wallet_id: lockedWallet.wallet_id,
                actor_type:      0,
                actor_id:        rental.user_id,
                service_domain:  1,
                rental_id:       rentalId,
                amount:          refundAmount,
                currency_id:     lockedWallet.currency_id,
                status:          "refunded",
                description:     `Refund for cancelled rental #${rentalId} (no driver)`,
            }, db);

            await updateWalletBalance(lockedWallet.wallet_id, nextBalance, db);
            await insertWalletLedger({
                wallet_id:     lockedWallet.wallet_id,
                payment_id:    refundPaymentId,
                amount:        refundAmount,
                balance_after: nextBalance,
                direction:     "credit",
                entry_type:    "refund",             // ✅ valid enum value
                source_type:   "rental_booking",     // ✅ valid enum value (was "rental_cancellation")
                source_id:     rentalId,
                description:   `Refund for cancelled rental #${rentalId} (no driver)`,
            }, db);

            // Mark as paid (refund completed — payment cycle closed)
            await updateRentalPaymentStatus(rentalId, "paid", refundPaymentId, db);
        }

        emitToUser(rental.user_id, "rental_cancelled_no_driver", {
            rentalId,
            reason:       "no_driver_available",
            refunded:     refundAmount > 0,
            refundAmount,
            message:      refundAmount > 0
                ? `Không tìm được tài xế. Đã hoàn ${refundAmount.toLocaleString("vi-VN")}đ vào ví`
                : "Không tìm được tài xế. Yêu cầu đã hủy",
        });

        return { status: "cancelled", rentalId, refunded: refundAmount > 0, refundAmount };
    };

    if (conn) {
        return work(conn);
    }

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
