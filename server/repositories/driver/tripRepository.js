import sqldb from "../../config/sqldatabase.js";

function db(conn) {
    return conn || sqldb;
}

// ─── Pending allocation list ───────────────────────────────────────────────────

/**
 * List ALL pending (status=0) allocations for a driver where the booking
 * is still pending (status=0). Returns full booking info, newest first.
 *
 * The existing findPendingAllocationForDriver in bookingRepository returns
 * only the single latest row — this returns the full list for the app.
 */
export async function listPendingAllocationsForDriver(driverId, conn = null) {
    const [rows] = await db(conn).query(
        `SELECT
            da.id              AS allocation_id,
            da.booking_id,
            da.status          AS allocation_status,
            da.date_allocated,
            b.user_firstname,
            b.user_lastname,
            b.user_phone,
            b.pickup_address,
            b.pickup_long,
            b.pickup_lat,
            b.dropoff_address,
            b.dropoff_long,
            b.dropoff_lat,
            b.waypoint1_address,
            b.waypoint2_address,
            b.est_distance,
            b.est_duration,
            b.estimated_cost,
            b.cur_symbol,
            b.cur_code,
            b.payment_type,
            b.status           AS booking_status,
            b.num_seats,
            b.service_type,
            b.date_created,
            r.r_title          AS route_name,
            rd.ride_type
         FROM driver_allocate da
         INNER JOIN bookings b  ON b.id    = da.booking_id
         LEFT  JOIN routes   r  ON r.id    = b.route_id
         LEFT  JOIN rides    rd ON rd.id   = b.ride_id
         WHERE da.driver_id = ?
           AND da.status    = 0
           AND b.status     = 0
         ORDER BY da.date_allocated DESC`,
        [driverId]
    );

    return rows.map((row) => ({
        allocation_id:     Number(row.allocation_id),
        booking_id:        Number(row.booking_id),
        allocation_status: Number(row.allocation_status),
        date_allocated:    row.date_allocated,
        booking: {
            id:               Number(row.booking_id),
            user_firstname:   row.user_firstname,
            user_lastname:    row.user_lastname,
            user_phone:       row.user_phone,
            pickup_address:   row.pickup_address,
            pickup_long:      row.pickup_long  !== null ? Number(row.pickup_long)  : null,
            pickup_lat:       row.pickup_lat   !== null ? Number(row.pickup_lat)   : null,
            dropoff_address:  row.dropoff_address,
            dropoff_long:     row.dropoff_long !== null ? Number(row.dropoff_long) : null,
            dropoff_lat:      row.dropoff_lat  !== null ? Number(row.dropoff_lat)  : null,
            waypoint1_address: row.waypoint1_address || null,
            waypoint2_address: row.waypoint2_address || null,
            est_distance:     row.est_distance  !== null ? Number(row.est_distance)  : null,
            est_duration:     row.est_duration  !== null ? Number(row.est_duration)  : null,
            estimated_cost:   Number(row.estimated_cost || 0),
            cur_symbol:       row.cur_symbol,
            cur_code:         row.cur_code,
            payment_type:     row.payment_type === null ? null : Number(row.payment_type),
            status:           Number(row.booking_status || 0),
            num_seats:        Number(row.num_seats || 1),
            service_type:     Number(row.service_type || 0),
            route_name:       row.route_name   || null,
            ride_type:        row.ride_type    || null,
            date_created:     row.date_created,
        },
    }));
}

// ─── Coordinate-aware status updates ──────────────────────────────────────────
//
// These complement the existing updateBookingStatus in driver/bookingRepository.js.
// The key difference: they write the drv_*_long/lat columns that the existing
// function does not touch.
//
// COALESCE pattern: if the passed coord IS NULL the column keeps its current
// value; if non-NULL the column is updated. This makes coords truly optional.

/**
 * Transition booking → ARRIVED (6).
 * Writes drv_arv_long, drv_arv_lat if provided.
 */
export async function updateBookingArrived(bookingId, { long = null, lat = null } = {}, conn) {
    const [result] = await db(conn).query(
        `UPDATE bookings
         SET status       = 6,
             date_arrived = COALESCE(date_arrived, NOW()),
             drv_arv_long = COALESCE(?, drv_arv_long),
             drv_arv_lat  = COALESCE(?, drv_arv_lat)
         WHERE id = ? LIMIT 1`,
        [long, lat, bookingId]
    );
    return result.affectedRows === 1;
}

/**
 * Transition booking → ONRIDE (1).
 * Writes drv_start_long, drv_start_lat if provided.
 */
export async function updateBookingStarted(bookingId, { long = null, lat = null } = {}, conn) {
    const [result] = await db(conn).query(
        `UPDATE bookings
         SET status          = 1,
             date_started    = COALESCE(date_started, NOW()),
             drv_start_long  = COALESCE(?, drv_start_long),
             drv_start_lat   = COALESCE(?, drv_start_lat)
         WHERE id = ? LIMIT 1`,
        [long, lat, bookingId]
    );
    return result.affectedRows === 1;
}

/**
 * Transition booking → COMPLETED (3).
 * Writes drv_comp_long, drv_comp_lat, actual_cost, distance_travelled if provided.
 */
export async function updateBookingCompleted(bookingId, {
    long = null,
    lat  = null,
    actualCost = null,
    distanceTravelled = null,
} = {}, conn) {
    const [result] = await db(conn).query(
        `UPDATE bookings
         SET status             = 3,
             date_completed     = COALESCE(date_completed, NOW()),
             drv_comp_long      = COALESCE(?, drv_comp_long),
             drv_comp_lat       = COALESCE(?, drv_comp_lat),
             actual_cost        = COALESCE(?, actual_cost),
             distance_travelled = COALESCE(?, distance_travelled)
         WHERE id = ? LIMIT 1`,
        [long, lat, actualCost, distanceTravelled, bookingId]
    );
    return result.affectedRows === 1;
}

// ─── Booking ownership check ───────────────────────────────────────────────────

/**
 * Lightweight check: is this driver assigned to the booking?
 * Used by chat and route to gate access without loading the full booking.
 */
export async function findBookingForDriver(bookingId, driverId, conn = null) {
    const [rows] = await db(conn).query(
        `SELECT id, driver_id, status
         FROM bookings
         WHERE id = ? AND driver_id = ?
         LIMIT 1`,
        [bookingId, driverId]
    );
    const row = rows[0];
    if (!row) return null;
    return {
        id:        Number(row.id),
        driver_id: Number(row.driver_id),
        status:    Number(row.status),
    };
}

// ─── Chat ─────────────────────────────────────────────────────────────────────

/**
 * Insert a chat message sent by the driver.
 * user_id is left NULL to identify it as a driver-originated message.
 */
export async function insertTripChat({ bookingId, driverId, message }, conn) {
    const [result] = await db(conn).query(
        `INSERT INTO chats (booking_id, driver_id, user_id, chat_msg)
         VALUES (?, ?, NULL, ?)`,
        [bookingId, driverId, message]
    );
    return Number(result.insertId);
}

/**
 * Fetch all chat messages for a booking, chronological order.
 * sender_type is derived: driver_id IS NOT NULL → 'driver', else → 'user'.
 */
export async function listTripChats(bookingId, conn = null) {
    const [rows] = await db(conn).query(
        `SELECT
            c.id,
            c.booking_id,
            c.driver_id,
            c.user_id,
            c.chat_msg         AS message,
            c.date_created,
            CASE
                WHEN c.driver_id IS NOT NULL THEN 'driver'
                ELSE 'user'
            END                AS sender_type
         FROM chats c
         WHERE c.booking_id = ?
         ORDER BY c.date_created ASC, c.id ASC`,
        [bookingId]
    );

    return rows.map((row) => ({
        id:          Number(row.id),
        booking_id:  Number(row.booking_id),
        driver_id:   row.driver_id === null ? null : Number(row.driver_id),
        user_id:     row.user_id   === null ? null : Number(row.user_id),
        message:     row.message,
        sender_type: row.sender_type,
        date_created: row.date_created,
    }));
}

// ─── Travel route ─────────────────────────────────────────────────────────────

/**
 * Fetch the GPS route recorded for a booking.
 * Only returns a row if the driver matches (ownership enforced at DB query).
 */
export async function findTripRouteData(bookingId, driverId, conn = null) {
    const [rows] = await db(conn).query(
        `SELECT id, booking_id, driver_id, route_data
         FROM driver_travel_route
         WHERE booking_id = ? AND driver_id = ?
         ORDER BY id DESC
         LIMIT 1`,
        [bookingId, driverId]
    );
    const row = rows[0];
    if (!row) return null;
    return {
        id:         Number(row.id),
        booking_id: Number(row.booking_id),
        driver_id:  Number(row.driver_id),
        route_data: row.route_data,
    };
}

// ─── Trip history ─────────────────────────────────────────────────────────────

/**
 * Build dynamic WHERE clauses for history queries.
 * Supports: status, fromDate, toDate, keyword (b_uuid OR user_phone).
 */
function buildHistoryWhere(driverId, filters = {}) {
    const clauses = ["b.driver_id = ?"];
    const params  = [driverId];

    // Only terminal statuses unless caller explicitly passes a status
    if (filters.status !== undefined && filters.status !== null) {
        clauses.push("b.status = ?");
        params.push(filters.status);
    } else {
        clauses.push("b.status IN (2, 3, 4, 5)");
    }

    if (filters.fromDate) {
        clauses.push("b.date_created >= ?");
        params.push(`${filters.fromDate} 00:00:00`);
    }
    if (filters.toDate) {
        clauses.push("b.date_created <= ?");
        params.push(`${filters.toDate} 23:59:59`);
    }
    if (filters.keyword) {
        const kw = `%${filters.keyword}%`;
        clauses.push("(b.b_uuid LIKE ? OR b.user_phone LIKE ?)");
        params.push(kw, kw);
    }

    return { whereSql: `WHERE ${clauses.join(" AND ")}`, params };
}

/**
 * Paginated list of completed/cancelled bookings for a driver.
 * Returned fields are enough for a list-row; detail endpoint adds more.
 */
export async function listTripHistory(driverId, filters = {}, conn = null) {
    const { limit, offset } = filters;
    const { whereSql, params } = buildHistoryWhere(driverId, filters);

    const [rows] = await db(conn).query(
        `SELECT
            b.id,
            b.b_uuid,
            b.status,
            b.service_type,
            b.pickup_address,
            b.dropoff_address,
            b.pickup_datetime,
            b.estimated_cost,
            b.actual_cost,
            b.paid_amount,
            b.payment_type,
            b.cur_symbol,
            b.cur_code,
            b.driver_commision,
            b.driver_settled,
            b.cancel_comment,
            b.date_created,
            b.date_completed,
            NULLIF(TRIM(CONCAT(
                COALESCE(b.user_firstname, ''), ' ',
                COALESCE(b.user_lastname, '')
            )), '') AS customer_name,
            b.user_phone,
            r.r_title  AS route_name,
            rd.ride_type
         FROM bookings b
         LEFT JOIN routes r  ON r.id  = b.route_id
         LEFT JOIN rides  rd ON rd.id = b.ride_id
         ${whereSql}
         ORDER BY b.date_created DESC, b.id DESC
         LIMIT ? OFFSET ?`,
        [...params, limit, offset]
    );

    return rows.map((row) => {
        const effectiveCost = Number(row.actual_cost || 0) > 0
            ? Number(row.actual_cost)
            : Number(row.estimated_cost || 0);
        const commisionPct  = Number(row.driver_commision || 0);
        return {
            id:              Number(row.id),
            b_uuid:          row.b_uuid,
            status:          Number(row.status || 0),
            service_type:    Number(row.service_type || 0),
            customer_name:   row.customer_name,
            user_phone:      row.user_phone,
            pickup_address:  row.pickup_address,
            dropoff_address: row.dropoff_address,
            pickup_datetime: row.pickup_datetime,
            estimated_cost:  Number(row.estimated_cost || 0),
            actual_cost:     Number(row.actual_cost    || 0),
            paid_amount:     Number(row.paid_amount    || 0),
            payment_type:    row.payment_type === null ? null : Number(row.payment_type),
            cur_symbol:      row.cur_symbol,
            cur_code:        row.cur_code,
            driver_commision: commisionPct,
            driver_earnings:  commisionPct > 0
                ? Math.round(effectiveCost * commisionPct) / 100
                : null,
            driver_settled:  Number(row.driver_settled || 0),
            cancel_comment:  row.cancel_comment,
            route_name:      row.route_name  || null,
            ride_type:       row.ride_type   || null,
            date_created:    row.date_created,
            date_completed:  row.date_completed,
        };
    });
}

export async function countTripHistory(driverId, filters = {}, conn = null) {
    const { whereSql, params } = buildHistoryWhere(driverId, filters);
    const [rows] = await db(conn).query(
        `SELECT COUNT(*) AS total FROM bookings b ${whereSql}`,
        params
    );
    return Number(rows[0]?.total || 0);
}

/**
 * Full detail for history view — extends the standard booking detail with
 * driver_commision, driver_settled, and computed driver_earnings.
 */
export async function findTripHistoryDetail(bookingId, driverId, conn = null) {
    const [rows] = await db(conn).query(
        `SELECT
            b.id, b.b_uuid, b.user_id,
            b.user_firstname, b.user_lastname, b.user_phone,
            b.driver_id,
            b.pickup_datetime,
            b.pickup_address,  b.pickup_long,  b.pickup_lat,
            b.dropoff_datetime,
            b.dropoff_address, b.dropoff_long, b.dropoff_lat,
            b.waypoint1_address, b.waypoint1_long, b.waypoint1_lat,
            b.waypoint2_address, b.waypoint2_long, b.waypoint2_lat,
            b.est_distance, b.est_duration, b.distance_travelled,
            b.estimated_cost, b.actual_cost, b.cancel_amount,
            b.cur_symbol, b.cur_code,
            b.payment_type, b.status, b.service_type,
            b.haspaid, b.paid_amount, b.cancel_comment,
            b.coupon_code,
            b.driver_commision,
            b.driver_settled,
            b.num_seats,
            b.date_created, b.date_arrived, b.date_started, b.date_completed,
            r.r_title  AS route_name,
            rd.ride_type
         FROM bookings b
         LEFT JOIN routes r  ON r.id  = b.route_id
         LEFT JOIN rides  rd ON rd.id = b.ride_id
         WHERE b.id = ? AND b.driver_id = ?
         LIMIT 1`,
        [bookingId, driverId]
    );
    const row = rows[0];
    if (!row) return null;

    const effectiveCost = Number(row.actual_cost || 0) > 0
        ? Number(row.actual_cost)
        : Number(row.estimated_cost || 0);
    const commisionPct = Number(row.driver_commision || 0);

    return {
        id:               Number(row.id),
        b_uuid:           row.b_uuid,
        user_id:          Number(row.user_id),
        user_firstname:   row.user_firstname,
        user_lastname:    row.user_lastname,
        user_phone:       row.user_phone,
        driver_id:        Number(row.driver_id),
        pickup_datetime:  row.pickup_datetime,
        pickup_address:   row.pickup_address,
        pickup_long:      row.pickup_long  !== null ? Number(row.pickup_long)  : null,
        pickup_lat:       row.pickup_lat   !== null ? Number(row.pickup_lat)   : null,
        dropoff_datetime: row.dropoff_datetime,
        dropoff_address:  row.dropoff_address,
        dropoff_long:     row.dropoff_long !== null ? Number(row.dropoff_long) : null,
        dropoff_lat:      row.dropoff_lat  !== null ? Number(row.dropoff_lat)  : null,
        waypoint1_address: row.waypoint1_address || null,
        waypoint1_long:   row.waypoint1_long !== null ? Number(row.waypoint1_long) : null,
        waypoint1_lat:    row.waypoint1_lat  !== null ? Number(row.waypoint1_lat)  : null,
        waypoint2_address: row.waypoint2_address || null,
        waypoint2_long:   row.waypoint2_long !== null ? Number(row.waypoint2_long) : null,
        waypoint2_lat:    row.waypoint2_lat  !== null ? Number(row.waypoint2_lat)  : null,
        est_distance:     row.est_distance        !== null ? Number(row.est_distance)        : null,
        est_duration:     row.est_duration        !== null ? Number(row.est_duration)        : null,
        distance_travelled: row.distance_travelled !== null ? Number(row.distance_travelled) : null,
        estimated_cost:   Number(row.estimated_cost || 0),
        actual_cost:      Number(row.actual_cost    || 0),
        cancel_amount:    Number(row.cancel_amount  || 0),
        cur_symbol:       row.cur_symbol,
        cur_code:         row.cur_code,
        payment_type:     row.payment_type === null ? null : Number(row.payment_type),
        status:           Number(row.status       || 0),
        service_type:     Number(row.service_type || 0),
        haspaid:          Number(row.haspaid      || 0),
        paid_amount:      Number(row.paid_amount  || 0),
        cancel_comment:   row.cancel_comment,
        coupon_code:      row.coupon_code,
        num_seats:        Number(row.num_seats || 1),
        // Commission & earnings
        driver_commision: commisionPct,
        driver_earnings:  commisionPct > 0
            ? Math.round(effectiveCost * commisionPct) / 100
            : null,
        driver_settled:   Number(row.driver_settled || 0),
        route_name:       row.route_name || null,
        ride_type:        row.ride_type  || null,
        date_created:     row.date_created,
        date_arrived:     row.date_arrived,
        date_started:     row.date_started,
        date_completed:   row.date_completed,
    };
}

/**
 * Get booking pickup/dropoff coordinates as a fallback when no GPS route exists.
 */
export async function findBookingFallbackCoords(bookingId, conn = null) {
    const [rows] = await db(conn).query(
        `SELECT
            pickup_address,   pickup_long,   pickup_lat,
            dropoff_address,  dropoff_long,  dropoff_lat,
            waypoint1_address, waypoint1_long, waypoint1_lat,
            waypoint2_address, waypoint2_long, waypoint2_lat
         FROM bookings
         WHERE id = ? LIMIT 1`,
        [bookingId]
    );
    const row = rows[0];
    if (!row) return null;
    return {
        pickup_address:    row.pickup_address,
        pickup_long:       row.pickup_long    !== null ? Number(row.pickup_long)    : null,
        pickup_lat:        row.pickup_lat     !== null ? Number(row.pickup_lat)     : null,
        dropoff_address:   row.dropoff_address,
        dropoff_long:      row.dropoff_long   !== null ? Number(row.dropoff_long)   : null,
        dropoff_lat:       row.dropoff_lat    !== null ? Number(row.dropoff_lat)    : null,
        waypoint1_address: row.waypoint1_address || null,
        waypoint1_long:    row.waypoint1_long !== null ? Number(row.waypoint1_long) : null,
        waypoint1_lat:     row.waypoint1_lat  !== null ? Number(row.waypoint1_lat)  : null,
        waypoint2_address: row.waypoint2_address || null,
        waypoint2_long:    row.waypoint2_long !== null ? Number(row.waypoint2_long) : null,
        waypoint2_lat:     row.waypoint2_lat  !== null ? Number(row.waypoint2_lat)  : null,
    };
}
