import sqldb from "../config/sqldatabase.js";

function dbConnection(conn) {
    return conn || sqldb;
}

export async function findBookingForRating(bookingId, conn) {
    const db = dbConnection(conn);
    const [rows] = await db.query(
        `SELECT id, user_id, driver_id, status
         FROM bookings
         WHERE id = ?
         LIMIT 1`,
        [bookingId]
    );
    const row = rows[0];
    if (!row) return null;
    return {
        id: Number(row.id),
        user_id: Number(row.user_id),
        driver_id: Number(row.driver_id || 0),
        status: Number(row.status || 0),
    };
}

export async function findUserRatingByBooking(bookingId, conn) {
    const db = dbConnection(conn);
    const [rows] = await db.query(
        `SELECT id, booking_id, user_id, user_comment, user_rating
         FROM ratings_users
         WHERE booking_id = ?
         LIMIT 1`,
        [bookingId]
    );
    const row = rows[0];
    if (!row) return null;
    return {
        id: Number(row.id),
        booking_id: Number(row.booking_id),
        user_id: Number(row.user_id),
        user_comment: row.user_comment,
        user_rating: Number(row.user_rating || 0),
    };
}

export async function findDriverRatingByBooking(bookingId, conn) {
    const db = dbConnection(conn);
    const [rows] = await db.query(
        `SELECT id, booking_id, driver_id, driver_comment, driver_rating
         FROM ratings_drivers
         WHERE booking_id = ?
         LIMIT 1`,
        [bookingId]
    );
    const row = rows[0];
    if (!row) return null;
    return {
        id: Number(row.id),
        booking_id: Number(row.booking_id),
        driver_id: Number(row.driver_id),
        driver_comment: row.driver_comment,
        driver_rating: Number(row.driver_rating || 0),
    };
}

export async function upsertUserRating({ bookingId, userId, rating, comment }, conn) {
    const db = dbConnection(conn);
    const existing = await findUserRatingByBooking(bookingId, conn);
    if (existing) {
        await db.query(
            `UPDATE ratings_users
             SET user_rating = ?, user_comment = ?
             WHERE id = ?
             LIMIT 1`,
            [rating, comment || null, existing.id]
        );
        return existing.id;
    }
    const [result] = await db.query(
        `INSERT INTO ratings_users (booking_id, user_id, user_comment, user_rating)
         VALUES (?, ?, ?, ?)`,
        [bookingId, userId, comment || null, rating]
    );
    return Number(result.insertId);
}

export async function upsertDriverRating({ bookingId, driverId, rating, comment }, conn) {
    const db = dbConnection(conn);
    const existing = await findDriverRatingByBooking(bookingId, conn);
    if (existing) {
        await db.query(
            `UPDATE ratings_drivers
             SET driver_rating = ?, driver_comment = ?
             WHERE id = ?
             LIMIT 1`,
            [rating, comment || null, existing.id]
        );
        return existing.id;
    }
    const [result] = await db.query(
        `INSERT INTO ratings_drivers (booking_id, driver_id, driver_comment, driver_rating)
         VALUES (?, ?, ?, ?)`,
        [bookingId, driverId, comment || null, rating]
    );
    return Number(result.insertId);
}

export async function refreshDriverAverageRating(driverId, conn) {
    const db = dbConnection(conn);
    const [rows] = await db.query(
        `SELECT AVG(user_rating) AS avg_rating
         FROM ratings_users ru
         INNER JOIN bookings b ON b.id = ru.booking_id
         WHERE b.driver_id = ?`,
        [driverId]
    );
    const average = Number(rows[0]?.avg_rating || 5);
    await db.query(
        `UPDATE drivers
         SET driver_rating = ?
         WHERE driver_id = ?
         LIMIT 1`,
        [Math.max(1, Math.min(5, Math.round(average))), driverId]
    );
    return average;
}

export async function refreshUserAverageRating(userId, conn) {
    const db = dbConnection(conn);
    const [rows] = await db.query(
        `SELECT AVG(driver_rating) AS avg_rating
         FROM ratings_drivers
         WHERE booking_id IN (SELECT id FROM bookings WHERE user_id = ?)`,
        [userId]
    );
    const average = Number(rows[0]?.avg_rating || 5);
    await db.query(
        `UPDATE users
         SET user_rating = ?
         WHERE user_id = ?
         LIMIT 1`,
        [Math.max(1, Math.min(5, Math.round(average))), userId]
    );
    return average;
}

export async function listRatingsByUser(userId) {
    const [rows] = await sqldb.query(
        `SELECT ru.id, ru.booking_id, ru.user_comment, ru.user_rating, b.driver_id,
                NULLIF(TRIM(CONCAT(COALESCE(d.firstname,''), ' ', COALESCE(d.lastname,''))), '') AS driver_name
         FROM ratings_users ru
         INNER JOIN bookings b ON b.id = ru.booking_id
         LEFT JOIN drivers d ON d.driver_id = b.driver_id
         WHERE ru.user_id = ?
         ORDER BY ru.id DESC`,
        [userId]
    );
    return rows.map((row) => ({
        id: Number(row.id),
        booking_id: Number(row.booking_id),
        rating: Number(row.user_rating || 0),
        comment: row.user_comment,
        counterparty_id: Number(row.driver_id || 0),
        counterparty_name: row.driver_name,
        direction: "given_by_user",
    }));
}

export async function listRatingsByDriver(driverId) {
    const [rows] = await sqldb.query(
        `SELECT rd.id, rd.booking_id, rd.driver_comment, rd.driver_rating, b.user_id,
                NULLIF(TRIM(CONCAT(COALESCE(u.firstname,''), ' ', COALESCE(u.lastname,''))), '') AS user_name
         FROM ratings_drivers rd
         INNER JOIN bookings b ON b.id = rd.booking_id
         LEFT JOIN users u ON u.user_id = b.user_id
         WHERE rd.driver_id = ?
         ORDER BY rd.id DESC`,
        [driverId]
    );
    return rows.map((row) => ({
        id: Number(row.id),
        booking_id: Number(row.booking_id),
        rating: Number(row.driver_rating || 0),
        comment: row.driver_comment,
        counterparty_id: Number(row.user_id || 0),
        counterparty_name: row.user_name,
        direction: "given_by_driver",
    }));
}

