import sqldb from "../../config/sqldatabase.js";

function db(conn = null) {
    return conn || sqldb;
}

export async function findCustomerById(userId, conn = null, forUpdate = false) {
    const lockSql = forUpdate ? " FOR UPDATE" : "";
    const [rows] = await db(conn).query(
        `SELECT user_id, route_id, account_type, account_active, account_deleted, is_activated
         FROM users
         WHERE user_id = ? AND account_type = 1
         LIMIT 1${lockSql}`,
        [userId]
    );

    return rows[0] || null;
}

export async function findCouponForUserByCode({ couponCode, routeId, serviceDomain, userId }, conn = null, forUpdate = false) {
    const lockSql = forUpdate ? " FOR UPDATE" : "";
    const serviceCondition =
        serviceDomain === "ride"
            ? "c.service_type = 0"
            : "c.service_type IN (1, 2, 3)";

    const [rows] = await db(conn).query(
        `SELECT
            c.id,
            c.coupon_code,
            c.coupon_title,
            c.service_type,
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
            COALESCE(total_usage.total_used, 0) AS total_used,
            COALESCE(user_usage.user_used, 0) AS user_used,
            COALESCE(cvt.vehicle_type_ids, '') AS vehicle_type_ids
         FROM coupon_codes c
         LEFT JOIN (
            SELECT coupon_id, SUM(times_used) AS total_used
            FROM coupons_used
            GROUP BY coupon_id
         ) total_usage ON total_usage.coupon_id = c.id
         LEFT JOIN (
            SELECT coupon_id, SUM(times_used) AS user_used
            FROM coupons_used
            WHERE user_id = ?
            GROUP BY coupon_id
         ) user_usage ON user_usage.coupon_id = c.id
         LEFT JOIN (
            SELECT coupon_id, GROUP_CONCAT(vehicle_type_id ORDER BY vehicle_type_id ASC SEPARATOR ',') AS vehicle_type_ids
            FROM coupon_vehicle_types
            GROUP BY coupon_id
         ) cvt ON cvt.coupon_id = c.id
         WHERE c.coupon_code = ?
           AND c.city = ?
           AND ${serviceCondition}
         LIMIT 1${lockSql}`,
        [userId, couponCode, routeId]
    );

    const row = rows[0];
    if (!row) return null;

    return {
        id: Number(row.id),
        coupon_code: row.coupon_code,
        coupon_title: row.coupon_title,
        service_type: Number(row.service_type || 0),
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
        vehicle_type_ids: String(row.vehicle_type_ids || "")
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

    await db(conn).query(
        `UPDATE coupons_used
         SET times_used = times_used + 1
         WHERE id = ?
         LIMIT 1`,
        [rows[0].id]
    );

    return Number(rows[0].times_used || 0) + 1;
}

export async function findRideBookingForUser(bookingId, userId, conn = null, forUpdate = false) {
    const lockSql = forUpdate ? " FOR UPDATE" : "";
    const [rows] = await db(conn).query(
        `SELECT id, user_id, route_id, ride_id, estimated_cost,
                coupon_code, coupon_discount_type, coupon_discount_value,
                coupon_min_fare, coupon_max_discount
         FROM bookings
         WHERE id = ? AND user_id = ?
         LIMIT 1${lockSql}`,
        [bookingId, userId]
    );

    return rows[0] || null;
}

export async function findRentalBookingForUser(rentalId, userId, conn = null, forUpdate = false) {
    const lockSql = forUpdate ? " FOR UPDATE" : "";
    const [rows] = await db(conn).query(
        `SELECT rental_id, user_id, service_type, base_price, total_price, package_id
         FROM rental_bookings
         WHERE rental_id = ? AND user_id = ?
         LIMIT 1${lockSql}`,
        [rentalId, userId]
    );

    return rows[0] || null;
}

export async function getCouponColumnsInTable(tableName, conn = null) {
    const [rows] = await db(conn).query(
        `SELECT COLUMN_NAME
         FROM information_schema.COLUMNS
         WHERE TABLE_SCHEMA = DATABASE()
           AND TABLE_NAME = ?
           AND COLUMN_NAME IN ('coupon_code', 'coupon_discount_type', 'coupon_discount_value')`,
        [tableName]
    );

    return new Set(rows.map((row) => String(row.COLUMN_NAME)));
}

export async function applyCouponToRideBooking({ bookingId, coupon }, conn) {
    await db(conn).query(
        `UPDATE bookings
         SET coupon_code = ?,
             coupon_discount_type = ?,
             coupon_discount_value = ?,
             coupon_min_fare = ?,
             coupon_max_discount = ?
         WHERE id = ?
         LIMIT 1`,
        [
            coupon.coupon_code,
            Number(coupon.discount_type),
            Number(coupon.discount_value),
            Number(coupon.min_fare),
            Number(coupon.max_discount_amount),
            bookingId,
        ]
    );
}

export async function applyCouponToRentalBooking({ rentalId, coupon }, conn) {
    const columns = await getCouponColumnsInTable("rental_bookings", conn);
    const sets = [];
    const params = [];

    if (columns.has("coupon_code")) {
        sets.push("coupon_code = ?");
        params.push(coupon.coupon_code);
    }
    if (columns.has("coupon_discount_type")) {
        sets.push("coupon_discount_type = ?");
        params.push(Number(coupon.discount_type));
    }
    if (columns.has("coupon_discount_value")) {
        sets.push("coupon_discount_value = ?");
        params.push(Number(coupon.discount_value));
    }

    if (!sets.length) {
        return false;
    }

    await db(conn).query(
        `UPDATE rental_bookings
         SET ${sets.join(", ")}
         WHERE rental_id = ?
         LIMIT 1`,
        [...params, rentalId]
    );

    return true;
}

export async function listUnusedAvailableCouponsByUser({ userId, routeId }, conn = null) {
    const [rows] = await db(conn).query(
        `SELECT
            c.id,
            c.coupon_code,
            c.coupon_title,
            c.service_type,
            c.discount_type,
            c.discount_value,
            c.min_fare,
            c.max_discount_amount,
            c.active_date,
            c.expiry_date,
            c.limit_count,
            c.user_limit_count,
            COALESCE(total_usage.total_used, 0) AS total_used,
            COALESCE(user_usage.user_used, 0) AS user_used,
            COALESCE(cvt.vehicle_type_ids, '') AS vehicle_type_ids
         FROM coupon_codes c
         LEFT JOIN (
            SELECT coupon_id, SUM(times_used) AS total_used
            FROM coupons_used
            GROUP BY coupon_id
         ) total_usage ON total_usage.coupon_id = c.id
         LEFT JOIN (
            SELECT coupon_id, SUM(times_used) AS user_used
            FROM coupons_used
            WHERE user_id = ?
            GROUP BY coupon_id
         ) user_usage ON user_usage.coupon_id = c.id
         LEFT JOIN (
            SELECT coupon_id, GROUP_CONCAT(vehicle_type_id ORDER BY vehicle_type_id ASC SEPARATOR ',') AS vehicle_type_ids
            FROM coupon_vehicle_types
            GROUP BY coupon_id
         ) cvt ON cvt.coupon_id = c.id
         WHERE c.city = ?
           AND c.status = 1
           AND NOW() BETWEEN c.active_date AND c.expiry_date
           AND COALESCE(user_usage.user_used, 0) = 0
         ORDER BY c.expiry_date ASC, c.id DESC`,
        [userId, routeId]
    );

    return rows.map((row) => ({
        id: Number(row.id),
        coupon_code: row.coupon_code,
        coupon_title: row.coupon_title,
        service_type: Number(row.service_type || 0),
        discount_type: Number(row.discount_type || 0),
        discount_value: Number(row.discount_value || 0),
        min_fare: Number(row.min_fare || 0),
        max_discount_amount: Number(row.max_discount_amount || 0),
        active_date: row.active_date,
        expiry_date: row.expiry_date,
        limit_count: Number(row.limit_count || 0),
        user_limit_count: Number(row.user_limit_count || 0),
        total_used: Number(row.total_used || 0),
        user_used: Number(row.user_used || 0),
        vehicle_type_ids: String(row.vehicle_type_ids || "")
            .split(",")
            .map((item) => Number(item.trim()))
            .filter((item) => Number.isInteger(item) && item > 0),
    }));
}
