/**
 * tripService.js
 *
 * Trip-management service for the driver app's /api/driver/trips/* endpoints.
 *
 * Design notes:
 *  - accept / reject / cancel reuse repository functions from driver/bookingRepository.js
 *    so existing dispatch flow is untouched.
 *  - arrived / start / complete are enhanced variants that also save GPS coordinates
 *    into the drv_arv_*, drv_start_*, drv_comp_* columns.
 *  - chat and route are new features backed by driver/tripRepository.js.
 */

import sqldb from "../../config/sqldatabase.js";
import AppError from "../../utils/appError.js";

// ─── Existing booking repository functions (reused, not duplicated) ────────────
import {
    findActiveBookingByDriver,
    findBookingByIdForDriver,
    findAllocationForDriverBooking,
    updateAllocationStatus,
    assignDriverToBooking,
    incrementDriverCancelCount,
    incrementDriverCompletedCount,
    updateBookingStatus,
    findDriverCurrentLocationForService,
    setBookingAcceptanceData,
    setBookingCompletionData,
} from "../../repositories/driver/bookingRepository.js";

import { findDriverById } from "../../repositories/driver/authRepository.js";
import {
    findOrCreateWallet,
    findWalletByActor,
    findWalletByIdForUpdate,
    updateWalletBalance,
    insertWalletLedger,
    updatePaymentStatusById,
} from "../../repositories/walletRepository.js";
import {
    getBookingDispatchState,
    findSystemSettingByKey,
    findTariffWaitData,
} from "../../repositories/bookingRepository.js";

import {
    notifyRideAccepted,
    notifyRideRejected,
} from "../rideDispatchService.js";

// ─── New trip repository functions ────────────────────────────────────────────
import {
    listPendingAllocationsForDriver,
    updateBookingArrived,
    updateBookingStarted,
    updateBookingCompleted,
    findBookingForDriver,
    insertTripChat,
    listTripChats,
    findTripRouteData,
    findBookingFallbackCoords,
    listTripHistory,
    countTripHistory,
    findTripHistoryDetail,
} from "../../repositories/driver/tripRepository.js";

// ─── Status constants (mirror bookings.status comment in schema) ──────────────

const BOOKING_STATUS = {
    PENDING:              0,
    ONRIDE:               1,
    CANCELLED_BY_USER:    2,
    COMPLETED:            3,
    CANCELLED_BY_DRIVER:  4,
    CANCELLED_BY_ADMIN:   5,
    ARRIVED:              6,
};

const ALLOCATION_STATUS = {
    PENDING:   0,
    ACCEPTED:  1,
    REJECTED:  2,
    TIMEOUT:   3,
    FINALIZED: 4,
};

const CANCELLABLE_STATUSES = new Set([
    BOOKING_STATUS.PENDING,
    BOOKING_STATUS.ARRIVED,
    BOOKING_STATUS.ONRIDE,
]);

// ─── Helper ───────────────────────────────────────────────────────────────────

function assertDriverId(auth) {
    const driverId = Number(auth?.userId || 0);
    if (!driverId) throw new AppError("Forbidden", 403, "FORBIDDEN");
    return driverId;
}

// ─── GET /trips/current ───────────────────────────────────────────────────────

/**
 * Return the driver's active (non-terminal) booking, or null if idle.
 */
export async function getCurrentTrip(auth) {
    const driverId = assertDriverId(auth);
    const booking  = await findActiveBookingByDriver(driverId);
    return { booking };
}

// ─── GET /trips/requests/pending ──────────────────────────────────────────────

/**
 * Return ALL pending allocations for the driver.
 * The existing getActiveBooking returns only 1; this returns the full list.
 */
export async function getPendingRequests(auth) {
    const driverId = assertDriverId(auth);
    const items    = await listPendingAllocationsForDriver(driverId);
    return { items };
}

// ─── POST /trips/:bookingId/accept ────────────────────────────────────────────

/**
 * Accept a pending allocation.
 * Uses FOR UPDATE lock on driver_allocate row to prevent two drivers
 * accepting the same booking concurrently.
 */
export async function acceptTrip(auth, bookingId) {
    const driverId = assertDriverId(auth);
    const bId      = Number(bookingId);

    const conn = await sqldb.getConnection();
    try {
        await conn.beginTransaction();

        const allocation = await findAllocationForDriverBooking(bId, driverId, conn, true);
        if (!allocation) {
            throw new AppError("Booking allocation not found.", 404, "ALLOCATION_NOT_FOUND");
        }
        if (allocation.status !== ALLOCATION_STATUS.PENDING) {
            throw new AppError(
                "This booking has already been responded to.",
                409,
                "ALLOCATION_ALREADY_RESPONDED"
            );
        }

        const driver = await findDriverById(driverId);
        if (!driver || driver.account_deleted === 1) {
            throw new AppError("Driver not found.", 404, "DRIVER_NOT_FOUND");
        }

        await updateAllocationStatus(allocation.id, ALLOCATION_STATUS.ACCEPTED, conn);

        await assignDriverToBooking(bId, {
            driver_id: driverId,
            firstname: driver.firstname,
            lastname:  driver.lastname,
            phone:     driver.phone,
        }, conn);

        // Save driver GPS location and commission rate at acceptance time
        const driverLocation = await findDriverCurrentLocationForService(driverId, conn);
        const commissionRaw = Number(driver.driver_commision || 0);
        const commissionRate = commissionRaw > 0
            ? commissionRaw
            : Number((await findSystemSettingByKey("driver_commission_rate", conn)) || 80);
        await setBookingAcceptanceData(bId, {
            drv_acc_long:     driverLocation?.long ?? null,
            drv_acc_lat:      driverLocation?.lat  ?? null,
            driver_commision: commissionRate,
        }, conn);

        await conn.commit();

        const booking = await findBookingByIdForDriver(bId, driverId);

        if (booking?.user_id) {
            notifyRideAccepted(bId, driverId, booking.user_id, {
                firstname:     driver.firstname,
                lastname:      driver.lastname,
                phone:         driver.phone,
                driver_rating: driver.driver_rating ?? null,
                current_lat:   driverLocation?.lat  ?? null,
                current_lng:   driverLocation?.long ?? null,
            });
        }

        return { booking };
    } catch (error) {
        await conn.rollback();
        throw error;
    } finally {
        conn.release();
    }
}

// ─── POST /trips/:bookingId/reject ────────────────────────────────────────────

/**
 * Reject a pending allocation.
 * Only marks driver_allocate.status = REJECTED — does not touch booking.status,
 * leaving the dispatcher free to re-allocate to another driver.
 */
export async function rejectTrip(auth, bookingId) {
    const driverId = assertDriverId(auth);
    const bId      = Number(bookingId);

    const conn = await sqldb.getConnection();
    try {
        await conn.beginTransaction();

        const allocation = await findAllocationForDriverBooking(bId, driverId, conn, true);
        if (!allocation) {
            throw new AppError("Booking allocation not found.", 404, "ALLOCATION_NOT_FOUND");
        }
        if (allocation.status !== ALLOCATION_STATUS.PENDING) {
            throw new AppError(
                "This booking has already been responded to.",
                409,
                "ALLOCATION_ALREADY_RESPONDED"
            );
        }

        await updateAllocationStatus(allocation.id, ALLOCATION_STATUS.REJECTED, conn);
        await conn.commit();

        const bookingState = await getBookingDispatchState(bId).catch(() => null);
        if (bookingState?.user_id && bookingState.pickup_lat != null) {
            notifyRideRejected(bId, bookingState.user_id, bookingState.pickup_lat, bookingState.pickup_long);
        }

        return { rejected: true };
    } catch (error) {
        await conn.rollback();
        throw error;
    } finally {
        conn.release();
    }
}

// ─── POST /trips/:bookingId/arrived ───────────────────────────────────────────

/**
 * Mark driver arrived at pickup (booking status 0 → 6).
 * Saves drv_arv_long, drv_arv_lat when coordinates are in the request body.
 */
export async function markTripArrived(auth, bookingId, payload = {}) {
    const driverId = assertDriverId(auth);
    const bId      = Number(bookingId);

    const conn = await sqldb.getConnection();
    try {
        await conn.beginTransaction();

        const booking = await findBookingByIdForDriver(bId, driverId, conn, true);
        if (!booking) throw new AppError("Booking not found.", 404, "BOOKING_NOT_FOUND");

        if (booking.status !== BOOKING_STATUS.PENDING) {
            throw new AppError(
                `Cannot mark arrived: booking status is ${booking.status}.`,
                409,
                "INVALID_BOOKING_STATUS"
            );
        }

        const arrivedLocation = await findDriverCurrentLocationForService(driverId, conn);
        await updateBookingArrived(bId, {
            long: payload.long ?? arrivedLocation?.long ?? null,
            lat:  payload.lat  ?? arrivedLocation?.lat  ?? null,
        }, conn);

        await conn.commit();

        const updated = await findBookingByIdForDriver(bId, driverId);
        return { booking: updated };
    } catch (error) {
        await conn.rollback();
        throw error;
    } finally {
        conn.release();
    }
}

// ─── POST /trips/:bookingId/start ─────────────────────────────────────────────

/**
 * Start the ride (booking status 6 → 1).
 * Saves drv_start_long, drv_start_lat when coordinates are provided.
 */
export async function startTrip(auth, bookingId, payload = {}) {
    const driverId = assertDriverId(auth);
    const bId      = Number(bookingId);

    const conn = await sqldb.getConnection();
    try {
        await conn.beginTransaction();

        const booking = await findBookingByIdForDriver(bId, driverId, conn, true);
        if (!booking) throw new AppError("Booking not found.", 404, "BOOKING_NOT_FOUND");

        if (booking.status !== BOOKING_STATUS.ARRIVED) {
            throw new AppError(
                `Cannot start trip: booking status is ${booking.status}. Driver must mark arrived first.`,
                409,
                "INVALID_BOOKING_STATUS"
            );
        }

        const startLocation = await findDriverCurrentLocationForService(driverId, conn);
        await updateBookingStarted(bId, {
            long: payload.long ?? startLocation?.long ?? null,
            lat:  payload.lat  ?? startLocation?.lat  ?? null,
        }, conn);

        await conn.commit();

        const updated = await findBookingByIdForDriver(bId, driverId);
        return { booking: updated };
    } catch (error) {
        await conn.rollback();
        throw error;
    } finally {
        conn.release();
    }
}

// ─── POST /trips/:bookingId/complete ──────────────────────────────────────────

/**
 * Complete the ride (booking status 1 → 3).
 * Saves drv_comp_long/lat, actual_cost, distance_travelled when provided.
 * Increments driver's completed_rides counter and resets booking_cancel_freq.
 */
export async function completeTrip(auth, bookingId, payload = {}) {
    const driverId = assertDriverId(auth);
    const bId      = Number(bookingId);

    const conn = await sqldb.getConnection();
    try {
        await conn.beginTransaction();

        const booking = await findBookingByIdForDriver(bId, driverId, conn, true);
        if (!booking) throw new AppError("Booking not found.", 404, "BOOKING_NOT_FOUND");

        if (booking.status !== BOOKING_STATUS.ONRIDE) {
            throw new AppError(
                `Cannot complete trip: booking status is ${booking.status}.`,
                409,
                "INVALID_BOOKING_STATUS"
            );
        }

        // ── 1. Calculate wait time ────────────────────────────────────────────
        const arrivedAt = booking.date_arrived ? new Date(booking.date_arrived) : null;
        const startedAt = booking.date_started ? new Date(booking.date_started) : null;
        const rawWaitSecs = (arrivedAt && startedAt)
            ? Math.max(0, (startedAt.getTime() - arrivedAt.getTime()) / 1000) : 0;

        const tariffWait = (booking.route_id && booking.ride_id)
            ? await findTariffWaitData({ routeId: booking.route_id, rideId: booking.ride_id, serviceType: booking.service_type || 0 }, conn)
            : null;

        const nowHour = new Date().getHours();
        const isNight = nowHour >= 22 || nowHour < 5;
        const freeWaitMinutes = isNight
            ? (tariffWait?.nwait_time ?? tariffWait?.wait_time ?? Number(await findSystemSettingByKey("free_waiting_minutes", conn) || 5))
            : (tariffWait?.wait_time  ?? Number(await findSystemSettingByKey("free_waiting_minutes", conn) || 5));
        const totalWaitTime = Math.max(0, Math.round(rawWaitSecs - freeWaitMinutes * 60));

        const waitCostPerMin = isNight
            ? (tariffWait?.nwait_cost_per_minute || tariffWait?.wait_cost_per_minute || 0)
            : (tariffWait?.wait_cost_per_minute  || 0);
        const totalWaitTimeCost = Number(((totalWaitTime / 60) * waitCostPerMin).toFixed(2));

        // ── 2. Calculate actual cost ──────────────────────────────────────────
        const baseCost   = Number(booking.estimated_cost || 0);
        const actualCost = payload.actual_cost != null
            ? Number(payload.actual_cost)
            : Number((baseCost + totalWaitTimeCost).toFixed(2));

        // ── 3. Completion GPS ─────────────────────────────────────────────────
        const completeLocation = await findDriverCurrentLocationForService(driverId, conn);

        // ── 4. Update booking: status, cost, coords, wait time ───────────────
        await updateBookingCompleted(bId, {
            long:              payload.long ?? completeLocation?.long ?? null,
            lat:               payload.lat  ?? completeLocation?.lat  ?? null,
            actualCost,
            distanceTravelled: payload.distance_travelled != null ? Number(payload.distance_travelled) : null,
            totalWaitTime,
            totalWaitTimeCost,
        }, conn);

        await incrementDriverCompletedCount(driverId, conn);

        // ── 5. Credit driver wallet ───────────────────────────────────────────
        const commissionRate = Number(booking.driver_commision || 0)
            || Number(await findSystemSettingByKey("driver_commission_rate", conn) || 80);
        const driverEarning = Number(((actualCost * commissionRate) / 100).toFixed(2));

        if (driverEarning > 0) {
            const driverWallet = await findOrCreateWallet(
                { actorType: 1, actorId: driverId, currencyId: 1 }, conn
            );
            const locked     = await findWalletByIdForUpdate(driverWallet.wallet_id, conn);
            const newBalance = Math.round((Number(locked.balance) + driverEarning) * 100) / 100;
            await updateWalletBalance(driverWallet.wallet_id, newBalance, conn);
            await insertWalletLedger({
                wallet_id:     driverWallet.wallet_id,
                payment_id:    booking.transaction_id ?? null,
                amount:        driverEarning,
                balance_after: newBalance,
                direction:     'credit',
                entry_type:    'commission',
                source_type:   'ride_booking',
                source_id:     bId,
                description:   `Thu nhập chuyến xe #${bId}`,
            }, conn);
            await setBookingCompletionData(bId, { driver_settled: 1 }, conn);
        }

        await conn.commit();

        const updated = await findBookingByIdForDriver(bId, driverId);
        return { booking: updated };
    } catch (error) {
        await conn.rollback();
        throw error;
    } finally {
        conn.release();
    }
}

// ─── POST /trips/:bookingId/cancel ────────────────────────────────────────────

/**
 * Cancel the trip by driver (booking status → 4).
 * Allowed from PENDING (0), ARRIVED (6), or ONRIDE (1).
 * Increments driver's cancel counter (booking_cancel_freq).
 */
export async function cancelTrip(auth, bookingId, payload = {}) {
    const driverId = assertDriverId(auth);
    const bId      = Number(bookingId);

    const conn = await sqldb.getConnection();
    try {
        await conn.beginTransaction();

        const booking = await findBookingByIdForDriver(bId, driverId, conn, true);
        if (!booking) throw new AppError("Booking not found.", 404, "BOOKING_NOT_FOUND");

        if (!CANCELLABLE_STATUSES.has(booking.status)) {
            throw new AppError(
                `Cannot cancel: booking status is ${booking.status}.`,
                409,
                "INVALID_BOOKING_STATUS"
            );
        }

        const cancelComment = String(payload.cancel_comment || "").trim() || null;

        // Use existing updateBookingStatus from driver/bookingRepository — it
        // writes cancel_comment via COALESCE and sets status=4.
        await updateBookingStatus(bId, BOOKING_STATUS.CANCELLED_BY_DRIVER, conn, {
            cancel_comment: cancelComment,
        });
        await incrementDriverCancelCount(driverId, conn);

        if (Number(booking.haspaid || 0) === 1 && Number(booking.payment_type) === 2) {
            const refundAmount = Number(booking.paid_amount || 0);
            if (refundAmount > 0 && booking.user_id) {
                const customerWallet = await findWalletByActor(
                    { actorType: 0, actorId: Number(booking.user_id) }, conn
                );
                if (customerWallet) {
                    const locked     = await findWalletByIdForUpdate(customerWallet.wallet_id, conn);
                    const newBalance = Math.round((Number(locked.balance) + refundAmount) * 100) / 100;
                    await updateWalletBalance(customerWallet.wallet_id, newBalance, conn);
                    await insertWalletLedger({
                        wallet_id:     customerWallet.wallet_id,
                        payment_id:    booking.transaction_id ?? null,
                        amount:        refundAmount,
                        balance_after: newBalance,
                        direction:     'credit',
                        entry_type:    'refund',
                        source_type:   'ride_booking',
                        source_id:     bId,
                        description:   `Refund for driver-cancelled ride #${bId}`,
                    }, conn);
                    if (booking.transaction_id) {
                        await updatePaymentStatusById(booking.transaction_id, 'refunded', conn);
                    }
                }
            }
        }

        await conn.commit();

        const updated = await findBookingByIdForDriver(bId, driverId);
        return { booking: updated };
    } catch (error) {
        await conn.rollback();
        throw error;
    } finally {
        conn.release();
    }
}

// ─── GET /trips/:bookingId ────────────────────────────────────────────────────

export async function getTripDetail(auth, bookingId) {
    const driverId = assertDriverId(auth);
    const booking  = await findBookingByIdForDriver(Number(bookingId), driverId);
    if (!booking) throw new AppError("Booking not found.", 404, "BOOKING_NOT_FOUND");
    return { booking };
}

// ─── POST /trips/:bookingId/chat ──────────────────────────────────────────────

/**
 * Send a chat message on a trip.
 * Driver must be the assigned driver on the booking.
 */
export async function sendTripChat(auth, bookingId, payload) {
    const driverId = assertDriverId(auth);
    const bId      = Number(bookingId);

    const booking = await findBookingForDriver(bId, driverId);
    if (!booking) {
        throw new AppError(
            "Booking not found or not assigned to this driver.",
            404,
            "BOOKING_NOT_FOUND"
        );
    }

    const message = String(payload.message || "").trim();
    if (!message) {
        throw new AppError("message is required.", 422, "MESSAGE_REQUIRED");
    }

    const chatId = await insertTripChat({ bookingId: bId, driverId, message });

    return {
        chat: {
            id:          chatId,
            booking_id:  bId,
            driver_id:   driverId,
            user_id:     null,
            message,
            sender_type: "driver",
        },
    };
}

// ─── GET /trips/:bookingId/chat ───────────────────────────────────────────────

/**
 * Get chat history for a trip.
 * Driver must be the assigned driver on the booking.
 */
export async function getTripChat(auth, bookingId) {
    const driverId = assertDriverId(auth);
    const bId      = Number(bookingId);

    const booking = await findBookingForDriver(bId, driverId);
    if (!booking) {
        throw new AppError(
            "Booking not found or not assigned to this driver.",
            404,
            "BOOKING_NOT_FOUND"
        );
    }

    const items = await listTripChats(bId);
    return { items };
}

// ─── GET /trips/:bookingId/route ──────────────────────────────────────────────

// ─── GET /trips/history ───────────────────────────────────────────────────────

const TERMINAL_STATUSES = new Set([2, 3, 4, 5]);

/**
 * Paginated trip history for the driver.
 * Supports filters: status, fromDate, toDate, keyword, page, limit.
 */
export async function getTripHistory(auth, query = {}) {
    const driverId = assertDriverId(auth);

    const page  = Math.max(Number(query.page  || 1),   1);
    const limit = Math.min(Math.max(Number(query.limit || 20), 1), 100);
    const offset = (page - 1) * limit;

    let status;
    if (query.status !== undefined && query.status !== null && query.status !== "") {
        const s = Number(query.status);
        if (!TERMINAL_STATUSES.has(s)) {
            throw new AppError(
                "status filter must be one of 2 (cancelled by user), 3 (completed), 4 (cancelled by driver), 5 (cancelled by admin).",
                422,
                "INVALID_STATUS_FILTER"
            );
        }
        status = s;
    }

    const filters = {
        status,
        fromDate: query.fromDate || undefined,
        toDate:   query.toDate   || undefined,
        keyword:  query.keyword  ? String(query.keyword).trim() : undefined,
        limit,
        offset,
    };

    const [items, total] = await Promise.all([
        listTripHistory(driverId, filters),
        countTripHistory(driverId, filters),
    ]);

    return {
        items,
        pagination: {
            page,
            limit,
            total_items: total,
            total_pages: Math.ceil(total / limit),
        },
    };
}

// ─── GET /trips/history/:bookingId ────────────────────────────────────────────

/**
 * Full history detail for one booking.
 * Includes driver_commision, driver_earnings, driver_settled.
 * Driver must own the booking.
 */
export async function getTripHistoryDetail(auth, bookingId) {
    const driverId = assertDriverId(auth);
    const booking  = await findTripHistoryDetail(Number(bookingId), driverId);
    if (!booking) throw new AppError("Booking not found.", 404, "BOOKING_NOT_FOUND");
    return { booking };
}

/**
 * Get the GPS route for a trip.
 * If driver_travel_route has data → return parsed route_data.
 * Otherwise → return fallback pickup/dropoff coords from bookings.
 */
export async function getTripRoute(auth, bookingId) {
    const driverId = assertDriverId(auth);
    const bId      = Number(bookingId);

    // Ownership check — driver must be assigned to this booking
    const booking = await findBookingByIdForDriver(bId, driverId);
    if (!booking) throw new AppError("Booking not found.", 404, "BOOKING_NOT_FOUND");

    const routeRecord = await findTripRouteData(bId, driverId);

    if (routeRecord?.route_data) {
        let routeData = routeRecord.route_data;
        try {
            routeData = JSON.parse(routeRecord.route_data);
        } catch {
            // Not valid JSON — return raw value; do not throw
        }
        return {
            has_route_data: true,
            route_data:     routeData,
            fallback:       null,
        };
    }

    // No GPS route recorded yet — provide booking coords as fallback
    const fallback = await findBookingFallbackCoords(bId);
    return {
        has_route_data: false,
        route_data:     null,
        fallback,
    };
}
