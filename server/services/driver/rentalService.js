import sqldb from "../../config/sqldatabase.js";
import AppError from "../../utils/appError.js";
import {
    completeRentalBooking,
    countDriverRentalBookings,
    countDriverSchedule,
    countOverlappingSlots,
    deleteScheduleSlot,
    findDriverRentalBookingById,
    findScheduleByIdForDriver,
    insertScheduleSlot,
    listDriverRentalBookings,
    listDriverSchedule,
    setRentalStatus,
    updateScheduleSlot,
} from "../../repositories/driver/rentalRepository.js";

// ─── Private helpers ──────────────────────────────────────────────────────────

function assertDriver(auth) {
    const driverId = Number(auth?.userId || 0);
    if (!driverId) throw new AppError("Forbidden", 403, "FORBIDDEN");
    return driverId;
}

function normalizePagination(query = {}) {
    const page  = Math.max(Number(query.page  || 1),   1);
    const limit = Math.min(Math.max(Number(query.limit || 20), 1), 100);
    return { page, limit, offset: (page - 1) * limit };
}

function round2(v) {
    return Number(Number(v || 0).toFixed(2));
}

function toMySqlDatetime(date) {
    return date.toISOString().slice(0, 19).replace("T", " ");
}

/**
 * Rental booking service types that involve a driver.
 * 1 = vehicle rental (no driver)
 * 2 = driver hiring
 * 3 = vehicle with driver
 */
const DRIVER_SERVICE_TYPES = new Set([2, 3]);

/**
 * Valid status transitions for driver actions.
 */
const ACCEPT_FROM   = new Set(["scheduled"]);
const START_FROM    = new Set(["pending"]);
const COMPLETE_FROM = new Set(["in_progress"]);

// ─── Schedule availability ────────────────────────────────────────────────────

/**
 * List this driver's schedule slots with optional filters.
 */
export async function getAvailability(auth, query = {}) {
    const driverId = assertDriver(auth);
    const { page, limit, offset } = normalizePagination(query);

    const filters = {
        status:   query.status   || undefined,
        fromDate: query.fromDate || undefined,
        toDate:   query.toDate   || undefined,
    };

    const [items, total] = await Promise.all([
        listDriverSchedule(driverId, { ...filters, limit, offset }),
        countDriverSchedule(driverId, filters),
    ]);

    return {
        items,
        pagination: {
            page,
            limit,
            total_items:  total,
            total_pages:  Math.ceil(total / limit),
        },
    };
}

/**
 * Create a new availability slot.
 * Rules:
 *  - start_datetime must be < end_datetime
 *  - start_datetime must not be in the past
 *  - No overlap with any existing slot for this driver
 */
export async function createAvailability(auth, payload) {
    const driverId = assertDriver(auth);

    const start = new Date(payload.start_datetime);
    const end   = new Date(payload.end_datetime);

    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
        throw new AppError("start_datetime and end_datetime must be valid datetimes.", 422, "INVALID_DATETIME");
    }
    if (start >= end) {
        throw new AppError("start_datetime must be before end_datetime.", 422, "INVALID_DATETIME_RANGE");
    }
    if (start < new Date()) {
        throw new AppError("start_datetime cannot be in the past.", 422, "DATETIME_IN_PAST");
    }

    const startSql = toMySqlDatetime(start);
    const endSql   = toMySqlDatetime(end);

    const overlaps = await countOverlappingSlots(driverId, startSql, endSql);
    if (overlaps > 0) {
        throw new AppError(
            "This time slot overlaps with an existing schedule entry.",
            409,
            "SCHEDULE_OVERLAP"
        );
    }

    const status     = payload.status === "unavailable" ? "unavailable" : "available";
    const scheduleId = await insertScheduleSlot({
        driverId,
        startDatetime: startSql,
        endDatetime:   endSql,
        locationLong:  payload.location_long  ?? null,
        locationLat:   payload.location_lat   ?? null,
        status,
    });

    return { schedule_id: scheduleId, driver_id: driverId, start_datetime: startSql, end_datetime: endSql, status };
}

/**
 * Update an existing availability slot.
 * Rules:
 *  - Only the owning driver can update
 *  - Cannot update a 'booked' slot (linked to active rental)
 *  - If datetime changes, re-check overlap (excluding self)
 *  - Cannot change status to 'booked' via this endpoint
 */
export async function patchAvailability(auth, scheduleId, payload) {
    const driverId = assertDriver(auth);
    const id = Number(scheduleId);

    const conn = await sqldb.getConnection();
    try {
        await conn.beginTransaction();

        const slot = await findScheduleByIdForDriver(id, driverId, conn, true);
        if (!slot) throw new AppError("Schedule slot not found.", 404, "NOT_FOUND");
        if (slot.status === "booked") {
            throw new AppError("Cannot modify a booked slot linked to an active rental.", 409, "SLOT_BOOKED");
        }

        // Resolve new datetime values — fall back to existing if not provided
        const newStart = payload.start_datetime
            ? new Date(payload.start_datetime)
            : new Date(slot.start_datetime);
        const newEnd = payload.end_datetime
            ? new Date(payload.end_datetime)
            : new Date(slot.end_datetime);

        if (Number.isNaN(newStart.getTime()) || Number.isNaN(newEnd.getTime())) {
            throw new AppError("Invalid datetime value.", 422, "INVALID_DATETIME");
        }
        if (newStart >= newEnd) {
            throw new AppError("start_datetime must be before end_datetime.", 422, "INVALID_DATETIME_RANGE");
        }

        const startSql = toMySqlDatetime(newStart);
        const endSql   = toMySqlDatetime(newEnd);

        // Only re-check overlap if datetime changed
        const datetimeChanged =
            startSql !== toMySqlDatetime(new Date(slot.start_datetime)) ||
            endSql   !== toMySqlDatetime(new Date(slot.end_datetime));

        if (datetimeChanged) {
            const overlaps = await countOverlappingSlots(driverId, startSql, endSql, id, conn);
            if (overlaps > 0) {
                throw new AppError(
                    "Updated time slot overlaps with an existing schedule entry.",
                    409,
                    "SCHEDULE_OVERLAP"
                );
            }
        }

        // Build update payload — only defined fields
        const updates = {};
        if (payload.start_datetime !== undefined) updates.startDatetime = startSql;
        if (payload.end_datetime   !== undefined) updates.endDatetime   = endSql;
        if (payload.location_long  !== undefined) updates.locationLong  = payload.location_long  ?? null;
        if (payload.location_lat   !== undefined) updates.locationLat   = payload.location_lat   ?? null;
        if (payload.status !== undefined && payload.status !== "booked") {
            updates.status = payload.status;
        }

        await updateScheduleSlot(id, updates, conn);
        await conn.commit();

        return { schedule_id: id, ...updates };
    } catch (err) {
        await conn.rollback();
        throw err;
    } finally {
        conn.release();
    }
}

/**
 * Delete an availability slot.
 * Cannot delete a 'booked' slot.
 */
export async function deleteAvailability(auth, scheduleId) {
    const driverId = assertDriver(auth);
    const id = Number(scheduleId);

    const conn = await sqldb.getConnection();
    try {
        await conn.beginTransaction();

        const slot = await findScheduleByIdForDriver(id, driverId, conn, true);
        if (!slot) throw new AppError("Schedule slot not found.", 404, "NOT_FOUND");
        if (slot.status === "booked") {
            throw new AppError("Cannot delete a booked slot linked to an active rental.", 409, "SLOT_BOOKED");
        }

        await deleteScheduleSlot(id, conn);
        await conn.commit();

        return { schedule_id: id, deleted: true };
    } catch (err) {
        await conn.rollback();
        throw err;
    } finally {
        conn.release();
    }
}

// ─── Rental bookings ──────────────────────────────────────────────────────────

/**
 * Paginated list of driver-hiring / vehicle-with-driver bookings for this driver.
 * Filters: status, fromDate, toDate, service_type (optional override).
 */
export async function getRentalBookings(auth, query = {}) {
    const driverId = assertDriver(auth);
    const { page, limit, offset } = normalizePagination(query);

    const filters = {
        status:      query.status       || undefined,
        fromDate:    query.fromDate      || undefined,
        toDate:      query.toDate        || undefined,
        serviceType: query.service_type !== undefined ? Number(query.service_type) : undefined,
        limit,
        offset,
        page,
    };

    const [items, total] = await Promise.all([
        listDriverRentalBookings(driverId, filters),
        countDriverRentalBookings(driverId, filters),
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
 * Full detail of a single rental booking assigned to this driver.
 */
export async function getRentalBookingDetail(auth, rentalId) {
    const driverId = assertDriver(auth);
    const id = Number(rentalId);
    if (!Number.isInteger(id) || id < 1) {
        throw new AppError("Invalid rental ID.", 422, "INVALID_RENTAL_ID");
    }

    const booking = await findDriverRentalBookingById(id, driverId);
    if (!booking) throw new AppError("Rental booking not found.", 404, "NOT_FOUND");
    if (!DRIVER_SERVICE_TYPES.has(booking.service_type)) {
        throw new AppError("Rental booking not found.", 404, "NOT_FOUND");
    }

    return { booking };
}

/**
 * Driver accepts a rental booking (scheduled → pending).
 * Only applicable to service_type 2 or 3.
 * Uses FOR UPDATE to prevent race conditions on the same booking.
 */
export async function acceptRentalBooking(auth, rentalId) {
    const driverId = assertDriver(auth);
    const id = Number(rentalId);

    const conn = await sqldb.getConnection();
    try {
        await conn.beginTransaction();

        const booking = await findDriverRentalBookingById(id, driverId, conn, true);
        if (!booking) throw new AppError("Rental booking not found.", 404, "NOT_FOUND");

        if (!DRIVER_SERVICE_TYPES.has(booking.service_type)) {
            throw new AppError(
                "Only driver-hiring (2) or vehicle-with-driver (3) bookings can be accepted.",
                422,
                "INVALID_SERVICE_TYPE"
            );
        }
        if (!ACCEPT_FROM.has(booking.status)) {
            throw new AppError(
                `Cannot accept a booking with status '${booking.status}'. Must be 'scheduled'.`,
                409,
                "INVALID_STATUS_TRANSITION"
            );
        }

        await setRentalStatus(id, "pending", conn);
        await conn.commit();

        return { rental_id: id, status: "pending" };
    } catch (err) {
        await conn.rollback();
        throw err;
    } finally {
        conn.release();
    }
}

/**
 * Driver starts a rental booking (pending → in_progress).
 */
export async function startRentalBooking(auth, rentalId) {
    const driverId = assertDriver(auth);
    const id = Number(rentalId);

    const conn = await sqldb.getConnection();
    try {
        await conn.beginTransaction();

        const booking = await findDriverRentalBookingById(id, driverId, conn, true);
        if (!booking) throw new AppError("Rental booking not found.", 404, "NOT_FOUND");

        if (!START_FROM.has(booking.status)) {
            throw new AppError(
                `Cannot start a booking with status '${booking.status}'. Must be 'pending'.`,
                409,
                "INVALID_STATUS_TRANSITION"
            );
        }

        await setRentalStatus(id, "in_progress", conn);
        await conn.commit();

        return { rental_id: id, status: "in_progress" };
    } catch (err) {
        await conn.rollback();
        throw err;
    } finally {
        conn.release();
    }
}

/**
 * Driver completes a rental booking (in_progress → completed).
 *
 * Overtime is computed when:
 *  - actual_end_datetime > end_datetime (booking ran over schedule)
 *  - The booking has a package with extra_hour_fee > 0
 *
 * Wallet settlement is NOT performed here — admin handles that separately
 * (consistent with bookings.driver_settled pattern).
 *
 * Optional body fields: distance_travelled_km (from GPS).
 */
export async function completeRentalBookingService(auth, rentalId, payload = {}) {
    const driverId = assertDriver(auth);
    const id = Number(rentalId);

    const conn = await sqldb.getConnection();
    try {
        await conn.beginTransaction();

        const booking = await findDriverRentalBookingById(id, driverId, conn, true);
        if (!booking) throw new AppError("Rental booking not found.", 404, "NOT_FOUND");

        if (!COMPLETE_FROM.has(booking.status)) {
            throw new AppError(
                `Cannot complete a booking with status '${booking.status}'. Must be 'in_progress'.`,
                409,
                "INVALID_STATUS_TRANSITION"
            );
        }

        const now       = new Date();
        const endDt     = new Date(booking.end_datetime);
        const actualEnd = toMySqlDatetime(now);

        // ── Overtime calculation ──────────────────────────────────────────────
        let extraTimeFee     = round2(booking.extra_time_fee);      // keep existing if no package
        let extraDistanceFee = round2(booking.extra_distance_fee);  // keep existing

        if (booking.duration_hours && booking.extra_hour_fee > 0 && now > endDt) {
            const overtimeMs    = now.getTime() - endDt.getTime();
            const overtimeHours = Math.ceil(overtimeMs / (60 * 60 * 1000));
            extraTimeFee = round2(overtimeHours * Number(booking.extra_hour_fee));
        }

        // Accept optional distance override from driver GPS
        const distKm = payload.distance_travelled_km !== undefined
            ? Number(payload.distance_travelled_km)
            : null;

        const totalPrice = round2(
            Number(booking.base_price || 0) +
            extraTimeFee +
            extraDistanceFee +
            Number(booking.deposit_amount || 0)
        );

        await completeRentalBooking(
            {
                rentalId:             id,
                actualEndDatetime:    actualEnd,
                extraTimeFee,
                extraDistanceFee,
                totalPrice,
                distanceTravelledKm:  distKm,
            },
            conn
        );

        await conn.commit();

        return {
            rental_id:          id,
            status:             "completed",
            actual_end_datetime: actualEnd,
            extra_time_fee:     extraTimeFee,
            extra_distance_fee: extraDistanceFee,
            total_price:        totalPrice,
        };
    } catch (err) {
        await conn.rollback();
        throw err;
    } finally {
        conn.release();
    }
}
