import sqldb from "../../config/sqldatabase.js";

function db(conn = null) {
    return conn || sqldb;
}

export async function findBookingStatusForCustomer(bookingId, userId, conn = null) {
    const [rows] = await db(conn).query(
        `SELECT id, user_id, driver_id, status, route_id, date_created, date_started, date_completed
         FROM bookings
         WHERE id = ? AND user_id = ?
         LIMIT 1`,
        [bookingId, userId]
    );

    return rows[0] || null;
}

export async function findBookingDriverLocationForCustomer(bookingId, userId, conn = null) {
    const [rows] = await db(conn).query(
        `SELECT b.id AS booking_id, b.user_id, b.driver_id,
                dcl.long, dcl.lat, dcl.b_angle, dcl.loc_static_status, dcl.loc_static_duration, dcl.updated_at
         FROM bookings b
         LEFT JOIN driver_current_locations dcl ON dcl.driver_id = b.driver_id
         WHERE b.id = ? AND b.user_id = ?
         LIMIT 1`,
        [bookingId, userId]
    );

    return rows[0] || null;
}

export async function findActiveBookingIdsByDriver(driverId, conn = null) {
    const [rows] = await db(conn).query(
        `SELECT id, user_id
         FROM bookings
         WHERE driver_id = ?
           AND status IN (0, 1, 6)
         ORDER BY id DESC`,
        [driverId]
    );

    return rows.map((row) => ({
        booking_id: Number(row.id),
        user_id: Number(row.user_id),
    }));
}

export async function findUserPushTokenAndRoute(userId, conn = null) {
    const [rows] = await db(conn).query(
        `SELECT user_id, route_id, push_notification_token
         FROM users
         WHERE user_id = ?
         LIMIT 1`,
        [userId]
    );

    return rows[0] || null;
}

export async function insertUserNotification({ userId, content, routeId = null, rentalId = null, nType = 2 }, conn = null) {
    const [result] = await db(conn).query(
        `INSERT INTO user_notifications (user_id, content, route_id, rental_id, n_type)
         VALUES (?, ?, ?, ?, ?)`,
        [userId, content || null, routeId || null, rentalId || null, nType]
    );

    return Number(result.insertId);
}
