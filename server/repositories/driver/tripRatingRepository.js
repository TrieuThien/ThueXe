import sqldb from "../../config/sqldatabase.js";

function db(conn = null) {
    return conn || sqldb;
}

/**
 * Find an existing rating row scoped to BOTH booking_id and driver_id.
 * More precise than findDriverRatingByBooking in the shared ratingRepository,
 * which only filters by booking_id.
 */
export async function findDriverRatingForDriver(bookingId, driverId, conn = null) {
    const [rows] = await db(conn).query(
        `SELECT id, booking_id, driver_id, driver_rating, driver_comment
         FROM ratings_drivers
         WHERE booking_id = ? AND driver_id = ?
         LIMIT 1`,
        [bookingId, driverId]
    );
    const row = rows[0];
    if (!row) return null;
    return {
        id:             Number(row.id),
        booking_id:     Number(row.booking_id),
        driver_id:      Number(row.driver_id),
        driver_rating:  Number(row.driver_rating || 0),
        driver_comment: row.driver_comment || null,
    };
}

/**
 * INSERT-only: inserts a new driver rating row.
 * Does NOT update an existing row — calling code must check for duplicates first.
 * The UNIQUE KEY (booking_id, driver_id) also guards at the DB level.
 */
export async function insertDriverRatingOnce(
    { bookingId, driverId, rating, comment },
    conn = null
) {
    const [result] = await db(conn).query(
        `INSERT INTO ratings_drivers (booking_id, driver_id, driver_rating, driver_comment)
         VALUES (?, ?, ?, ?)`,
        [bookingId, driverId, rating, comment || null]
    );
    return Number(result.insertId);
}
