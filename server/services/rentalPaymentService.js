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

/**
 * processPaymentAfterRentalCompletion
 *
 * Called after rental booking is marked as 'completed'.
 * Handles payment settlement based on payment_type:
 *  - 1 (cash): Mark as paid, credit driver earnings
 *  - 2 (wallet): Debit customer wallet, mark as paid, credit driver earnings
 *
 * @param {object} rental - Completed rental booking with: rental_id, user_id, driver_id, payment_type, total_price, payment_status
 * @param {object} conn - DB connection (optional, for transaction)
 */
export async function processPaymentAfterRentalCompletion(rental, conn = null) {
    if (!rental || !rental.rental_id || !rental.driver_id) {
        throw new AppError("Invalid rental object for payment processing.", 422, "INVALID_RENTAL");
    }

    // Only process if not already paid
    if (rental.payment_status === "paid" || rental.payment_status === "refunded") {
        return { status: "already_processed", rental_id: rental.rental_id };
    }

    const db = conn || sqldb;
    const isTransaction = !!conn; // True if called within transaction

    try {
        const paymentType = Number(rental.payment_type);
        const amount = Number(rental.total_price || 0);

        if (paymentType === 1) {
            // ─── CASH PAYMENT ─────────────────────────────────────────────────────────
            // Tài xế đã nhận tiền trực tiếp → chỉ cập nhật trạng thái
            await updateRentalPaymentStatus(rental.rental_id, "paid", null, db);

            // Credit driver earnings to wallet
            await creditDriverEarnings(rental.driver_id, amount, {
                type: "rental_completed",
                referenceId: rental.rental_id,
            }, db);

            // Notify driver
            emitToDriver(rental.driver_id, "rental_payment_confirmed", {
                rentalId: rental.rental_id,
                amount,
                paymentMethod: "cash",
                message: `Thanh toán tiền mặt cho đơn thuê #${rental.rental_id} đã xác nhận`,
            });

            return { status: "cash_payment_processed", rental_id: rental.rental_id };

        } else if (paymentType === 2) {
            // ─── WALLET PAYMENT ──────────────────────────────────────────────────────
            // Trừ ví khách hàng, cập nhật trạng thái, cập nhật thu nhập tài xế
            const work = async (workDb) => {
                // 1. Get or create customer wallet
                const currencyId = await findDefaultCurrencyId(workDb);
                const customerWallet = await findOrCreateWallet(
                    { actorType: 0, actorId: rental.user_id, currencyId },
                    workDb
                );

                // 2. Lock and check balance
                const lockedWallet = await findWalletByIdForUpdate(customerWallet.wallet_id, workDb);
                if (!lockedWallet) {
                    throw new AppError("Customer wallet not found.", 404, "WALLET_NOT_FOUND");
                }

                if (lockedWallet.balance < amount) {
                    // Insufficient balance - mark as insufficient_balance instead of failing
                    await updateRentalPaymentStatus(
                        rental.rental_id,
                        "insufficient_balance",
                        null,
                        workDb
                    );

                    emitToUser(rental.user_id, "rental_payment_failed", {
                        rentalId: rental.rental_id,
                        reason: "insufficient_balance",
                        required: amount,
                        available: lockedWallet.balance,
                    });

                    return { status: "insufficient_balance", rental_id: rental.rental_id };
                }

                // 3. Debit customer wallet
                const nextBalance = Number((lockedWallet.balance - amount).toFixed(2));
                const paymentId = await insertPayment(
                    {
                        payment_code: generatePaymentCode("RNT"),
                        payer_wallet_id: lockedWallet.wallet_id,
                        actor_type: 0,
                        actor_id: rental.user_id,
                        service_domain: 1,
                        rental_id: rental.rental_id,
                        amount,
                        currency_id: lockedWallet.currency_id,
                        status: "paid",
                        description: `Thanh toán đơn thuê tài xế #${rental.rental_id}`,
                    },
                    workDb
                );

                await updateWalletBalance(lockedWallet.wallet_id, nextBalance, workDb);
                await insertWalletLedger(
                    {
                        wallet_id: lockedWallet.wallet_id,
                        payment_id: paymentId,
                        amount,
                        balance_after: nextBalance,
                        direction: "debit",
                        entry_type: "rental_payment",
                        source_type: "rental_booking",
                        source_id: rental.rental_id,
                        description: `Thanh toán đơn thuê tài xế #${rental.rental_id}`,
                    },
                    workDb
                );

                // 4. Update rental payment status with transaction_id
                await updateRentalPaymentStatus(rental.rental_id, "paid", paymentId, workDb);

                // 5. Credit driver earnings
                await creditDriverEarnings(rental.driver_id, amount, {
                    type: "rental_completed",
                    referenceId: rental.rental_id,
                }, workDb);

                // 6. Notify customer
                emitToUser(rental.user_id, "rental_payment_success", {
                    rentalId: rental.rental_id,
                    amount,
                    newBalance: nextBalance,
                    message: `Thanh toán ${amount.toLocaleString("vi-VN")}đ thành công`,
                });

                // 7. Notify driver
                emitToDriver(rental.driver_id, "rental_payment_confirmed", {
                    rentalId: rental.rental_id,
                    amount,
                    paymentMethod: "wallet",
                    message: `Thanh toán ví ThueXe cho đơn thuê #${rental.rental_id} đã xác nhận`,
                });

                return { status: "wallet_payment_processed", rental_id: rental.rental_id };
            };

            // Execute within transaction if not already in one
            if (isTransaction) {
                return await work(db);
            } else {
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

        } else {
            // Other payment types (card, pos) - mark as pending for manual settlement
            return { status: "payment_type_not_auto_processed", rental_id: rental.rental_id };
        }

    } catch (error) {
        console.error(`[RentalPayment] Error processing rental ${rental.rental_id}:`, error);
        throw error;
    }
}

/**
 * updateRentalPaymentStatus
 *
 * Updates payment_status and transaction_id in rental_bookings table.
 * @param {number} rentalId
 * @param {string} status - 'paid', 'refunded', 'insufficient_balance', etc.
 * @param {number|null} transactionId - payment_id (optional)
 * @param {object} db - database connection
 */
async function updateRentalPaymentStatus(rentalId, status, transactionId, db) {
    const query = transactionId
        ? `UPDATE rental_bookings SET payment_status = ?, transaction_id = ?, updated_at = NOW() WHERE rental_id = ? LIMIT 1`
        : `UPDATE rental_bookings SET payment_status = ?, updated_at = NOW() WHERE rental_id = ? LIMIT 1`;

    const params = transactionId
        ? [status, transactionId, rentalId]
        : [status, rentalId];

    await db.query(query, params);
}

/**
 * creditDriverEarnings
 *
 * Credits driver wallet with rental earnings.
 * @param {number} driverId
 * @param {number} amount
 * @param {object} metadata - { type, referenceId }
 * @param {object} db - database connection
 */
async function creditDriverEarnings(driverId, amount, metadata = {}, db) {
    const currencyId = await findDefaultCurrencyId(db);
    const driverWallet = await findOrCreateWallet(
        { actorType: 1, actorId: driverId, currencyId },
        db
    );

    const lockedWallet = await findWalletByIdForUpdate(driverWallet.wallet_id, db);
    const nextBalance = Number((lockedWallet.balance + amount).toFixed(2));

    const paymentId = await insertPayment(
        {
            payment_code: generatePaymentCode("DRV"),
            payer_wallet_id: lockedWallet.wallet_id,
            actor_type: 1,
            actor_id: driverId,
            service_domain: 1,
            amount,
            currency_id: lockedWallet.currency_id,
            status: "paid",
            description: `Thu nhập từ đơn thuê tài xế #${metadata.referenceId || "unknown"}`,
        },
        db
    );

    await updateWalletBalance(lockedWallet.wallet_id, nextBalance, db);
    await insertWalletLedger(
        {
            wallet_id: lockedWallet.wallet_id,
            payment_id: paymentId,
            amount,
            balance_after: nextBalance,
            direction: "credit",
            entry_type: "rental_earnings",
            source_type: "rental_completion",
            source_id: metadata.referenceId,
            description: `Thu nhập từ đơn thuê #${metadata.referenceId}`,
        },
        db
    );
}

/**
 * generatePaymentCode
 *
 * Generates unique payment code with given prefix.
 */
function generatePaymentCode(prefix = "PAY") {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
    return `${prefix}-${timestamp}-${random}`;
}

/**
 * handleRentalTimeout
 *
 * Called when 60 seconds have passed without driver acceptance.
 * Cancels rental and refunds wallet payment if applicable.
 *
 * @param {number} rentalId
 * @param {object} conn - DB connection (optional)
 */
export async function handleRentalTimeout(rentalId, conn = null) {
    const db = conn || sqldb;
    const isTransaction = !!conn;

    try {
        const work = async (workDb) => {
            // Find rental
            const [rows] = await workDb.query(
                `SELECT rental_id, user_id, driver_id, status, payment_type, payment_status, total_price
                 FROM rental_bookings WHERE rental_id = ? LIMIT 1`,
                [rentalId]
            );

            const rental = rows[0];
            if (!rental) {
                console.warn(`[RentalTimeout] Rental ${rentalId} not found`);
                return { status: "not_found" };
            }

            // Only process if still waiting for driver
            const pendingStatuses = ["scheduled", "pending"];
            if (!pendingStatuses.includes(rental.status)) {
                console.info(`[RentalTimeout] Rental ${rentalId} already in status '${rental.status}', skipping`);
                return { status: "not_waiting_for_driver" };
            }

            // Cancel the rental
            await workDb.query(
                `UPDATE rental_bookings
                 SET status = 'cancelled', cancel_reason = 'no_driver_available', updated_at = NOW()
                 WHERE rental_id = ? LIMIT 1`,
                [rentalId]
            );

            await workDb.query(
                `INSERT INTO rental_booking_status_history (rental_id, status, note) VALUES (?, 'cancelled', 'Timeout - no driver accepted')`,
                [rentalId]
            );

            // Refund if wallet payment
            let refundAmount = 0;
            if (Number(rental.payment_type) === 2 && rental.payment_status === "paid") {
                refundAmount = Number(rental.total_price || 0);

                const currencyId = await findDefaultCurrencyId(workDb);
                const customerWallet = await findOrCreateWallet(
                    { actorType: 0, actorId: rental.user_id, currencyId },
                    workDb
                );

                const lockedWallet = await findWalletByIdForUpdate(customerWallet.wallet_id, workDb);
                const nextBalance = Number((lockedWallet.balance + refundAmount).toFixed(2));

                const refundPaymentId = await insertPayment(
                    {
                        payment_code: generatePaymentCode("REF"),
                        payer_wallet_id: lockedWallet.wallet_id,
                        actor_type: 0,
                        actor_id: rental.user_id,
                        service_domain: 1,
                        rental_id: rentalId,
                        amount: refundAmount,
                        currency_id: lockedWallet.currency_id,
                        status: "paid",
                        description: `Hoàn tiền đơn thuê tài xế #${rentalId} (không có tài xế)`,
                    },
                    workDb
                );

                await updateWalletBalance(lockedWallet.wallet_id, nextBalance, workDb);
                await insertWalletLedger(
                    {
                        wallet_id: lockedWallet.wallet_id,
                        payment_id: refundPaymentId,
                        amount: refundAmount,
                        balance_after: nextBalance,
                        direction: "credit",
                        entry_type: "refund",
                        source_type: "rental_cancellation",
                        source_id: rentalId,
                        description: `Hoàn tiền đơn thuê #${rentalId} (không có tài xế)`,
                    },
                    workDb
                );

                await workDb.query(
                    `UPDATE rental_bookings SET payment_status = 'refunded' WHERE rental_id = ? LIMIT 1`,
                    [rentalId]
                );
            }

            // Notify customer
            emitToUser(rental.user_id, "rental_cancelled_no_driver", {
                rentalId,
                reason: "no_driver_available",
                refunded: refundAmount > 0,
                refundAmount,
                message: refundAmount > 0
                    ? `Không tìm được tài xế. Đã hoàn ${refundAmount.toLocaleString("vi-VN")}đ vào ví`
                    : "Không tìm được tài xế. Yêu cầu đã hủy",
            });

            return {
                status: "cancelled",
                rentalId,
                refunded: refundAmount > 0,
                refundAmount,
            };
        };

        // Execute within transaction if not already in one
        if (isTransaction) {
            return await work(db);
        } else {
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

    } catch (error) {
        console.error(`[RentalTimeout] Error handling timeout for rental ${rentalId}:`, error);
        throw error;
    }
}
