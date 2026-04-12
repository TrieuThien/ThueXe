import sqldb from "../../config/sqldatabase.js";

function db(conn = null) {
    return conn || sqldb;
}

// Driver rental bookings are only for service_type 2 (driver hiring)
// and service_type 3 (vehicle with driver).
const DRIVER_SERVICE_TYPES = [2, 3];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function buildRentalWhere(driverId, filters = {}) {
    const clauses = ["rb.driver_id = ?"];
    const params  = [driverId];

    // Default: only driver-relevant service types unless caller overrides
    if (filters.serviceType !== undefined) {
        clauses.push("rb.service_type = ?");
        params.push(filters.serviceType);
    } else {
        clauses.push(`rb.service_type IN (${DRIVER_SERVICE_TYPES.join(",")})`);
    }

    if (filters.status) {
        clauses.push("rb.status = ?");
        params.push(filters.status);
    }
    if (filters.fromDate) {
        clauses.push("rb.start_datetime >= ?");
        params.push(`${filters.fromDate} 00:00:00`);
    }
    if (filters.toDate) {
        clauses.push("rb.start_datetime <= ?");
        params.push(`${filters.toDate} 23:59:59`);
    }

    return { whereSql: `WHERE ${clauses.join(" AND ")}`, params };
}

// ─── Schedule CRUD ────────────────────────────────────────────────────────────

export async function listDriverSchedule(
    driverId,
    { status, fromDate, toDate, limit, offset } = {},
    conn = null
) {
    const clauses = ["driver_id = ?"];
    const params  = [driverId];

    if (status) { clauses.push("status = ?"); params.push(status); }
    if (fromDate) { clauses.push("start_datetime >= ?"); params.push(`${fromDate} 00:00:00`); }
    if (toDate)   { clauses.push("start_datetime <= ?"); params.push(`${toDate} 23:59:59`); }

    params.push(limit, offset);

    const [rows] = await db(conn).query(
        `SELECT schedule_id, driver_id, start_datetime, end_datetime,
                location_long, location_lat, status, rental_id, created_at
         FROM driver_schedule
         WHERE ${clauses.join(" AND ")}
         ORDER BY start_datetime ASC, schedule_id DESC
         LIMIT ? OFFSET ?`,
        params
    );

    return rows.map(mapScheduleRow);
}

export async function countDriverSchedule(
    driverId,
    { status, fromDate, toDate } = {},
    conn = null
) {
    const clauses = ["driver_id = ?"];
    const params  = [driverId];

    if (status) { clauses.push("status = ?"); params.push(status); }
    if (fromDate) { clauses.push("start_datetime >= ?"); params.push(`${fromDate} 00:00:00`); }
    if (toDate)   { clauses.push("start_datetime <= ?"); params.push(`${toDate} 23:59:59`); }

    const [rows] = await db(conn).query(
        `SELECT COUNT(*) AS cnt FROM driver_schedule WHERE ${clauses.join(" AND ")}`,
        params
    );
    return Number(rows[0]?.cnt || 0);
}

/**
 * Find a single schedule slot owned by this driver.
 * Pass forUpdate=true inside a transaction to lock the row.
 */
export async function findScheduleByIdForDriver(
    scheduleId,
    driverId,
    conn = null,
    forUpdate = false
) {
    const lock = forUpdate ? " FOR UPDATE" : "";
    const [rows] = await db(conn).query(
        `SELECT schedule_id, driver_id, start_datetime, end_datetime,
                location_long, location_lat, status, rental_id, created_at
         FROM driver_schedule
         WHERE schedule_id = ? AND driver_id = ?
         LIMIT 1${lock}`,
        [scheduleId, driverId]
    );
    return rows[0] ? mapScheduleRow(rows[0]) : null;
}

/**
 * Count existing slots for this driver that overlap with [start, end).
 * Used to enforce non-overlapping slot rule on create / patch.
 * Pass excludeScheduleId to skip the current slot when patching.
 */
export async function countOverlappingSlots(
    driverId,
    startDatetime,
    endDatetime,
    excludeScheduleId = null,
    conn = null
) {
    const params = [driverId, endDatetime, startDatetime];
    let extra = "";
    if (excludeScheduleId !== null) {
        extra = " AND schedule_id != ?";
        params.push(excludeScheduleId);
    }
    const [rows] = await db(conn).query(
        `SELECT COUNT(*) AS cnt
         FROM driver_schedule
         WHERE driver_id = ?
           AND start_datetime < ?
           AND end_datetime   > ?${extra}`,
        params
    );
    return Number(rows[0]?.cnt || 0);
}

export async function insertScheduleSlot(
    { driverId, startDatetime, endDatetime, locationLong, locationLat, status = "available" },
    conn = null
) {
    const [result] = await db(conn).query(
        `INSERT INTO driver_schedule
         (driver_id, start_datetime, end_datetime, location_long, location_lat, status)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [driverId, startDatetime, endDatetime, locationLong || null, locationLat || null, status]
    );
    return Number(result.insertId);
}

export async function updateScheduleSlot(
    scheduleId,
    { startDatetime, endDatetime, locationLong, locationLat, status },
    conn = null
) {
    const setParts = [];
    const params   = [];

    if (startDatetime !== undefined) { setParts.push("start_datetime = ?"); params.push(startDatetime); }
    if (endDatetime   !== undefined) { setParts.push("end_datetime = ?");   params.push(endDatetime); }
    if (locationLong  !== undefined) { setParts.push("location_long = ?");  params.push(locationLong ?? null); }
    if (locationLat   !== undefined) { setParts.push("location_lat = ?");   params.push(locationLat ?? null); }
    if (status        !== undefined) { setParts.push("status = ?");          params.push(status); }

    if (setParts.length === 0) return; // nothing to update
    params.push(scheduleId);

    await db(conn).query(
        `UPDATE driver_schedule SET ${setParts.join(", ")} WHERE schedule_id = ? LIMIT 1`,
        params
    );
}

export async function deleteScheduleSlot(scheduleId, conn = null) {
    await db(conn).query(
        `DELETE FROM driver_schedule WHERE schedule_id = ? LIMIT 1`,
        [scheduleId]
    );
}

// ─── Rental bookings (driver-scoped) ─────────────────────────────────────────

export async function listDriverRentalBookings(driverId, filters = {}, conn = null) {
    const { whereSql, params } = buildRentalWhere(driverId, filters);
    const limit  = Math.min(Math.max(Number(filters.limit  || 20), 1), 100);
    const page   = Math.max(Number(filters.page || 1), 1);
    const offset = (page - 1) * limit;

    const [rows] = await db(conn).query(
        `SELECT rb.rental_id, rb.rental_code, rb.user_id, rb.vehicle_id, rb.driver_id,
                rb.package_id, rb.owner_id, rb.service_type,
                rb.start_datetime, rb.end_datetime, rb.actual_end_datetime,
                rb.total_price, rb.payment_status, rb.payment_type,
                rb.status, rb.created_at,
                NULLIF(TRIM(CONCAT(COALESCE(u.firstname,''), ' ', COALESCE(u.lastname,''))), '') AS user_name,
                u.phone AS user_phone,
                rp.package_name,
                v.license_plate,
                NULLIF(TRIM(CONCAT(COALESCE(v.brand,''), ' ', COALESCE(v.model,''))), '') AS vehicle_name
         FROM rental_bookings rb
         LEFT JOIN users u ON u.user_id = rb.user_id
         LEFT JOIN rental_packages rp ON rp.package_id = rb.package_id
         LEFT JOIN vehicles v ON v.vehicle_id = rb.vehicle_id
         ${whereSql}
         ORDER BY rb.start_datetime DESC, rb.rental_id DESC
         LIMIT ? OFFSET ?`,
        [...params, limit, offset]
    );

    return rows.map((row) => ({
        rental_id:           Number(row.rental_id),
        rental_code:         row.rental_code,
        user_id:             Number(row.user_id),
        user_name:           row.user_name,
        user_phone:          row.user_phone,
        vehicle_id:          row.vehicle_id === null ? null : Number(row.vehicle_id),
        driver_id:           row.driver_id  === null ? null : Number(row.driver_id),
        package_id:          row.package_id === null ? null : Number(row.package_id),
        owner_id:            row.owner_id   === null ? null : Number(row.owner_id),
        service_type:        Number(row.service_type || 2),
        start_datetime:      row.start_datetime,
        end_datetime:        row.end_datetime,
        actual_end_datetime: row.actual_end_datetime,
        total_price:         Number(row.total_price || 0),
        payment_status:      row.payment_status,
        payment_type:        row.payment_type === null ? null : Number(row.payment_type),
        status:              row.status,
        created_at:          row.created_at,
        package_name:        row.package_name,
        license_plate:       row.license_plate,
        vehicle_name:        row.vehicle_name,
    }));
}

export async function countDriverRentalBookings(driverId, filters = {}, conn = null) {
    const { whereSql, params } = buildRentalWhere(driverId, filters);
    const [rows] = await db(conn).query(
        `SELECT COUNT(*) AS cnt FROM rental_bookings rb ${whereSql}`,
        params
    );
    return Number(rows[0]?.cnt || 0);
}

/**
 * Full detail of a single rental booking scoped to the driver.
 * Uses a FOR UPDATE lock when called inside a transaction.
 */
export async function findDriverRentalBookingById(
    rentalId,
    driverId,
    conn = null,
    forUpdate = false
) {
    const lock = forUpdate ? " FOR UPDATE" : "";
    const [rows] = await db(conn).query(
        `SELECT rb.rental_id, rb.rental_code, rb.user_id, rb.vehicle_id, rb.driver_id,
                rb.package_id, rb.owner_id, rb.service_type,
                rb.start_datetime, rb.end_datetime, rb.actual_end_datetime,
                rb.pickup_address, rb.pickup_long, rb.pickup_lat,
                rb.dropoff_address, rb.dropoff_long, rb.dropoff_lat,
                rb.distance_limit_km, rb.distance_travelled_km,
                rb.base_price, rb.extra_time_fee, rb.extra_distance_fee,
                rb.deposit_amount, rb.total_price,
                rb.payment_status, rb.payment_type,
                rb.status, rb.cancel_reason, rb.created_at, rb.updated_at,
                NULLIF(TRIM(CONCAT(COALESCE(u.firstname,''), ' ', COALESCE(u.lastname,''))), '') AS user_name,
                u.phone AS user_phone,
                rp.package_name, rp.duration_hours, rp.extra_hour_fee, rp.extra_km_fee,
                v.license_plate,
                NULLIF(TRIM(CONCAT(COALESCE(v.brand,''), ' ', COALESCE(v.model,''))), '') AS vehicle_name,
                vo.fullname AS owner_name
         FROM rental_bookings rb
         LEFT JOIN users u ON u.user_id = rb.user_id
         LEFT JOIN rental_packages rp ON rp.package_id = rb.package_id
         LEFT JOIN vehicles v ON v.vehicle_id = rb.vehicle_id
         LEFT JOIN vehicle_owners vo ON vo.owner_id = rb.owner_id
         WHERE rb.rental_id = ? AND rb.driver_id = ?
         LIMIT 1${lock}`,
        [rentalId, driverId]
    );
    const row = rows[0];
    if (!row) return null;
    return {
        rental_id:             Number(row.rental_id),
        rental_code:           row.rental_code,
        user_id:               Number(row.user_id),
        user_name:             row.user_name,
        user_phone:            row.user_phone,
        vehicle_id:            row.vehicle_id  === null ? null : Number(row.vehicle_id),
        driver_id:             row.driver_id   === null ? null : Number(row.driver_id),
        package_id:            row.package_id  === null ? null : Number(row.package_id),
        owner_id:              row.owner_id    === null ? null : Number(row.owner_id),
        service_type:          Number(row.service_type || 2),
        start_datetime:        row.start_datetime,
        end_datetime:          row.end_datetime,
        actual_end_datetime:   row.actual_end_datetime,
        pickup_address:        row.pickup_address,
        pickup_long:           row.pickup_long  === null ? null : Number(row.pickup_long),
        pickup_lat:            row.pickup_lat   === null ? null : Number(row.pickup_lat),
        dropoff_address:       row.dropoff_address,
        dropoff_long:          row.dropoff_long === null ? null : Number(row.dropoff_long),
        dropoff_lat:           row.dropoff_lat  === null ? null : Number(row.dropoff_lat),
        distance_limit_km:     Number(row.distance_limit_km    || 0),
        distance_travelled_km: Number(row.distance_travelled_km || 0),
        base_price:            Number(row.base_price       || 0),
        extra_time_fee:        Number(row.extra_time_fee   || 0),
        extra_distance_fee:    Number(row.extra_distance_fee || 0),
        deposit_amount:        Number(row.deposit_amount   || 0),
        total_price:           Number(row.total_price      || 0),
        payment_status:        row.payment_status,
        payment_type:          row.payment_type === null ? null : Number(row.payment_type),
        status:                row.status,
        cancel_reason:         row.cancel_reason,
        created_at:            row.created_at,
        updated_at:            row.updated_at,
        package_name:          row.package_name,
        duration_hours:        row.duration_hours === null ? null : Number(row.duration_hours),
        extra_hour_fee:        row.extra_hour_fee === null ? null : Number(row.extra_hour_fee),
        extra_km_fee:          row.extra_km_fee   === null ? null : Number(row.extra_km_fee),
        license_plate:         row.license_plate,
        vehicle_name:          row.vehicle_name,
        owner_name:            row.owner_name,
    };
}

/**
 * Minimal status-only update for accept/start transitions.
 * Only changes status and updated_at.
 */
export async function setRentalStatus(rentalId, status, conn = null) {
    await db(conn).query(
        `UPDATE rental_bookings SET status = ?, updated_at = NOW() WHERE rental_id = ? LIMIT 1`,
        [status, rentalId]
    );
}

/**
 * Full update for the complete transition: status, actual_end, fees, total, distance.
 */
export async function completeRentalBooking(
    {
        rentalId,
        actualEndDatetime,
        extraTimeFee,
        extraDistanceFee,
        totalPrice,
        distanceTravelledKm,
    },
    conn = null
) {
    await db(conn).query(
        `UPDATE rental_bookings
         SET status                = 'completed',
             actual_end_datetime   = ?,
             extra_time_fee        = ?,
             extra_distance_fee    = ?,
             total_price           = ?,
             distance_travelled_km = COALESCE(?, distance_travelled_km),
             updated_at            = NOW()
         WHERE rental_id = ?
         LIMIT 1`,
        [
            actualEndDatetime,
            extraTimeFee,
            extraDistanceFee,
            totalPrice,
            distanceTravelledKm ?? null,
            rentalId,
        ]
    );
}

// ─── Row mapper ───────────────────────────────────────────────────────────────

function mapScheduleRow(row) {
    return {
        schedule_id:    Number(row.schedule_id),
        driver_id:      Number(row.driver_id),
        start_datetime: row.start_datetime,
        end_datetime:   row.end_datetime,
        location_long:  row.location_long  === null ? null : Number(row.location_long),
        location_lat:   row.location_lat   === null ? null : Number(row.location_lat),
        status:         row.status,
        rental_id:      row.rental_id === null ? null : Number(row.rental_id),
        created_at:     row.created_at,
    };
}
