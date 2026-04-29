/**
 * repositories/matching/matchingRepository.js
 *
 * Data access layer cho driver_booking_requests và các thao tác
 * liên quan đến luồng matching tài xế tức thì.
 */

import sqldb from "../../config/sqldatabase.js";

function db(conn = null) {
    return conn || sqldb;
}

// ─── Booking request CRUD ─────────────────────────────────────────────────────

export async function insertBookingRequest(
    { bookingId, driverId, distanceKm, expiresAt },
    conn = null
) {
    const [result] = await db(conn).query(
        `INSERT INTO driver_booking_requests
         (booking_id, driver_id, status, expires_at, distance_km)
         VALUES (?, ?, 'pending', ?, ?)`,
        [bookingId, driverId, expiresAt, distanceKm]
    );
    return Number(result.insertId);
}

/**
 * Lấy request theo id, dùng FOR UPDATE trong transaction.
 */
export async function findRequestById(requestId, conn = null, forUpdate = false) {
    const lock = forUpdate ? " FOR UPDATE" : "";
    const [rows] = await db(conn).query(
        `SELECT id, booking_id, driver_id, status, expires_at, responded_at, distance_km, created_at
         FROM driver_booking_requests
         WHERE id = ?
         LIMIT 1${lock}`,
        [requestId]
    );
    return rows[0] || null;
}

/**
 * Lấy request pending hiện tại của một booking (nếu có).
 */
export async function findPendingRequestForBooking(bookingId, conn = null, forUpdate = false) {
    const lock = forUpdate ? " FOR UPDATE" : "";
    const [rows] = await db(conn).query(
        `SELECT id, booking_id, driver_id, status, expires_at, responded_at, distance_km, created_at
         FROM driver_booking_requests
         WHERE booking_id = ? AND status = 'pending'
         ORDER BY id DESC
         LIMIT 1${lock}`,
        [bookingId]
    );
    return rows[0] || null;
}

/**
 * Update trạng thái request sau khi tài xế phản hồi.
 */
export async function updateRequestStatus(requestId, status, conn = null) {
    await db(conn).query(
        `UPDATE driver_booking_requests
         SET status = ?, responded_at = NOW()
         WHERE id = ?
         LIMIT 1`,
        [status, requestId]
    );
}

/**
 * Đánh dấu tất cả request pending của booking thành 'cancelled' (khi khách hủy).
 */
export async function cancelPendingRequests(bookingId, conn = null) {
    await db(conn).query(
        `UPDATE driver_booking_requests
         SET status = 'cancelled', responded_at = NOW()
         WHERE booking_id = ? AND status = 'pending'`,
        [bookingId]
    );
}

/**
 * Lấy tất cả driver_id đã được gửi request (bất kỳ trạng thái) cho booking này.
 * Dùng để loại trừ khi tìm tài xế tiếp theo.
 */
export async function getTriedDriverIds(bookingId, conn = null) {
    const [rows] = await db(conn).query(
        `SELECT driver_id FROM driver_booking_requests WHERE booking_id = ?`,
        [bookingId]
    );
    return rows.map((r) => Number(r.driver_id));
}

/**
 * Đếm số request đã gửi cho booking.
 */
export async function countRequestsForBooking(bookingId, conn = null) {
    const [rows] = await db(conn).query(
        `SELECT COUNT(*) AS cnt FROM driver_booking_requests WHERE booking_id = ?`,
        [bookingId]
    );
    return Number(rows[0]?.cnt || 0);
}

// ─── rental_bookings helpers ──────────────────────────────────────────────────

/**
 * Gán tài xế vào booking và chuyển status → pending.
 * Dùng FOR UPDATE để tránh race condition khi 2 tài xế accept cùng lúc.
 */
export async function assignDriverToBooking(bookingId, driverId, conn = null) {
    const [result] = await db(conn).query(
        `UPDATE rental_bookings
         SET driver_id   = ?,
             status      = 'pending',
             updated_at  = NOW()
         WHERE rental_id = ?
           AND status    = 'scheduled'
           AND driver_id IS NULL
         LIMIT 1`,
        [driverId, bookingId]
    );
    return result.affectedRows;
}

/**
 * Đọc booking với FOR UPDATE để lock row trong transaction.
 */
export async function findBookingForUpdate(bookingId, conn) {
    const [rows] = await db(conn).query(
        `SELECT rental_id, user_id, driver_id, package_id, status,
                booking_type, pickup_lat, pickup_long, service_type,
                matching_attempts
         FROM rental_bookings
         WHERE rental_id = ?
         LIMIT 1 FOR UPDATE`,
        [bookingId]
    );
    return rows[0] || null;
}

/**
 * Tăng matching_attempts khi gửi thêm một request.
 */
export async function incrementMatchingAttempts(bookingId, conn = null) {
    await db(conn).query(
        `UPDATE rental_bookings
         SET matching_attempts = matching_attempts + 1,
             updated_at = NOW()
         WHERE rental_id = ? LIMIT 1`,
        [bookingId]
    );
}

/**
 * Đánh dấu booking không tìm được tài xế.
 */
export async function markNoDriverFound(bookingId, conn = null) {
    await db(conn).query(
        `UPDATE rental_bookings
         SET status      = 'cancelled',
             cancel_reason = 'Không tìm được tài xế phù hợp trong khu vực.',
             updated_at  = NOW()
         WHERE rental_id = ? AND status = 'scheduled'
         LIMIT 1`,
        [bookingId]
    );
}

/**
 * Lấy thông tin booking cho customer polling.
 */
export async function getBookingMatchingStatus(bookingId, userId, conn = null) {
    const [rows] = await db(conn).query(
        `SELECT rb.rental_id, rb.status, rb.driver_id, rb.booking_type,
                rb.matching_attempts,
                d.firstname AS driver_firstname,
                d.lastname  AS driver_lastname,
                d.phone     AS driver_phone,
                d.photo_file AS driver_photo,
                d.driver_rating,
                dcl.lat AS driver_lat,
                dcl.long AS driver_lng
         FROM rental_bookings rb
         LEFT JOIN drivers d ON d.driver_id = rb.driver_id
         LEFT JOIN driver_current_locations dcl ON dcl.driver_id = rb.driver_id
         WHERE rb.rental_id = ? AND rb.user_id = ?
         LIMIT 1`,
        [bookingId, userId]
    );
    return rows[0] || null;
}

// ─── Driver schedule helpers ──────────────────────────────────────────────────

/**
 * Tạo schedule entry khi tài xế nhận booking lịch hẹn trước.
 */
export async function insertDriverScheduleFromBooking(
    { driverId, rentalId, startDatetime, endDatetime },
    conn = null
) {
    await db(conn).query(
        `INSERT INTO driver_schedule
         (driver_id, rental_id, start_datetime, end_datetime, status)
         VALUES (?, ?, ?, ?, 'booked')
         ON DUPLICATE KEY UPDATE status = 'booked'`,
        [driverId, rentalId, startDatetime, endDatetime]
    );
}
