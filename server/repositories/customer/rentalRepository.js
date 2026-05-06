import sqldb from "../../config/sqldatabase.js";

function db(conn = null) {
    return conn || sqldb;
}

export async function findCustomerById(userId, conn = null, forUpdate = false) {
    const lockSql = forUpdate ? " FOR UPDATE" : "";
    const [rows] = await db(conn).query(
        `SELECT user_id, firstname, lastname, phone, route_id, account_type, account_active, account_deleted, is_activated
         FROM users
         WHERE user_id = ? AND account_type = 1
         LIMIT 1${lockSql}`,
        [userId]
    );

    return rows[0] || null;
}

export async function listRentalPackagesByServiceType(serviceType, conn = null) {
    const [rows] = await db(conn).query(
        `SELECT package_id, service_type, type_id, package_name, duration_hours, distance_limit_km,
                price AS base_price, deposit_amount,
                extra_hour_fee AS extra_time_fee,
                extra_km_fee AS extra_distance_fee
         FROM rental_packages
         WHERE active = 1
           AND service_type = ?
         ORDER BY package_id DESC`,
        [serviceType]
    );

    return rows.map((row) => ({
        package_id: Number(row.package_id),
        service_type: Number(row.service_type || 0),
        type_id: row.type_id === null ? null : Number(row.type_id),
        package_name: row.package_name,
        duration_hours: row.duration_hours === null ? null : Number(row.duration_hours),
        distance_limit_km: Number(row.distance_limit_km || 0),
        base_price: Number(row.base_price || 0),
        deposit_amount: Number(row.deposit_amount || 0),
        extra_time_fee: Number(row.extra_time_fee || 0),
        extra_distance_fee: Number(row.extra_distance_fee || 0),
    }));
}

export async function findRentalPackageById(packageId, conn = null, forUpdate = false) {
    const lockSql = forUpdate ? " FOR UPDATE" : "";
    const [rows] = await db(conn).query(
        `SELECT package_id, service_type, type_id, package_name, duration_hours, distance_limit_km,
                price AS base_price, deposit_amount,
                extra_hour_fee AS extra_time_fee,
                extra_km_fee AS extra_distance_fee,
                active
         FROM rental_packages
         WHERE package_id = ?
         LIMIT 1${lockSql}`,
        [packageId]
    );

    const row = rows[0];
    if (!row) return null;

    return {
        package_id: Number(row.package_id),
        service_type: Number(row.service_type || 0),
        type_id: row.type_id === null ? null : Number(row.type_id),
        package_name: row.package_name,
        duration_hours: row.duration_hours === null ? null : Number(row.duration_hours),
        distance_limit_km: Number(row.distance_limit_km || 0),
        base_price: Number(row.base_price || 0),
        deposit_amount: Number(row.deposit_amount || 0),
        extra_time_fee: Number(row.extra_time_fee || 0),
        extra_distance_fee: Number(row.extra_distance_fee || 0),
        active: Number(row.active || 0),
    };
}

export async function findCouponForCustomerRental({ couponCode, routeId, serviceType, userId }, conn = null, forUpdate = false) {
    const lockSql = forUpdate ? " FOR UPDATE" : "";
    const [rows] = await db(conn).query(
        `SELECT
            c.id,
            c.coupon_code,
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
            COALESCE(usage_total.total_used, 0) AS total_used,
            COALESCE(usage_user.user_used, 0) AS user_used,
            COALESCE(v.vehicle_type_ids, '') AS vehicle_type_ids
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
            SELECT coupon_id, GROUP_CONCAT(vehicle_type_id ORDER BY vehicle_type_id ASC SEPARATOR ',') AS vehicle_type_ids
            FROM coupon_vehicle_types
            GROUP BY coupon_id
         ) v ON v.coupon_id = c.id
         WHERE c.coupon_code = ?
           AND c.service_type = ?
           AND c.city = ?
         LIMIT 1${lockSql}`,
        [userId, couponCode, serviceType, routeId]
    );

    const row = rows[0];
    if (!row) return null;

    return {
        id: Number(row.id),
        coupon_code: row.coupon_code,
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

    const usageId = Number(rows[0].id);
    await db(conn).query(
        `UPDATE coupons_used
         SET times_used = times_used + 1
         WHERE id = ?
         LIMIT 1`,
        [usageId]
    );

    return Number(rows[0].times_used || 0) + 1;
}

export async function createRentalBooking(payload, conn) {
    const [result] = await db(conn).query(
        `INSERT INTO rental_bookings
         (rental_code, user_id, vehicle_id, driver_id, package_id, owner_id, service_type,
          start_datetime, end_datetime, pickup_address, dropoff_address,
          distance_limit_km, distance_travelled_km,
          base_price, extra_time_fee, extra_distance_fee, deposit_amount, total_price,
          payment_status, payment_type, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
            payload.rental_code,
            payload.user_id,
            payload.vehicle_id,
            payload.driver_id,
            payload.package_id,
            payload.owner_id,
            payload.service_type,
            payload.start_datetime,
            payload.end_datetime,
            payload.pickup_address,
            payload.dropoff_address,
            payload.distance_limit_km,
            payload.distance_travelled_km,
            payload.base_price,
            payload.extra_time_fee,
            payload.extra_distance_fee,
            payload.deposit_amount,
            payload.total_price,
            payload.payment_status,
            payload.payment_type,
            payload.status,
        ]
    );

    return Number(result.insertId);
}

export async function findCurrentRentalBookingByUser(userId, conn = null) {
    const [rows] = await db(conn).query(
        `SELECT rental_id
         FROM rental_bookings
         WHERE user_id = ?
           AND status NOT IN ('completed', 'cancelled')
         ORDER BY rental_id DESC
         LIMIT 1`,
        [userId]
    );

    return rows[0] ? Number(rows[0].rental_id) : null;
}

export async function findRentalBookingByIdForUser(rentalId, userId, conn = null, forUpdate = false) {
    const lockSql = forUpdate ? " FOR UPDATE" : "";
    const [rows] = await db(conn).query(
        `SELECT rb.rental_id, rb.rental_code, rb.user_id, rb.vehicle_id, rb.driver_id, rb.package_id, rb.owner_id, rb.service_type,
                rb.start_datetime, rb.end_datetime, rb.actual_end_datetime,
                rb.pickup_address, rb.dropoff_address,
                rb.distance_limit_km, rb.distance_travelled_km,
                rb.base_price, rb.extra_time_fee, rb.extra_distance_fee, rb.deposit_amount, rb.total_price,
                rb.payment_status, rb.payment_type,
                rb.status, rb.cancel_reason, rb.created_at, rb.updated_at,
                rp.package_name,
                v.license_plate,
                vt.type_name AS vehicle_type,
                vo.fullname AS owner_name,
                vo.phone AS owner_phone,
                d.driver_rating,
                NULLIF(TRIM(CONCAT(COALESCE(d.firstname,''), ' ', COALESCE(d.lastname,''))), '') AS driver_name
         FROM rental_bookings rb
         LEFT JOIN rental_packages rp ON rp.package_id = rb.package_id
         LEFT JOIN vehicles v ON v.vehicle_id = rb.vehicle_id
         LEFT JOIN vehicle_types vt ON vt.type_id = v.type_id
         LEFT JOIN vehicle_owners vo ON vo.owner_id = v.owner_id
         LEFT JOIN drivers d ON d.driver_id = rb.driver_id
         WHERE rb.rental_id = ? AND rb.user_id = ?
         LIMIT 1${lockSql}`,
        [rentalId, userId]
    );

    return rows[0] || null;
}

export async function listRentalHistoryByUser(userId, { limit, offset }, conn = null) {
    const [rows] = await db(conn).query(
        `SELECT rental_id
         FROM rental_bookings
         WHERE user_id = ?
         ORDER BY rental_id DESC
         LIMIT ? OFFSET ?`,
        [userId, limit, offset]
    );

    return rows.map((row) => Number(row.rental_id));
}

export async function countRentalHistoryByUser(userId, conn = null) {
    const [rows] = await db(conn).query(
        `SELECT COUNT(*) AS total_items
         FROM rental_bookings
         WHERE user_id = ?`,
        [userId]
    );

    return Number(rows[0]?.total_items || 0);
}

export async function updateRentalBookingCancellation(
    { rentalId, status, cancelReason, paymentStatus },
    conn
) {
    await db(conn).query(
        `UPDATE rental_bookings
         SET status = ?,
             cancel_reason = ?,
             payment_status = COALESCE(?, payment_status),
             updated_at = NOW()
         WHERE rental_id = ?
         LIMIT 1`,
        [status, cancelReason || null, paymentStatus || null, rentalId]
    );
}

export async function updateRentalAsCompleted(
    {
        rentalId,
        actualEndDatetime,
        distanceTravelledKm,
        extraTimeFee,
        extraDistanceFee,
        totalPrice,
    },
    conn
) {
    await db(conn).query(
        `UPDATE rental_bookings
         SET status = 'completed',
             actual_end_datetime = ?,
             distance_travelled_km = ?,
             extra_time_fee = ?,
             extra_distance_fee = ?,
             total_price = ?,
             updated_at = NOW()
         WHERE rental_id = ?
         LIMIT 1`,
        [
            actualEndDatetime,
            distanceTravelledKm,
            extraTimeFee,
            extraDistanceFee,
            totalPrice,
            rentalId,
        ]
    );
}

export async function updateVehicleLocationByRental(rentalId, userId, lat, lng, conn = null) {
    const [result] = await db(conn).query(
        `UPDATE vehicles v
         INNER JOIN rental_bookings rb ON rb.vehicle_id = v.vehicle_id
         SET v.current_lat = ?, v.current_long = ?
         WHERE rb.rental_id = ? AND rb.user_id = ? AND rb.status = 'in_progress'
         LIMIT 1`,
        [lat, lng, rentalId, userId]
    );
    return Number(result.affectedRows || 0) > 0;
}

export async function findVehicleById(vehicleId, conn = null) {
    const [rows] = await db(conn).query(
        `SELECT vehicle_id, owner_id, type_id, status, is_verified
         FROM vehicles
         WHERE vehicle_id = ?
         LIMIT 1`,
        [vehicleId]
    );

    return rows[0] || null;
}

export async function findDriverById(driverId, conn = null) {
    const [rows] = await db(conn).query(
        `SELECT driver_id, ride_id, available, operation_status, available_for_rental, account_active, account_deleted, is_activated
         FROM drivers
         WHERE driver_id = ?
         LIMIT 1`,
        [driverId]
    );

    return rows[0] || null;
}

export async function isVehicleAvailableInWindow(vehicleId, startDatetime, endDatetime, conn = null) {
    const [rows] = await db(conn).query(
        `SELECT v.vehicle_id
         FROM vehicles v
         WHERE v.vehicle_id = ?
           AND v.is_verified = 1
           AND v.status = 'available'
           AND NOT EXISTS (
               SELECT 1
               FROM rental_bookings rb
               WHERE rb.vehicle_id = v.vehicle_id
                 AND rb.status IN ('scheduled', 'pending', 'in_progress')
                 AND rb.start_datetime < ?
                 AND rb.end_datetime > ?
           )
           AND NOT EXISTS (
               SELECT 1
               FROM vehicle_maintenance vm
               WHERE vm.vehicle_id = v.vehicle_id
                 AND vm.status IN ('scheduled', 'in_progress')
                 AND vm.start_date < ?
                 AND COALESCE(vm.end_date, '9999-12-31 23:59:59') > ?
           )
         LIMIT 1`,
        [vehicleId, endDatetime, startDatetime, endDatetime, startDatetime]
    );

    return Boolean(rows[0]);
}

export async function isDriverAvailableInWindow(driverId, startDatetime, endDatetime, conn = null) {
    const [rows] = await db(conn).query(
        `SELECT d.driver_id
         FROM drivers d
         WHERE d.driver_id = ?
           AND d.account_deleted = 0
           AND d.account_active = 1
           AND d.is_activated = 1
           AND d.available = 1
           AND d.operation_status = 0
           AND d.available_for_rental = 1
           AND NOT EXISTS (
               SELECT 1
               FROM rental_bookings rb
               WHERE rb.driver_id = d.driver_id
                 AND rb.status IN ('scheduled', 'pending', 'in_progress')
                 AND rb.start_datetime < ?
                 AND rb.end_datetime > ?
           )
           AND NOT EXISTS (
               SELECT 1
               FROM driver_schedule ds
               WHERE ds.driver_id = d.driver_id
                 AND ds.status IN ('booked', 'unavailable')
                 AND ds.start_datetime < ?
                 AND ds.end_datetime > ?
           )
         LIMIT 1`,
        [driverId, endDatetime, startDatetime, endDatetime, startDatetime]
    );

    return Boolean(rows[0]);
}

export async function listAvailableVehicles({ startDatetime, endDatetime }, conn = null) {
    const [rows] = await db(conn).query(
        `SELECT v.vehicle_id,
                v.license_plate AS plate_number,
                vt.type_name AS vehicle_type,
                v.year,
                v.owner_id
         FROM vehicles v
         LEFT JOIN vehicle_types vt ON vt.type_id = v.type_id
         WHERE v.status = 'available'
           AND v.is_verified = 1
           AND NOT EXISTS (
               SELECT 1
               FROM rental_bookings rb
               WHERE rb.vehicle_id = v.vehicle_id
                 AND rb.status IN ('scheduled', 'pending', 'in_progress')
                 AND rb.start_datetime < ?
                 AND rb.end_datetime > ?
           )
           AND NOT EXISTS (
               SELECT 1
               FROM vehicle_maintenance vm
               WHERE vm.vehicle_id = v.vehicle_id
                 AND vm.status IN ('scheduled', 'in_progress')
                 AND vm.start_date < ?
                 AND COALESCE(vm.end_date, '9999-12-31 23:59:59') > ?
           )
         ORDER BY v.vehicle_id DESC`,
        [endDatetime, startDatetime, endDatetime, startDatetime]
    );

    return rows.map((row) => ({
        vehicle_id: Number(row.vehicle_id),
        plate_number: row.plate_number,
        vehicle_type: row.vehicle_type,
        year: row.year,
        owner_id: Number(row.owner_id),
    }));
}

export async function listAvailableDrivers({ startDatetime, endDatetime }, conn = null) {
    const [rows] = await db(conn).query(
        `SELECT d.driver_id,
                NULLIF(TRIM(CONCAT(COALESCE(d.firstname, ''), ' ', COALESCE(d.lastname, ''))), '') AS name,
                d.driver_rating AS rating,
                r.ride_type AS vehicle_type
         FROM drivers d
         LEFT JOIN rides r ON r.id = d.ride_id
         WHERE d.account_deleted = 0
           AND d.account_active = 1
           AND d.is_activated = 1
           AND d.available = 1
           AND d.operation_status = 0
           AND d.available_for_rental = 1
           AND NOT EXISTS (
               SELECT 1
               FROM rental_bookings rb
               WHERE rb.driver_id = d.driver_id
                 AND rb.status IN ('scheduled', 'pending', 'in_progress')
                 AND rb.start_datetime < ?
                 AND rb.end_datetime > ?
           )
           AND NOT EXISTS (
               SELECT 1
               FROM driver_schedule ds
               WHERE ds.driver_id = d.driver_id
                 AND ds.status IN ('booked', 'unavailable')
                 AND ds.start_datetime < ?
                 AND ds.end_datetime > ?
           )
         ORDER BY d.driver_id DESC`,
        [endDatetime, startDatetime, endDatetime, startDatetime]
    );

    return rows.map((row) => ({
        driver_id: Number(row.driver_id),
        name: row.name,
        rating: Number(row.rating || 0),
        vehicle_type: row.vehicle_type || null,
    }));
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
         (payment_code, payer_wallet_id, actor_type, actor_id, service_domain, booking_id, rental_id, amount, currency_id, status, description)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
            payload.payment_code,
            payload.payer_wallet_id,
            payload.actor_type,
            payload.actor_id,
            payload.service_domain,
            payload.booking_id || null,
            payload.rental_id || null,
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
