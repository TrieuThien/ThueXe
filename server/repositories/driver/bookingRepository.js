import sqldb from "../../config/sqldatabase.js";

function db(conn) {
    return conn || sqldb;
}

// ─── Active booking ───────────────────────────────────────────────────────────

/**
 * Returns the driver's active (non-terminal) booking.
 * Terminal statuses: 2=cancelled by user, 3=completed, 4=cancelled by driver, 5=cancelled by admin
 */
export async function findActiveBookingByDriver(driverId, conn = null) {
    const [rows] = await db(conn).query(
        `SELECT
            b.id, b.b_uuid, b.user_id,
            b.user_firstname, b.user_lastname, b.user_phone,
            b.driver_id,
            b.pickup_datetime, b.pickup_address, b.pickup_long, b.pickup_lat,
            b.dropoff_address, b.dropoff_long, b.dropoff_lat,
            b.waypoint1_address, b.waypoint1_long, b.waypoint1_lat,
            b.waypoint2_address, b.waypoint2_long, b.waypoint2_lat,
            b.est_distance, b.est_duration,
            b.estimated_cost, b.actual_cost,
            b.cur_symbol, b.cur_code,
            b.payment_type, b.status, b.service_type,
            b.date_created, b.date_arrived, b.date_started,
            r.r_title AS route_name,
            rd.ride_type
         FROM bookings b
         LEFT JOIN routes r ON r.id = b.route_id
         LEFT JOIN rides rd ON rd.id = b.ride_id
         WHERE b.driver_id = ? AND b.status NOT IN (2, 3, 4, 5)
         ORDER BY b.date_created DESC
         LIMIT 1`,
        [driverId]
    );

    return rows[0] ? mapBookingRow(rows[0]) : null;
}

/**
 * Returns a pending allocation for the driver (driver hasn't responded yet).
 * Only returns if the booking is still pending and not yet assigned.
 */
export async function findPendingAllocationForDriver(driverId, conn = null) {
    const [rows] = await db(conn).query(
        `SELECT
            da.id AS allocation_id,
            da.booking_id,
            da.driver_id,
            da.status AS allocation_status,
            da.date_allocated,
            b.user_firstname, b.user_lastname, b.user_phone,
            b.pickup_address, b.pickup_long, b.pickup_lat,
            b.dropoff_address, b.dropoff_long, b.dropoff_lat,
            b.estimated_cost, b.cur_symbol, b.cur_code,
            b.payment_type, b.status AS booking_status,
            b.date_created,
            r.r_title AS route_name,
            rd.ride_type
         FROM driver_allocate da
         INNER JOIN bookings b ON b.id = da.booking_id
         LEFT JOIN routes r ON r.id = b.route_id
         LEFT JOIN rides rd ON rd.id = b.ride_id
         WHERE da.driver_id = ?
           AND da.status = 0
           AND b.status = 0
         ORDER BY da.date_allocated DESC
         LIMIT 1`,
        [driverId]
    );

    const row = rows[0];
    if (!row) return null;

    return {
        allocation_id: Number(row.allocation_id),
        booking_id: Number(row.booking_id),
        allocation_status: Number(row.allocation_status),
        date_allocated: row.date_allocated,
        booking: {
            id: Number(row.booking_id),
            user_firstname: row.user_firstname,
            user_lastname: row.user_lastname,
            user_phone: row.user_phone,
            pickup_address: row.pickup_address,
            pickup_long: row.pickup_long !== null ? Number(row.pickup_long) : null,
            pickup_lat: row.pickup_lat !== null ? Number(row.pickup_lat) : null,
            dropoff_address: row.dropoff_address,
            dropoff_long: row.dropoff_long !== null ? Number(row.dropoff_long) : null,
            dropoff_lat: row.dropoff_lat !== null ? Number(row.dropoff_lat) : null,
            estimated_cost: Number(row.estimated_cost || 0),
            cur_symbol: row.cur_symbol,
            cur_code: row.cur_code,
            payment_type: row.payment_type === null ? null : Number(row.payment_type),
            status: Number(row.booking_status || 0),
            route_name: row.route_name,
            ride_type: row.ride_type,
            date_created: row.date_created,
        },
    };
}

// ─── Booking detail ───────────────────────────────────────────────────────────

/**
 * Fetch a booking ensuring it belongs to this driver.
 * Pass forUpdate=true inside a transaction to lock the row.
 */
export async function findBookingByIdForDriver(bookingId, driverId, conn = null, forUpdate = false) {
    const lockSql = forUpdate ? " FOR UPDATE" : "";
    const [rows] = await db(conn).query(
        `SELECT
            b.id, b.b_uuid, b.user_id,
            b.user_firstname, b.user_lastname, b.user_phone,
            b.driver_id,
            b.pickup_datetime, b.pickup_address, b.pickup_long, b.pickup_lat,
            b.dropoff_datetime, b.dropoff_address, b.dropoff_long, b.dropoff_lat,
            b.waypoint1_address, b.waypoint1_long, b.waypoint1_lat,
            b.waypoint2_address, b.waypoint2_long, b.waypoint2_lat,
            b.est_distance, b.est_duration, b.distance_travelled,
            b.estimated_cost, b.actual_cost, b.cancel_amount,
            b.cur_symbol, b.cur_code,
            b.payment_type, b.status, b.service_type,
            b.haspaid, b.paid_amount, b.cancel_comment,
            b.coupon_code,
            b.date_created, b.date_arrived, b.date_started, b.date_completed,
            r.r_title AS route_name,
            rd.ride_type
         FROM bookings b
         LEFT JOIN routes r ON r.id = b.route_id
         LEFT JOIN rides rd ON rd.id = b.ride_id
         WHERE b.id = ? AND b.driver_id = ?
         LIMIT 1${lockSql}`,
        [bookingId, driverId]
    );

    return rows[0] ? mapBookingDetailRow(rows[0]) : null;
}

// ─── Booking history ──────────────────────────────────────────────────────────

export async function listBookingHistoryByDriver(driverId, { status, limit, offset }, conn = null) {
    const params = [driverId];
    let whereSql = "b.status IN (2, 3, 4, 5)";

    if (status !== undefined && status !== null) {
        whereSql += " AND b.status = ?";
        params.push(status);
    }

    const [rows] = await db(conn).query(
        `SELECT
            b.id, b.pickup_address, b.dropoff_address,
            b.pickup_datetime, b.estimated_cost, b.actual_cost,
            b.paid_amount, b.payment_type, b.status, b.date_created, b.date_completed,
            b.cur_symbol, b.cur_code,
            NULLIF(TRIM(CONCAT(
                COALESCE(b.user_firstname, ''), ' ',
                COALESCE(b.user_lastname, '')
            )), '') AS customer_name
         FROM bookings b
         WHERE b.driver_id = ? AND ${whereSql}
         ORDER BY b.date_created DESC, b.id DESC
         LIMIT ? OFFSET ?`,
        [...params, limit, offset]
    );

    return rows.map((row) => ({
        id: Number(row.id),
        customer_name: row.customer_name,
        pickup_address: row.pickup_address,
        dropoff_address: row.dropoff_address,
        pickup_datetime: row.pickup_datetime,
        estimated_cost: Number(row.estimated_cost || 0),
        actual_cost: Number(row.actual_cost || 0),
        paid_amount: Number(row.paid_amount || 0),
        payment_type: row.payment_type === null ? null : Number(row.payment_type),
        status: Number(row.status || 0),
        cur_symbol: row.cur_symbol,
        cur_code: row.cur_code,
        date_created: row.date_created,
        date_completed: row.date_completed,
    }));
}

export async function countBookingHistoryByDriver(driverId, { status }, conn = null) {
    const params = [driverId];
    let whereSql = "status IN (2, 3, 4, 5)";

    if (status !== undefined && status !== null) {
        whereSql += " AND status = ?";
        params.push(status);
    }

    const [rows] = await db(conn).query(
        `SELECT COUNT(*) AS total_items
         FROM bookings
         WHERE driver_id = ? AND ${whereSql}`,
        params
    );

    return Number(rows[0]?.total_items || 0);
}

// ─── Driver allocation ────────────────────────────────────────────────────────

/**
 * Find the driver_allocate record for a specific booking+driver pair.
 * Pass forUpdate=true inside a transaction to lock the row.
 */
export async function findAllocationForDriverBooking(bookingId, driverId, conn = null, forUpdate = false) {
    const lockSql = forUpdate ? " FOR UPDATE" : "";
    const [rows] = await db(conn).query(
        `SELECT id, booking_id, driver_id, status, date_allocated
         FROM driver_allocate
         WHERE booking_id = ? AND driver_id = ?
         ORDER BY id DESC
         LIMIT 1${lockSql}`,
        [bookingId, driverId]
    );

    return rows[0]
        ? {
              id: Number(rows[0].id),
              booking_id: Number(rows[0].booking_id),
              driver_id: Number(rows[0].driver_id),
              status: Number(rows[0].status),
              date_allocated: rows[0].date_allocated,
          }
        : null;
}

export async function updateAllocationStatus(allocationId, status, conn) {
    const [result] = await db(conn).query(
        `UPDATE driver_allocate SET status = ? WHERE id = ? LIMIT 1`,
        [status, allocationId]
    );
    return result.affectedRows === 1;
}

// ─── Booking status updates ───────────────────────────────────────────────────

/**
 * Update booking status with optional extras.
 * Extras: { cancel_comment, cancel_amount, actual_cost, distance_travelled }
 */
export async function updateBookingStatus(bookingId, status, conn, extras = {}) {
    const [result] = await db(conn).query(
        `UPDATE bookings
         SET status = ?,
             cancel_comment = COALESCE(?, cancel_comment),
             cancel_amount  = COALESCE(?, cancel_amount),
             date_arrived   = CASE WHEN ? = 6 THEN COALESCE(date_arrived, NOW()) ELSE date_arrived END,
             date_started   = CASE WHEN ? = 1 THEN COALESCE(date_started, NOW()) ELSE date_started END,
             date_completed = CASE WHEN ? = 3 THEN COALESCE(date_completed, NOW()) ELSE date_completed END,
             actual_cost    = COALESCE(?, actual_cost),
             distance_travelled = COALESCE(?, distance_travelled)
         WHERE id = ?
         LIMIT 1`,
        [
            status,
            extras.cancel_comment ?? null,
            extras.cancel_amount ?? null,
            status,
            status,
            status,
            extras.actual_cost ?? null,
            extras.distance_travelled ?? null,
            bookingId,
        ]
    );
    return result.affectedRows === 1;
}

/**
 * Set driver info on booking when driver accepts an allocation.
 */
export async function assignDriverToBooking(bookingId, driver, conn) {
    const [result] = await db(conn).query(
        `UPDATE bookings
         SET driver_id = ?,
             driver_firstname = ?,
             driver_lastname  = ?,
             driver_phone     = ?,
             dispatch_mode    = 1
         WHERE id = ? AND driver_id IS NULL
         LIMIT 1`,
        [
            driver.driver_id,
            driver.firstname,
            driver.lastname,
            driver.phone,
            bookingId,
        ]
    );
    return result.affectedRows;
}

// ─── Driver stats counters ────────────────────────────────────────────────────

export async function incrementDriverCancelCount(driverId, conn) {
    await db(conn).query(
        `UPDATE drivers
         SET cancelled_rides = cancelled_rides + 1,
             booking_cancel_freq = booking_cancel_freq + 1
         WHERE driver_id = ?
         LIMIT 1`,
        [driverId]
    );
}

export async function incrementDriverCompletedCount(driverId, conn) {
    await db(conn).query(
        `UPDATE drivers
         SET completed_rides = completed_rides + 1,
             booking_cancel_freq = 0
         WHERE driver_id = ?
         LIMIT 1`,
        [driverId]
    );
}

// ─── Row mappers ──────────────────────────────────────────────────────────────

function mapBookingRow(row) {
    return {
        id: Number(row.id),
        b_uuid: row.b_uuid,
        user_id: Number(row.user_id),
        user_firstname: row.user_firstname,
        user_lastname: row.user_lastname,
        user_phone: row.user_phone,
        driver_id: row.driver_id === null ? null : Number(row.driver_id),
        pickup_datetime: row.pickup_datetime,
        pickup_address: row.pickup_address,
        pickup_long: row.pickup_long !== null ? Number(row.pickup_long) : null,
        pickup_lat: row.pickup_lat !== null ? Number(row.pickup_lat) : null,
        dropoff_address: row.dropoff_address,
        dropoff_long: row.dropoff_long !== null ? Number(row.dropoff_long) : null,
        dropoff_lat: row.dropoff_lat !== null ? Number(row.dropoff_lat) : null,
        waypoint1_address: row.waypoint1_address,
        waypoint2_address: row.waypoint2_address,
        est_distance: row.est_distance !== null ? Number(row.est_distance) : null,
        est_duration: row.est_duration !== null ? Number(row.est_duration) : null,
        estimated_cost: Number(row.estimated_cost || 0),
        actual_cost: Number(row.actual_cost || 0),
        cur_symbol: row.cur_symbol,
        cur_code: row.cur_code,
        payment_type: row.payment_type === null ? null : Number(row.payment_type),
        status: Number(row.status || 0),
        service_type: Number(row.service_type || 0),
        route_name: row.route_name,
        ride_type: row.ride_type,
        date_created: row.date_created,
        date_arrived: row.date_arrived,
        date_started: row.date_started,
    };
}

function mapBookingDetailRow(row) {
    return {
        ...mapBookingRow(row),
        distance_travelled: row.distance_travelled !== null ? Number(row.distance_travelled) : null,
        cancel_amount: Number(row.cancel_amount || 0),
        haspaid: Number(row.haspaid || 0),
        paid_amount: Number(row.paid_amount || 0),
        cancel_comment: row.cancel_comment,
        coupon_code: row.coupon_code,
        date_completed: row.date_completed,
    };
}
