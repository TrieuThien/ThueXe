/**
 * repositories/customer/driverHireRepository.js
 *
 * Data access cho luồng thuê tài xế tức thì và lịch hẹn.
 */

import sqldb from "../../config/sqldatabase.js";

function db(conn = null) {
    return conn || sqldb;
}

/**
 * Tạo booking thuê tài xế (service_type=2).
 * Trả về rental_id.
 */
export async function createDriverHireBooking(payload, conn = null) {
    const {
        rentalCode,
        userId,
        packageId,
        bookingType,       // 'immediate' | 'scheduled'
        startDatetime,
        endDatetime,
        pickupAddress,
        pickupLat,
        pickupLng,
        dropoffAddress,
        basePrice,
        depositAmount,
        totalPrice,
        paymentType,
        note,
        searchRadiusKm,
    } = payload;

    const [result] = await db(conn).query(
        `INSERT INTO rental_bookings
         (rental_code, user_id, package_id, service_type, booking_type,
          start_datetime, end_datetime,
          pickup_address, pickup_lat, pickup_long,
          dropoff_address,
          base_price, deposit_amount, total_price,
          distance_limit_km,
          payment_type, payment_status, status,
          search_radius_km, cancel_reason)
         VALUES (?, ?, ?, 2, ?,
                 ?, ?,
                 ?, ?, ?,
                 ?,
                 ?, ?, ?,
                 0,
                 ?, 'pending', 'scheduled',
                 ?, ?)`,
        [
            rentalCode,
            userId,
            packageId,
            bookingType,
            startDatetime,
            endDatetime,
            pickupAddress,
            pickupLat,
            pickupLng,
            dropoffAddress || null,
            basePrice,
            depositAmount,
            totalPrice,
            paymentType || null,
            searchRadiusKm || 2,
            note || null,
        ]
    );
    return Number(result.insertId);
}

/**
 * Lấy thông tin booking với dữ liệu tài xế (nếu đã được gán).
 */
export async function getDriverHireBookingDetail(bookingId, userId, conn = null) {
    const [rows] = await db(conn).query(
        `SELECT
             rb.rental_id, rb.rental_code, rb.status, rb.booking_type,
             rb.service_type, rb.package_id, rb.driver_id,
             rb.start_datetime, rb.end_datetime,
             rb.pickup_address, rb.pickup_lat, rb.pickup_long,
             rb.dropoff_address,
             rb.base_price, rb.deposit_amount, rb.total_price,
             rb.payment_status, rb.payment_type,
             rb.matching_attempts, rb.cancel_reason,
             rb.created_at, rb.updated_at,
             rp.package_name, rp.duration_hours, rp.distance_limit_km,
             d.firstname AS driver_firstname,
             d.lastname  AS driver_lastname,
             d.phone     AS driver_phone,
             d.photo_file AS driver_photo,
             d.driver_rating,
             dcl.lat AS driver_lat,
             dcl.long AS driver_lng
         FROM rental_bookings rb
         LEFT JOIN rental_packages rp ON rp.package_id = rb.package_id
         LEFT JOIN drivers d ON d.driver_id = rb.driver_id
         LEFT JOIN driver_current_locations dcl ON dcl.driver_id = rb.driver_id
         WHERE rb.rental_id = ? AND rb.user_id = ?
         LIMIT 1`,
        [bookingId, userId]
    );

    const row = rows[0];
    if (!row) return null;

    return {
        rental_id:          Number(row.rental_id),
        rental_code:        row.rental_code,
        status:             row.status,
        booking_type:       row.booking_type,
        service_type:       Number(row.service_type),
        package_id:         Number(row.package_id),
        driver_id:          row.driver_id === null ? null : Number(row.driver_id),
        start_datetime:     row.start_datetime,
        end_datetime:       row.end_datetime,
        pickup_address:     row.pickup_address,
        pickup_lat:         row.pickup_lat  === null ? null : Number(row.pickup_lat),
        pickup_lng:         row.pickup_long === null ? null : Number(row.pickup_long),
        dropoff_address:    row.dropoff_address,
        base_price:         Number(row.base_price  || 0),
        deposit_amount:     Number(row.deposit_amount || 0),
        total_price:        Number(row.total_price || 0),
        payment_status:     row.payment_status,
        payment_type:       row.payment_type === null ? null : Number(row.payment_type),
        matching_attempts:  Number(row.matching_attempts || 0),
        cancel_reason:      row.cancel_reason,
        created_at:         row.created_at,
        updated_at:         row.updated_at,
        package_name:       row.package_name,
        duration_hours:     row.duration_hours === null ? null : Number(row.duration_hours),
        distance_limit_km:  Number(row.distance_limit_km || 0),
        driver: row.driver_id === null ? null : {
            driver_id:     Number(row.driver_id),
            firstname:     row.driver_firstname,
            lastname:      row.driver_lastname,
            phone:         row.driver_phone,
            photo_file:    row.driver_photo,
            driver_rating: Number(row.driver_rating || 5),
            current_lat:   row.driver_lat  === null ? null : Number(row.driver_lat),
            current_lng:   row.driver_lng === null ? null : Number(row.driver_lng),
        },
    };
}

/**
 * Kiểm tra khách có đang có booking chưa kết thúc không.
 */
export async function hasActiveDriverHireBooking(userId, conn = null) {
    const [rows] = await db(conn).query(
        `SELECT rental_id FROM rental_bookings
         WHERE user_id = ?
           AND service_type IN (2, 3)
           AND status IN ('scheduled','pending','in_progress')
         LIMIT 1`,
        [userId]
    );
    return rows.length > 0;
}

/**
 * Lấy rental_package cần cho tính giá.
 */
export async function findDriverPackageById(packageId, conn = null) {
    const [rows] = await db(conn).query(
        `SELECT package_id, service_type, package_name, duration_hours,
                distance_limit_km, price AS base_price, deposit_amount,
                extra_hour_fee, extra_km_fee, active
         FROM rental_packages
         WHERE package_id = ? AND service_type IN (2,3) AND active = 1
         LIMIT 1`,
        [packageId]
    );
    return rows[0] || null;
}
