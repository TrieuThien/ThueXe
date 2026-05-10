import sqldb from "../../config/sqldatabase.js";

function db(conn) {
    return conn || sqldb;
}

export async function findCustomerAccount(userId, conn = null) {
    const [rows] = await db(conn).query(
        `SELECT user_id, firstname, lastname, phone, route_id, account_type, account_active, account_deleted, is_activated, booking_cancel_freq
         FROM users
         WHERE user_id = ? AND account_type = 1
         LIMIT 1`,
        [userId]
    );

    const row = rows[0];
    if (!row) return null;

    return {
        user_id: Number(row.user_id),
        firstname: row.firstname,
        lastname: row.lastname,
        phone: row.phone,
        route_id: row.route_id === null ? null : Number(row.route_id),
        account_type: Number(row.account_type || 0),
        account_active: Number(row.account_active || 0),
        account_deleted: Number(row.account_deleted || 0),
        is_activated: Number(row.is_activated || 0),
        booking_cancel_freq: Number(row.booking_cancel_freq || 0),
    };
}

export async function findRouteById(routeId, conn = null) {
    const [rows] = await db(conn).query(
        `SELECT r.id, r.r_title, r.dist_unit, r.city_currency_id, c.symbol AS cur_symbol, c.iso_code AS cur_code
         FROM routes r
         LEFT JOIN currencies c ON c.id = r.city_currency_id
         WHERE r.id = ?
         LIMIT 1`,
        [routeId]
    );

    const row = rows[0];
    if (!row) return null;

    return {
        id: Number(row.id),
        r_title: row.r_title,
        dist_unit: Number(row.dist_unit || 0),
        city_currency_id: Number(row.city_currency_id || 0),
        cur_symbol: row.cur_symbol || "?",
        cur_code: row.cur_code || "VND",
    };
}

export async function findRideById(rideId, conn = null) {
    const [rows] = await db(conn).query(
        `SELECT id, ride_type, ride_desc, avail
         FROM rides
         WHERE id = ?
         LIMIT 1`,
        [rideId]
    );

    const row = rows[0];
    if (!row) return null;

    return {
        id: Number(row.id),
        ride_type: row.ride_type,
        ride_desc: row.ride_desc,
        avail: Number(row.avail || 0),
    };
}

export async function findTariff({ routeId, rideId, serviceType = 0 }, conn = null) {
    const [rows] = await db(conn).query(
        `SELECT id, ride_id, routes_id, service_type,
                cost_per_km, cost_per_minute, pickup_cost, drop_off_cost,
                wait_cost_per_minute, cancel_cost,
                init_distance, ncost_per_km, ncost_per_minute, npickup_cost,
                ndrop_off_cost, nwait_cost_per_minute, ncancel_cost
         FROM rides_tariffs
         WHERE routes_id = ? AND ride_id = ? AND service_type = ?
         LIMIT 1`,
        [routeId, rideId, serviceType]
    );

    const row = rows[0];
    if (!row) return null;

    return {
        id: Number(row.id),
        ride_id: Number(row.ride_id),
        routes_id: Number(row.routes_id),
        service_type: Number(row.service_type || 0),
        cost_per_km: Number(row.cost_per_km || 0),
        cost_per_minute: Number(row.cost_per_minute || 0),
        pickup_cost: Number(row.pickup_cost || 0),
        drop_off_cost: Number(row.drop_off_cost || 0),
        wait_cost_per_minute: Number(row.wait_cost_per_minute || 0),
        cancel_cost: Number(row.cancel_cost || 0),
        init_distance: Number(row.init_distance || 0),
        ncost_per_km: Number(row.ncost_per_km || 0),
        ncost_per_minute: Number(row.ncost_per_minute || 0),
        npickup_cost: Number(row.npickup_cost || 0),
        ndrop_off_cost: Number(row.ndrop_off_cost || 0),
        nwait_cost_per_minute: Number(row.nwait_cost_per_minute || 0),
        ncancel_cost: Number(row.ncancel_cost || 0),
    };
}

export async function findCouponForUser({ couponCode, routeId, userId }, conn = null, forUpdate = false) {
    const lockSql = forUpdate ? " FOR UPDATE" : "";

    const [rows] = await db(conn).query(
        `SELECT
            c.id,
            c.coupon_code,
            c.coupon_title,
            c.city,
            c.visibility,
            c.discount_type,
            c.discount_value,
            c.min_fare,
            c.max_discount_amount,
            c.limit_count,
            c.user_limit_count,
            c.status,
            c.active_date,
            c.expiry_date,
            COALESCE(usage_total.total_used, 0) AS total_used,
            COALESCE(usage_user.user_used, 0) AS user_used,
            COALESCE(v.vehicle_ids, '') AS vehicle_ids
         FROM coupon_codes c
         LEFT JOIN (
            SELECT coupon_id, SUM(times_used) AS total_used
            FROM coupons_used
            GROUP BY coupon_id
         ) usage_total ON usage_total.coupon_id = c.id
         LEFT JOIN (
            SELECT coupon_id, SUM(times_used) AS user_used
            FROM coupons_used
            WHERE user_id = ?
            GROUP BY coupon_id
         ) usage_user ON usage_user.coupon_id = c.id
         LEFT JOIN (
            SELECT coupon_id, GROUP_CONCAT(vehicle_type_id ORDER BY vehicle_type_id ASC SEPARATOR ',') AS vehicle_ids
            FROM coupon_vehicle_types
            GROUP BY coupon_id
         ) v ON v.coupon_id = c.id
         WHERE c.coupon_code = ?
           AND c.city = ?
           AND c.service_type = 0
         LIMIT 1${lockSql}`,
        [userId, couponCode, routeId]
    );

    const row = rows[0];
    if (!row) return null;

    return {
        id: Number(row.id),
        coupon_code: row.coupon_code,
        coupon_title: row.coupon_title,
        city: Number(row.city || 0),
        visibility: Number(row.visibility || 0),
        discount_type: Number(row.discount_type || 0),
        discount_value: Number(row.discount_value || 0),
        min_fare: Number(row.min_fare || 0),
        max_discount_amount: Number(row.max_discount_amount || 0),
        limit_count: Number(row.limit_count || 0),
        user_limit_count: Number(row.user_limit_count || 0),
        status: Number(row.status || 0),
        active_date: row.active_date,
        expiry_date: row.expiry_date,
        total_used: Number(row.total_used || 0),
        user_used: Number(row.user_used || 0),
        vehicle_ids: String(row.vehicle_ids || "")
            .split(",")
            .map((item) => Number(item.trim()))
            .filter((item) => Number.isInteger(item) && item > 0),
    };
}

export async function upsertCouponUsage({ couponId, userId }, conn) {
    const [rows] = await db(conn).query(
        `SELECT id, times_used
         FROM coupons_used
         WHERE coupon_id = ? AND user_id = ?
         LIMIT 1
         FOR UPDATE`,
        [couponId, userId]
    );

    if (!rows[0]) {
        await db(conn).query(
            `INSERT INTO coupons_used (coupon_id, user_id, times_used)
             VALUES (?, ?, 1)`,
            [couponId, userId]
        );
        return 1;
    }

    const targetId = Number(rows[0].id);
    await db(conn).query(
        `UPDATE coupons_used
         SET times_used = times_used + 1
         WHERE id = ?
         LIMIT 1`,
        [targetId]
    );

    return Number(rows[0].times_used || 0) + 1;
}

export async function insertBooking(payload, conn) {
    const [result] = await db(conn).query(
        `INSERT INTO bookings (
            user_id, user_firstname, user_lastname, user_phone,
            pickup_datetime, pickup_address, pickup_long, pickup_lat,
            dropoff_address, dropoff_long, dropoff_lat,
            waypoint1_address, waypoint1_long, waypoint1_lat,
            waypoint2_address, waypoint2_long, waypoint2_lat,
            est_distance, est_duration, estimated_cost, actual_cost,
            cur_symbol, cur_code, route_id, ride_id, payment_type,
            scheduled, scheduled_driver, dispatch_mode, num_seats,
            status, b_uuid, service_type,
            coupon_code, coupon_discount_type, coupon_discount_value,
            coupon_min_fare, coupon_max_discount
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
            payload.user_id,
            payload.user_firstname,
            payload.user_lastname,
            payload.user_phone,
            payload.pickup_datetime,
            payload.pickup_address,
            payload.pickup_long,
            payload.pickup_lat,
            payload.dropoff_address,
            payload.dropoff_long,
            payload.dropoff_lat,
            payload.waypoint1_address,
            payload.waypoint1_long,
            payload.waypoint1_lat,
            payload.waypoint2_address,
            payload.waypoint2_long,
            payload.waypoint2_lat,
            payload.est_distance,
            payload.est_duration,
            payload.estimated_cost,
            payload.actual_cost,
            payload.cur_symbol,
            payload.cur_code,
            payload.route_id,
            payload.ride_id,
            payload.payment_type,
            payload.scheduled,
            payload.scheduled_driver,
            payload.dispatch_mode,
            payload.num_seats,
            payload.status,
            payload.b_uuid,
            payload.service_type,
            payload.coupon_code,
            payload.coupon_discount_type,
            payload.coupon_discount_value,
            payload.coupon_min_fare,
            payload.coupon_max_discount,
        ]
    );

    return Number(result.insertId);
}

export async function findBookingByIdForUser(bookingId, userId, conn = null, forUpdate = false) {
    const lockSql = forUpdate ? " FOR UPDATE" : "";
    const [rows] = await db(conn).query(
        `SELECT
            b.id, b.b_uuid, b.user_id,
            b.user_firstname, b.user_lastname, b.user_phone,
            b.driver_id, b.driver_firstname, b.driver_lastname, b.driver_phone,
            b.pickup_datetime, b.pickup_address, b.pickup_long, b.pickup_lat,
            b.dropoff_datetime, b.dropoff_address, b.dropoff_long, b.dropoff_lat,
            b.waypoint1_address, b.waypoint1_long, b.waypoint1_lat,
            b.waypoint2_address, b.waypoint2_long, b.waypoint2_lat,
            b.est_distance, b.est_duration, b.distance_travelled,
            b.estimated_cost, b.actual_cost, b.cancel_amount,
            b.cur_symbol, b.cur_code, b.route_id, b.ride_id, b.payment_type,
            b.scheduled, b.scheduled_driver, b.dispatch_mode,
            b.haspaid, b.paid_amount, b.cancel_comment,
            b.status, b.service_type,
            b.coupon_code, b.coupon_discount_type, b.coupon_discount_value,
            b.coupon_min_fare, b.coupon_max_discount,
            b.date_created, b.date_started, b.date_completed,
            r.r_title AS route_name,
            rd.ride_type,
            d.account_active AS driver_account_active,
            d.available AS driver_available,
            d.operation_status AS driver_operation_status,
            d.driver_rating AS driver_rating,
            d.car_plate_num AS driver_car_plate_num,
            d.car_model AS driver_car_model,
            d.photo_file AS driver_photo_file
         FROM bookings b
         LEFT JOIN routes r ON r.id = b.route_id
         LEFT JOIN rides rd ON rd.id = b.ride_id
         LEFT JOIN drivers d ON d.driver_id = b.driver_id
         WHERE b.id = ? AND b.user_id = ?
         LIMIT 1${lockSql}`,
        [bookingId, userId]
    );

    return rows[0] || null;
}

export async function findCurrentBookingByUser(userId, conn = null) {
    const [rows] = await db(conn).query(
        `SELECT id
         FROM bookings
         WHERE user_id = ?
           AND status NOT IN (2, 3, 4, 5)
         ORDER BY id DESC
         LIMIT 1`,
        [userId]
    );

    return rows[0] ? Number(rows[0].id) : null;
}

export async function findDriverCurrentLocation(driverId, conn = null) {
    const [rows] = await db(conn).query(
        `SELECT driver_id, \`long\`, lat, b_angle, loc_static_status, loc_static_duration, updated_at
         FROM driver_current_locations
         WHERE driver_id = ?
         LIMIT 1`,
        [driverId]
    );

    return rows[0] || null;
}

export async function findDriverAllocationForBooking(bookingId, conn = null) {
    const [rows] = await db(conn).query(
        `SELECT id, booking_id, driver_id, status, date_allocated
         FROM driver_allocate
         WHERE booking_id = ?
         ORDER BY id DESC
         LIMIT 1`,
        [bookingId]
    );

    return rows[0] || null;
}

export async function listBookingHistoryByUser(userId, { status, limit, offset }, conn = null) {
    const params = [userId];
    let whereSql = "b.status IN (2, 3, 4, 5)";

    if (status !== undefined && status !== null) {
        whereSql += " AND b.status = ?";
        params.push(status);
    }

    const [rows] = await db(conn).query(
        `SELECT b.id
         FROM bookings b
         WHERE b.user_id = ? AND ${whereSql}
         ORDER BY b.date_created DESC, b.id DESC
         LIMIT ? OFFSET ?`,
        [...params, limit, offset]
    );

    return rows.map((row) => Number(row.id));
}

export async function countBookingHistoryByUser(userId, { status }, conn = null) {
    const params = [userId];
    let whereSql = "status IN (2, 3, 4, 5)";

    if (status !== undefined && status !== null) {
        whereSql += " AND status = ?";
        params.push(status);
    }

    const [rows] = await db(conn).query(
        `SELECT COUNT(*) AS total_items
         FROM bookings
         WHERE user_id = ? AND ${whereSql}`,
        params
    );

    return Number(rows[0]?.total_items || 0);
}

export async function updateBookingStatus(bookingId, status, conn, extras = {}) {
    const [result] = await db(conn).query(
        `UPDATE bookings
         SET status = ?,
             cancel_comment = COALESCE(?, cancel_comment),
             cancel_amount = COALESCE(?, cancel_amount),
             date_started = CASE WHEN ? = 1 THEN COALESCE(date_started, NOW()) ELSE date_started END,
             date_completed = CASE WHEN ? = 3 THEN COALESCE(date_completed, NOW()) ELSE date_completed END,
             actual_cost = COALESCE(?, actual_cost),
             distance_travelled = COALESCE(?, distance_travelled)
         WHERE id = ?
         LIMIT 1`,
        [
            status,
            extras.cancel_comment ?? null,
            extras.cancel_amount ?? null,
            status,
            status,
            extras.actual_cost ?? null,
            extras.distance_travelled ?? null,
            bookingId,
        ]
    );

    return result.affectedRows === 1;
}

export async function updateBookingPaymentType(bookingId, paymentType, conn) {
    const [result] = await db(conn).query(
        `UPDATE bookings
         SET payment_type = ?
         WHERE id = ?
         LIMIT 1`,
        [paymentType, bookingId]
    );

    return result.affectedRows === 1;
}

export async function incrementCustomerCancelFrequency(userId, conn) {
    await db(conn).query(
        `UPDATE users
         SET booking_cancel_freq = booking_cancel_freq + 1
         WHERE user_id = ?
         LIMIT 1`,
        [userId]
    );
}

export async function findWalletByActorForUpdate({ actorType, actorId }, conn) {
    const [rows] = await db(conn).query(
        `SELECT wallet_id, actor_type, actor_id, currency_id, balance, status
         FROM wallet_accounts
         WHERE actor_type = ? AND actor_id = ?
         LIMIT 1
         FOR UPDATE`,
        [actorType, actorId]
    );

    return rows[0] || null;
}

export async function findDefaultCurrencyId(conn = null) {
    const [rows] = await db(conn).query(
        `SELECT id
         FROM currencies
         ORDER BY \`default\` DESC, id ASC
         LIMIT 1`
    );

    return Number(rows[0]?.id || 1);
}

export async function createWalletAccount({ actorType, actorId, currencyId }, conn) {
    const [result] = await db(conn).query(
        `INSERT INTO wallet_accounts (actor_type, actor_id, currency_id, balance, status)
         VALUES (?, ?, ?, 0, 1)`,
        [actorType, actorId, currencyId]
    );

    return Number(result.insertId);
}

export async function updateWalletBalance(walletId, balance, conn) {
    await db(conn).query(
        `UPDATE wallet_accounts
         SET balance = ?
         WHERE wallet_id = ?
         LIMIT 1`,
        [balance, walletId]
    );
}

export async function insertPayment(payload, conn) {
    const [result] = await db(conn).query(
        `INSERT INTO payments
         (payment_code, payer_wallet_id, actor_type, actor_id, service_domain, booking_id, amount, currency_id, status, description)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
            payload.payment_code,
            payload.payer_wallet_id,
            payload.actor_type,
            payload.actor_id,
            payload.service_domain,
            payload.booking_id,
            payload.amount,
            payload.currency_id,
            payload.status,
            payload.description,
        ]
    );

    return Number(result.insertId);
}

export async function insertWalletLedger(payload, conn) {
    await db(conn).query(
        `INSERT INTO wallet_ledger
         (wallet_id, payment_id, amount, balance_after, direction, entry_type, source_type, source_id, description)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
            payload.wallet_id,
            payload.payment_id,
            payload.amount,
            payload.balance_after,
            payload.direction,
            payload.entry_type,
            payload.source_type,
            payload.source_id,
            payload.description,
        ]
    );
}

export async function updateDriverAllocationStatusByBooking(bookingId, status, conn) {
    await db(conn).query(
        `UPDATE driver_allocate
         SET status = ?
         WHERE booking_id = ? AND status IN (0, 2, 3)`,
        [status, bookingId]
    );
}

export async function createDriverAllocation({ bookingId, driverId, status }, conn) {
    const [result] = await db(conn).query(
        `INSERT INTO driver_allocate (booking_id, driver_id, status)
         VALUES (?, ?, ?)`,
        [bookingId, driverId, status]
    );

    return Number(result.insertId);
}

export async function updateBookingDriver(bookingId, driver, conn) {
    await db(conn).query(
        `UPDATE bookings
         SET driver_id = ?,
             driver_firstname = ?,
             driver_lastname = ?,
             driver_phone = ?,
             dispatch_mode = 1,
             scheduled_driver = CASE WHEN scheduled = 1 THEN ? ELSE scheduled_driver END
         WHERE id = ?
         LIMIT 1`,
        [driver.driver_id, driver.firstname, driver.lastname, driver.phone, driver.driver_id, bookingId]
    );
}

export async function findDriverById(driverId, conn = null) {
    const [rows] = await db(conn).query(
        `SELECT driver_id, firstname, lastname, phone, account_active, account_deleted, is_activated
         FROM drivers
         WHERE driver_id = ?
         LIMIT 1`,
        [driverId]
    );

    return rows[0] || null;
}
