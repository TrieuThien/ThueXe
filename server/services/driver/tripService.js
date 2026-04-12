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
    updateBookingStatus,         // used by cancelTrip (status=4, cancel_comment)
} from "../../repositories/driver/bookingRepository.js";

import { findDriverById } from "../../repositories/driver/authRepository.js";

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

        // assignDriverToBooking uses WHERE driver_id IS NULL — safe against
        // concurrent accepts: the second driver will find driver_id already set
        // and affectedRows = 0 (which is acceptable; the first one wins).
        await assignDriverToBooking(bId, {
            driver_id: driverId,
            firstname: driver.firstname,
            lastname:  driver.lastname,
            phone:     driver.phone,
        }, conn);

        await conn.commit();

        const booking = await findBookingByIdForDriver(bId, driverId);
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

        await updateBookingArrived(bId, {
            long: payload.long ?? null,
            lat:  payload.lat  ?? null,
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

        await updateBookingStarted(bId, {
            long: payload.long ?? null,
            lat:  payload.lat  ?? null,
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

        await updateBookingCompleted(bId, {
            long:             payload.long              ?? null,
            lat:              payload.lat               ?? null,
            actualCost:       payload.actual_cost        != null ? Number(payload.actual_cost)        : null,
            distanceTravelled: payload.distance_travelled != null ? Number(payload.distance_travelled) : null,
        }, conn);

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
