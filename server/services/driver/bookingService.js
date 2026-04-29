import sqldb from "../../config/sqldatabase.js";
import AppError from "../../utils/appError.js";
import {
    assignDriverToBooking,
    countBookingHistoryByDriver,
    findActiveBookingByDriver,
    findAllocationForDriverBooking,
    findBookingByIdForDriver,
    findPendingAllocationForDriver,
    incrementDriverCancelCount,
    incrementDriverCompletedCount,
    listBookingHistoryByDriver,
    updateAllocationStatus,
    updateBookingStatus,
} from "../../repositories/driver/bookingRepository.js";
import { findDriverById } from "../../repositories/driver/authRepository.js";
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

        await conn.commit();

        const booking = await findBookingByIdForDriver(bId, driverId);

        // Notify dispatch engine to stop timer and inform customer
        if (booking) {
            notifyRideAccepted(bId, driverId, booking.user_id, {
                firstname:     driver.firstname,
                lastname:      driver.lastname,
                phone:         driver.phone,
                driver_rating: driver.driver_rating ?? null,
                current_lat:   null,
                current_lng:   null,
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
 * Accepts optional actual_cost and distance_travelled.
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

        const extras = {};
        if (payload.actual_cost !== undefined) {
            extras.actual_cost = Number(payload.actual_cost);
        }
        if (payload.distance_travelled !== undefined) {
            extras.distance_travelled = Number(payload.distance_travelled);
        }

        await updateBookingStatus(bId, BOOKING_STATUS.COMPLETED, conn, extras);
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
