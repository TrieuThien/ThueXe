import sqldb from "../../config/sqldatabase.js";
import AppError from "../../utils/appError.js";
import {
    assignDriverToBooking,
    countBookingHistoryByDriver,
    createDriverWalletAccount,
    findActiveBookingByDriver,
    findAllocationForDriverBooking,
    findBookingByIdForDriver,
    findDriverCurrentLocationForService,
    findPendingAllocationForDriver,
    incrementDriverCancelCount,
    incrementDriverCompletedCount,
    listBookingHistoryByDriver,
    setBookingAcceptanceData,
    setBookingArrivedLocation,
    setBookingCompletionData,
    setBookingStartLocation,
    updateAllocationStatus,
    updateBookingStatus,
} from "../../repositories/driver/bookingRepository.js";
import { findDriverById } from "../../repositories/driver/authRepository.js";
import { findDriverWallet } from "../../repositories/driver/walletRepository.js";
import { insertWalletLedger, updateWalletBalance } from "../../repositories/walletRepository.js";
import { findSystemSettingByKey, findTariffWaitData } from "../../repositories/bookingRepository.js";
import { notifyRideAccepted, notifyRideRejected } from "../rideDispatchService.js";

// ─── Booking status constants (must stay in sync with bookings.status) ─────
const BOOKING_STATUS = {
    PENDING: 0,
    ONRIDE: 1,
    CANCELLED_BY_USER: 2,
    COMPLETED: 3,
    CANCELLED_BY_DRIVER: 4,
    CANCELLED_BY_ADMIN: 5,
    ARRIVED: 6,
};

const TERMINAL_STATUSES = new Set([2, 3, 4, 5]);

// driver_allocate.status
const ALLOCATION_STATUS = {
    PENDING: 0,
    ACCEPTED: 1,
    REJECTED: 2,
    TIMEOUT: 3,
    FINALIZED: 4,
};

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
 * Returns the driver's current state:
 *  - active booking (non-terminal) if one exists, OR
 *  - pending allocation waiting for response, OR
 *  - null if driver is free
 */
export async function getActiveBooking(auth) {
    const driverId = assertDriver(auth);

    // 1. Check if driver already has an active booking
    const active = await findActiveBookingByDriver(driverId);
    if (active) {
        return { type: "active_booking", booking: active };
    }

    // 2. Check if there is a pending allocation waiting for response
    const allocation = await findPendingAllocationForDriver(driverId);
    if (allocation) {
        return { type: "pending_allocation", allocation };
    }

    return { type: "idle", booking: null, allocation: null };
}

/**
 * Paginated booking history (terminal statuses only).
 * Optional filter: status (2=cancelled_user, 3=completed, 4=cancelled_driver, 5=cancelled_admin)
 */
export async function getBookingHistory(auth, query = {}) {
    const driverId = assertDriver(auth);
    const { page, limit, offset } = normalizePagination(query);

    let status = undefined;
    if (query.status !== undefined && query.status !== null && query.status !== "") {
        const s = Number(query.status);
        if (!TERMINAL_STATUSES.has(s)) {
            throw new AppError(
                "status filter must be one of 2, 3, 4, 5.",
                422,
                "INVALID_STATUS_FILTER"
            );
        }
        status = s;
    }

    const [items, total] = await Promise.all([
        listBookingHistoryByDriver(driverId, { status, limit, offset }),
        countBookingHistoryByDriver(driverId, { status }),
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

/**
 * Get a single booking detail. Driver must own the booking.
 */
export async function getBookingDetail(auth, bookingId) {
    const driverId = assertDriver(auth);

    const booking = await findBookingByIdForDriver(Number(bookingId), driverId);

    if (!booking) {
        throw new AppError("Booking not found.", 404, "BOOKING_NOT_FOUND");
    }

    return { booking };
}

/**
 * Accept a pending allocation.
 * driver_allocate must be PENDING (0) and booking must be PENDING (0).
 * Sets driver on the booking if not already assigned.
 */
export async function acceptBooking(auth, bookingId) {
    const driverId = assertDriver(auth);
    const bId = Number(bookingId);

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

        // Fetch driver info to set on booking
        const driver = await findDriverById(driverId);
        if (!driver || driver.account_deleted === 1) {
            throw new AppError("Driver not found.", 404, "DRIVER_NOT_FOUND");
        }

        // Update allocation to accepted
        await updateAllocationStatus(allocation.id, ALLOCATION_STATUS.ACCEPTED, conn);

        // Assign driver to booking if not already set
        await assignDriverToBooking(bId, { driver_id: driverId, firstname: driver.firstname, lastname: driver.lastname, phone: driver.phone }, conn);

        // Save driver acceptance location and commission rate
        const driverLocation = await findDriverCurrentLocationForService(driverId, conn);
        const commissionRaw = Number(driver.driver_commision || 0);
        const commissionRate = commissionRaw > 0
            ? commissionRaw
            : Number((await findSystemSettingByKey("driver_commission_rate", conn)) || 80);
        await setBookingAcceptanceData(bId, {
            drv_acc_long: driverLocation?.long ?? null,
            drv_acc_lat: driverLocation?.lat ?? null,
            driver_commision: commissionRate,
        }, conn);

        await conn.commit();

        const booking = await findBookingByIdForDriver(bId, driverId);

        // Notify dispatch engine to stop timer and inform customer
        if (booking) {
            notifyRideAccepted(bId, driverId, booking.user_id, {
                firstname:     driver.firstname,
                lastname:      driver.lastname,
                phone:         driver.phone,
                driver_rating: driver.driver_rating ?? null,
                current_lat:   driverLocation?.lat ?? null,
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

/**
 * Reject a pending allocation.
 * driver_allocate must be PENDING (0).
 */
export async function rejectBooking(auth, bookingId) {
    const driverId = assertDriver(auth);
    const bId = Number(bookingId);

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

        // Fetch booking pickup coords so dispatch can resume from the same location
        const [bookingRows] = await conn.query(
            "SELECT user_id, pickup_lat, pickup_long FROM bookings WHERE id = ? LIMIT 1",
            [bId]
        );

        await conn.commit();

        // Resume dispatch for the next driver (fire-and-forget)
        if (bookingRows[0]) {
            const { user_id, pickup_lat, pickup_long } = bookingRows[0];
            notifyRideRejected(bId, Number(user_id), Number(pickup_lat), Number(pickup_long));
        }

        return { message: "Booking rejected." };
    } catch (error) {
        await conn.rollback();
        throw error;
    } finally {
        conn.release();
    }
}

/**
 * Mark driver as arrived at pickup location.
 * Booking must be PENDING (0) and driver must be the assigned driver.
 */
export async function markArrived(auth, bookingId) {
    const driverId = assertDriver(auth);
    const bId = Number(bookingId);

    const conn = await sqldb.getConnection();
    try {
        await conn.beginTransaction();

        const booking = await findBookingByIdForDriver(bId, driverId, conn, true);

        if (!booking) {
            throw new AppError("Booking not found.", 404, "BOOKING_NOT_FOUND");
        }

        if (booking.status !== BOOKING_STATUS.PENDING) {
            throw new AppError(
                `Cannot mark arrived: booking status is ${booking.status}.`,
                409,
                "INVALID_BOOKING_STATUS"
            );
        }

        await updateBookingStatus(bId, BOOKING_STATUS.ARRIVED, conn);

        const driverLocation = await findDriverCurrentLocationForService(driverId, conn);
        await setBookingArrivedLocation(bId, {
            drv_arv_long: driverLocation?.long ?? null,
            drv_arv_lat: driverLocation?.lat ?? null,
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

/**
 * Start the ride.
 * Booking must be ARRIVED (6).
 */
export async function startRide(auth, bookingId) {
    const driverId = assertDriver(auth);
    const bId = Number(bookingId);

    const conn = await sqldb.getConnection();
    try {
        await conn.beginTransaction();

        const booking = await findBookingByIdForDriver(bId, driverId, conn, true);

        if (!booking) {
            throw new AppError("Booking not found.", 404, "BOOKING_NOT_FOUND");
        }

        if (booking.status !== BOOKING_STATUS.ARRIVED) {
            throw new AppError(
                `Cannot start ride: booking status is ${booking.status}. Driver must mark arrived first.`,
                409,
                "INVALID_BOOKING_STATUS"
            );
        }

        await updateBookingStatus(bId, BOOKING_STATUS.ONRIDE, conn);

        const driverLocation = await findDriverCurrentLocationForService(driverId, conn);
        await setBookingStartLocation(bId, {
            drv_start_long: driverLocation?.long ?? null,
            drv_start_lat: driverLocation?.lat ?? null,
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

/**
 * Complete the ride.
 * Booking must be ONRIDE (1).
 * Calculates wait time, actual cost, credits driver wallet, marks driver_settled.
 */
export async function completeRide(auth, bookingId, payload = {}) {
    const driverId = assertDriver(auth);
    const bId = Number(bookingId);

    const conn = await sqldb.getConnection();
    try {
        await conn.beginTransaction();

        const booking = await findBookingByIdForDriver(bId, driverId, conn, true);

        if (!booking) {
            throw new AppError("Booking not found.", 404, "BOOKING_NOT_FOUND");
        }

        if (booking.status !== BOOKING_STATUS.ONRIDE) {
            throw new AppError(
                `Cannot complete ride: booking status is ${booking.status}.`,
                409,
                "INVALID_BOOKING_STATUS"
            );
        }

        // ── 1. Calculate wait time ────────────────────────────────────────────
        const arrivedAt = booking.date_arrived ? new Date(booking.date_arrived) : null;
        const startedAt = booking.date_started ? new Date(booking.date_started) : null;
        const rawWaitSecs = (arrivedAt && startedAt)
            ? Math.max(0, (startedAt.getTime() - arrivedAt.getTime()) / 1000)
            : 0;

        const tariffWait = booking.route_id && booking.ride_id
            ? await findTariffWaitData({ routeId: booking.route_id, rideId: booking.ride_id, serviceType: booking.service_type || 0 }, conn)
            : null;

        const nowHour = new Date().getHours();
        const isNight = nowHour >= 22 || nowHour < 5;
        const freeWaitMinutes = isNight
            ? (tariffWait?.nwait_time ?? tariffWait?.wait_time ?? Number(await findSystemSettingByKey("free_waiting_minutes", conn) || 5))
            : (tariffWait?.wait_time ?? Number(await findSystemSettingByKey("free_waiting_minutes", conn) || 5));
        const freeWaitSecs = freeWaitMinutes * 60;
        const totalWaitTime = Math.max(0, Math.round(rawWaitSecs - freeWaitSecs));

        const waitCostPerMin = isNight
            ? (tariffWait?.nwait_cost_per_minute || tariffWait?.wait_cost_per_minute || 0)
            : (tariffWait?.wait_cost_per_minute || 0);
        const totalWaitTimeCost = Number(((totalWaitTime / 60) * waitCostPerMin).toFixed(2));

        // ── 2. Calculate actual cost ──────────────────────────────────────────
        const baseCost = Number(booking.estimated_cost || 0);
        const actualCost = payload.actual_cost !== undefined
            ? Number(payload.actual_cost)
            : Number((baseCost + totalWaitTimeCost).toFixed(2));

        // ── 3. Update booking status + actual cost ────────────────────────────
        await updateBookingStatus(bId, BOOKING_STATUS.COMPLETED, conn, {
            actual_cost: actualCost,
            distance_travelled: payload.distance_travelled !== undefined ? Number(payload.distance_travelled) : null,
        });

        // ── 4. Save completion location + wait time data ──────────────────────
        const driverLocation = await findDriverCurrentLocationForService(driverId, conn);
        await setBookingCompletionData(bId, {
            drv_comp_long: driverLocation?.long ?? null,
            drv_comp_lat: driverLocation?.lat ?? null,
            total_wait_time: totalWaitTime,
            total_wait_time_cost: totalWaitTimeCost,
            driver_settled: 0,
        }, conn);

        // ── 5. Settle driver earnings ─────────────────────────────────────────
        const commissionRate = Number(booking.driver_commision || 0)
            || Number(await findSystemSettingByKey("driver_commission_rate", conn) || 80);
        const driverEarnings = Number(((actualCost * commissionRate) / 100).toFixed(2));

        if (driverEarnings > 0) {
            let driverWallet = await findDriverWallet(driverId, conn, true);

            if (!driverWallet) {
                const [[curRow]] = await conn.query(
                    `SELECT id FROM currencies ORDER BY \`default\` DESC, id ASC LIMIT 1`
                );
                const currencyId = Number(curRow?.id || 1);
                await createDriverWalletAccount({ driverId, currencyId }, conn);
                driverWallet = await findDriverWallet(driverId, conn, true);
            }

            if (driverWallet && Number(driverWallet.status) === 1) {
                const nextBalance = Number((driverWallet.balance + driverEarnings).toFixed(2));
                await updateWalletBalance(driverWallet.wallet_id, nextBalance, conn);
                await insertWalletLedger({
                    wallet_id: driverWallet.wallet_id,
                    payment_id: null,
                    amount: driverEarnings,
                    balance_after: nextBalance,
                    direction: "credit",
                    entry_type: "commission",
                    source_type: "ride_booking",
                    source_id: bId,
                    description: `Thu nhập chuyến xe #${bId}`,
                }, conn);

                await setBookingCompletionData(bId, { driver_settled: 1 }, conn);
            }
        }

        await incrementDriverCompletedCount(driverId, conn);

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

/**
 * Cancel the ride.
 * Allowed from PENDING (0), ARRIVED (6), or ONRIDE (1).
 * Sets status to CANCELLED_BY_DRIVER (4).
 */
export async function cancelRide(auth, bookingId, payload = {}) {
    const driverId = assertDriver(auth);
    const bId = Number(bookingId);

    const CANCELLABLE_STATUSES = new Set([
        BOOKING_STATUS.PENDING,
        BOOKING_STATUS.ARRIVED,
        BOOKING_STATUS.ONRIDE,
    ]);

    const conn = await sqldb.getConnection();
    try {
        await conn.beginTransaction();

        const booking = await findBookingByIdForDriver(bId, driverId, conn, true);

        if (!booking) {
            throw new AppError("Booking not found.", 404, "BOOKING_NOT_FOUND");
        }

        if (!CANCELLABLE_STATUSES.has(booking.status)) {
            throw new AppError(
                `Cannot cancel: booking status is ${booking.status}.`,
                409,
                "INVALID_BOOKING_STATUS"
            );
        }

        const cancelComment = String(payload.cancel_comment || "").trim() || null;

        await updateBookingStatus(bId, BOOKING_STATUS.CANCELLED_BY_DRIVER, conn, {
            cancel_comment: cancelComment,
        });
        await incrementDriverCancelCount(driverId, conn);

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
