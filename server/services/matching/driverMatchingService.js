/**
 * services/matching/driverMatchingService.js
 *
 * Auto-matching engine: tìm tài xế gần nhất, gửi yêu cầu,
 * chờ 30s, nếu timeout → gửi tài xế tiếp theo.
 *
 * Race condition prevention:
 *  - DB transaction + FOR UPDATE khi assign tài xế
 *  - In-memory lock (Map) cho mỗi bookingId (thay cho Redis nếu chưa cài)
 *
 * Để dùng Redis: thay bookingLocks bằng ioredis SETNX/TTL.
 */

import crypto from "crypto";
import sqldb from "../../config/sqldatabase.js";
import AppError from "../../utils/appError.js";
import { findNearbyDrivers } from "../../utils/locationUtils.js";
import {
    findWalletByActorForUpdate,
    insertPayment,
    updateWalletBalance,
    insertWalletLedger,
} from "../../repositories/customer/rentalRepository.js";
import {
    assignDriverToBooking,
    cancelPendingRequests,
    countRequestsForBooking,
    findBookingForUpdate,
    findPendingRequestForBooking,
    findRequestById,
    getTriedDriverIds,
    incrementMatchingAttempts,
    insertBookingRequest,
    insertDriverScheduleFromBooking,
    markNoDriverFound,
    updateRequestStatus,
} from "../../repositories/matching/matchingRepository.js";
import { emitToDriver, emitToUser } from "../../socket/index.js";
import { publishRealtimeEvent } from "../../utils/realtime.js";
import { sendExpoPush } from "../../utils/expoPush.js";

// ─── In-memory lock (thay bằng Redis nếu multi-process) ──────────────────────
// Key: bookingId, Value: true (đang trong quá trình assign)
const bookingLocks = new Map();

// Tracking: bookingId → timeoutHandle (để clear khi cần)
const pendingTimers = new Map();

const REQUEST_TIMEOUT_MS  = 30_000; // 30 giây
const SEARCH_RADIUS_KM    = 2;
const MAX_SEARCH_RADIUS_KM = 5;     // mở rộng khi không đủ tài xế 2km

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Bắt đầu quá trình tìm tài xế cho booking.
 * Gọi ngay sau khi tạo booking type=immediate.
 * Chạy bất đồng bộ, không block response API.
 *
 * @param {number} bookingId
 * @param {number} pickupLat
 * @param {number} pickupLng
 * @param {number} packageId
 * @param {number} customerId - user_id của khách
 */
export function startDriverMatching(bookingId, pickupLat, pickupLng, packageId, customerId, rentalType = 1) {
    // Fire-and-forget — lỗi được log nhưng không throw
    _matchNextDriver(bookingId, pickupLat, pickupLng, packageId, customerId, [], rentalType).catch((err) => {
        console.error(`[Matching] bookingId=${bookingId} fatal error:`, err.message);
    });
}

/**
 * Xử lý khi tài xế accept/reject qua API.
 * Trả về { accepted: boolean }
 *
 * @param {number} requestId
 * @param {number} driverId
 * @param {'accept'|'reject'} action
 */
export async function handleDriverResponse(requestId, driverId, action) {
    const conn = await sqldb.getConnection();
    try {
        await conn.beginTransaction();

        const request = await findRequestById(requestId, conn, true);
        if (!request) throw new AppError("Yêu cầu không tồn tại.", 404, "NOT_FOUND");
        if (Number(request.driver_id) !== Number(driverId)) {
            throw new AppError("Không có quyền phản hồi yêu cầu này.", 403, "FORBIDDEN");
        }
        if (request.status !== "pending") {
            throw new AppError("Yêu cầu đã được xử lý rồi.", 409, "ALREADY_RESPONDED");
        }
        if (new Date(request.expires_at) < new Date()) {
            await updateRequestStatus(requestId, "timeout", conn);
            await conn.commit();
            throw new AppError("Yêu cầu đã hết hạn.", 410, "REQUEST_EXPIRED");
        }

        const bookingId = Number(request.booking_id);

        if (action === "accept") {
            // Lock booking để tránh race condition nhiều tài xế accept cùng lúc
            if (bookingLocks.get(bookingId)) {
                await conn.rollback();
                throw new AppError("Đơn đang được xử lý.", 409, "BOOKING_LOCKED");
            }
            bookingLocks.set(bookingId, true);

            try {
                const booking = await findBookingForUpdate(bookingId, conn);
                if (!booking || booking.status !== "scheduled" || booking.driver_id !== null) {
                    // Đơn đã bị gán cho tài xế khác hoặc bị hủy
                    await updateRequestStatus(requestId, "rejected", conn);
                    await conn.commit();
                    return { accepted: false, reason: "booking_taken" };
                }

                const affected = await assignDriverToBooking(bookingId, driverId, conn);
                if (affected === 0) {
                    await updateRequestStatus(requestId, "rejected", conn);
                    await conn.commit();
                    return { accepted: false, reason: "booking_taken" };
                }

                await updateRequestStatus(requestId, "accepted", conn);

                // Tạo schedule entry cho tài xế
                await insertDriverScheduleFromBooking(
                    {
                        driverId,
                        rentalId: bookingId,
                        startDatetime: booking.start_datetime,
                        endDatetime:   booking.end_datetime,
                    },
                    conn
                );

                await conn.commit();

                // Clear timeout timer nếu đang chờ
                _clearTimer(bookingId);

                // Thông báo customer
                emitToUser(booking.user_id, "DRIVER_ACCEPTED", {
                    bookingId,
                    driverId,
                    requestId,
                });

                return { accepted: true, bookingId };
            } finally {
                bookingLocks.delete(bookingId);
            }
        } else {
            // reject
            await updateRequestStatus(requestId, "rejected", conn);
            await conn.commit();
            return { accepted: false };
        }
    } catch (err) {
        await conn.rollback();
        throw err;
    } finally {
        conn.release();
    }
}

/**
 * Khách hủy booking khi đang tìm tài xế.
 */
export async function cancelSearchingBooking(bookingId, userId) {
    const conn = await sqldb.getConnection();
    try {
        await conn.beginTransaction();
        const booking = await findBookingForUpdate(bookingId, conn);
        if (!booking || Number(booking.user_id) !== Number(userId)) {
            throw new AppError("Không tìm thấy booking.", 404, "NOT_FOUND");
        }
        if (booking.status !== "scheduled") {
            throw new AppError("Booking không thể hủy ở trạng thái này.", 409, "INVALID_STATUS");
        }

        await sqldb.query(
            `UPDATE rental_bookings SET status='cancelled', cancel_reason='Khách hủy khi đang tìm tài xế.', updated_at=NOW() WHERE rental_id=? LIMIT 1`,
            [bookingId]
        );
        await cancelPendingRequests(bookingId, conn);
        await conn.commit();

        _clearTimer(bookingId);
        // Notify tài xế đang chờ (nếu có) qua SSE + socket.io
        const pendingReq = await findPendingRequestForBooking(bookingId).catch(() => null);
        if (pendingReq?.driver_id) {
            const cancelPayload = { bookingId };
            publishRealtimeEvent("BOOKING_CANCELLED", cancelPayload, { targetUserIds: [pendingReq.driver_id] });
            emitToDriver(pendingReq.driver_id, "BOOKING_CANCELLED", cancelPayload);
        }
    } catch (err) {
        await conn.rollback();
        throw err;
    } finally {
        conn.release();
    }
}

// ─── Internal matching loop ───────────────────────────────────────────────────

async function _matchNextDriver(bookingId, lat, lng, packageId, customerId, triedIds, rentalType = 1) {
    // Kiểm tra booking còn hiệu lực
    const [bookingRows] = await sqldb.query(
        `SELECT status, driver_id FROM rental_bookings WHERE rental_id = ? LIMIT 1`,
        [bookingId]
    );
    const booking = bookingRows[0];
    if (!booking || booking.status !== "scheduled" || booking.driver_id !== null) {
        return; // Đã được gán hoặc hủy
    }

    // Tìm tài xế trong 2km trước, nếu không đủ mở rộng lên 5km
    let radius = SEARCH_RADIUS_KM;
    let drivers = await findNearbyDrivers(lat, lng, radius, packageId, triedIds, rentalType);
    if (drivers.length === 0 && radius < MAX_SEARCH_RADIUS_KM) {
        radius = MAX_SEARCH_RADIUS_KM;
        drivers = await findNearbyDrivers(lat, lng, radius, packageId, triedIds, rentalType);
    }

    if (drivers.length === 0) {
        // Không còn tài xế nào
        await markNoDriverFound(bookingId);
        emitToUser(customerId, "DRIVER_NOT_FOUND", { bookingId });
        console.info(`[Matching] bookingId=${bookingId}: no driver found after ${triedIds.length} attempts`);

        // Hoàn tiền nếu đã trừ ví
        const [bRows] = await sqldb.query(
            `SELECT user_id, payment_type, payment_status, total_price
             FROM rental_bookings WHERE rental_id=? LIMIT 1`,
            [bookingId]
        );
        const b = bRows[0];
        if (b && Number(b.payment_type) === 2 && b.payment_status === "deposit_paid") {
            const conn2 = await sqldb.getConnection();
            try {
                await conn2.beginTransaction();
                // Idempotency: re-check under lock
                const [checkRows] = await conn2.query(
                    `SELECT payment_status FROM rental_bookings WHERE rental_id=? LIMIT 1 FOR UPDATE`,
                    [bookingId]
                );
                if (checkRows[0]?.payment_status !== "deposit_paid") {
                    await conn2.rollback();
                } else {
                    const wallet = await findWalletByActorForUpdate(
                        { actorType: 0, actorId: Number(b.user_id) }, conn2
                    );
                    const refundAmt = Number(b.total_price || 0);
                    const newBal    = Number((Number(wallet.balance || 0) + refundAmt).toFixed(2));
                    const pid = await insertPayment({
                        payment_code:    crypto.randomBytes(8).toString("hex").toUpperCase(),
                        payer_wallet_id: Number(wallet.wallet_id),
                        actor_type:      0,
                        actor_id:        Number(b.user_id),
                        service_domain:  1,
                        rental_id:       bookingId,
                        amount:          refundAmt,
                        currency_id:     Number(wallet.currency_id || 1),
                        status:          "paid",
                        description:     `Hoàn tiền thuê tài xế #${bookingId} (không tìm được tài xế)`,
                    }, conn2);
                    await updateWalletBalance(Number(wallet.wallet_id), newBal, conn2);
                    await insertWalletLedger({
                        wallet_id:     Number(wallet.wallet_id),
                        payment_id:    pid,
                        amount:        refundAmt,
                        balance_after: newBal,
                        direction:     "credit",
                        entry_type:    "refund",
                        source_type:   "rental_booking",
                        source_id:     bookingId,
                        description:   `Hoàn tiền thuê tài xế #${bookingId}`,
                    }, conn2);
                    await conn2.query(
                        `UPDATE rental_bookings SET payment_status='refunded' WHERE rental_id=? LIMIT 1`,
                        [bookingId]
                    );
                    await conn2.commit();
                    console.info(`[Matching] refund ok bookingId=${bookingId} amount=${refundAmt}`);
                }
            } catch (refundErr) {
                await conn2.rollback();
                console.error(`[Matching] refund failed bookingId=${bookingId}:`, refundErr.message);
            } finally {
                conn2.release();
            }
        }

        return;
    }

    const driver = drivers[0];
    const driverId = driver.driver_id;

    // Tạo request record
    const expiresAt = new Date(Date.now() + REQUEST_TIMEOUT_MS);
    const expiresAtSql = expiresAt.toISOString().slice(0, 19).replace("T", " ");

    await incrementMatchingAttempts(bookingId);
    const requestId = await insertBookingRequest({
        bookingId,
        driverId,
        distanceKm: driver.distance_km,
        expiresAt:  expiresAtSql,
    });

    // Gửi event đến tài xế: SSE (driver mobile dùng SSE) + socket.io (fallback)
    const rentRequestPayload = {
        requestId,
        bookingId,
        pickup_lat:   lat,
        pickup_lng:   lng,
        package_id:   packageId,
        distance_km:  driver.distance_km,
        expires_at:   expiresAtSql,
    };
    publishRealtimeEvent("NEW_DRIVER_RENT_REQUEST", rentRequestPayload, { targetUserIds: [driverId] });
    emitToDriver(driverId, "NEW_DRIVER_RENT_REQUEST", rentRequestPayload);

    // Push notification (app background/killed)
    if (driver.push_notification_token) {
        sendExpoPush(driver.push_notification_token, {
            title: "Yêu cầu thuê tài xế mới",
            body: `Khách cần tài xế, cách ${driver.distance_km.toFixed(1)} km`,
            channelId: "driver-requests",
            data: { type: "NEW_DRIVER_RENT_REQUEST", ...rentRequestPayload },
        }).catch(() => {}); // non-blocking, errors already logged inside
    }

    // Thông báo khách đang tìm
    emitToUser(customerId, "SEARCHING_DRIVER", {
        bookingId,
        attempts: triedIds.length + 1,
    });

    console.info(`[Matching] bookingId=${bookingId} → driverId=${driverId} (dist=${driver.distance_km}km) requestId=${requestId}`);

    // Set timer 30s
    const timer = setTimeout(async () => {
        pendingTimers.delete(bookingId);
        try {
            // Kiểm tra request còn pending không (tài xế có thể đã accept trong lúc timer chạy)
            const req = await findPendingRequestForBooking(bookingId);
            if (!req || req.id !== requestId || req.status !== "pending") {
                return; // Đã được xử lý
            }

            await updateRequestStatus(requestId, "timeout");
            console.info(`[Matching] bookingId=${bookingId} driverId=${driverId} TIMEOUT`);

            // Gửi tài xế tiếp theo
            await _matchNextDriver(bookingId, lat, lng, packageId, customerId, [...triedIds, driverId], rentalType);
        } catch (err) {
            console.error(`[Matching] timeout handler error bookingId=${bookingId}:`, err.message);
        }
    }, REQUEST_TIMEOUT_MS);

    pendingTimers.set(bookingId, timer);
}

function _clearTimer(bookingId) {
    const t = pendingTimers.get(bookingId);
    if (t) {
        clearTimeout(t);
        pendingTimers.delete(bookingId);
    }
}
