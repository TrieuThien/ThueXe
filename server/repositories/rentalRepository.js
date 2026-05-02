import sqldb from "../config/sqldatabase.js";

function dbConnection(conn) {
    return conn || sqldb;
}

/** Ánh xạ row DB → object package (bao gồm các cột GIS) */
function mapPackageRow(row) {
    return {
        package_id: Number(row.package_id),
        type_id: row.type_id === null ? null : Number(row.type_id),
        service_type: Number(row.service_type || 1),
        package_name: row.package_name,
        duration_hours: row.duration_hours === null ? null : Number(row.duration_hours),
        duration_days: row.duration_days === null ? null : Number(row.duration_days),
        price: Number(row.price || 0),
        distance_limit_km: Number(row.distance_limit_km || 0),
        extra_km_fee: Number(row.extra_km_fee || 0),
        extra_hour_fee: Number(row.extra_hour_fee || 0),
        deposit_amount: Number(row.deposit_amount || 0),
        description: row.description,
        // ── GIS fields ────────────────────────────────────────────────
        coverage_type: row.coverage_type || null,
        coverage_geojson: row.coverage_geojson
            ? (typeof row.coverage_geojson === 'string'
                ? (() => { try { return JSON.parse(row.coverage_geojson); } catch { return null; } })()
                : row.coverage_geojson)
            : null,
        center_lat: row.center_lat === null || row.center_lat === undefined ? null : Number(row.center_lat),
        center_lng: row.center_lng === null || row.center_lng === undefined ? null : Number(row.center_lng),
        radius_km: row.radius_km === null || row.radius_km === undefined ? null : Number(row.radius_km),
        is_geo_enabled: Number(row.is_geo_enabled ?? 1),
        // ─────────────────────────────────────────────────────────────
        active: Number(row.active || 0),
        date_created: row.date_created,
    };
}

export async function listRentalPackages(filters = {}) {
    const whereClauses = [];
    const params = [];
    if (filters.serviceType !== undefined) {
        whereClauses.push("service_type = ?");
        params.push(filters.serviceType);
    }
    if (filters.active !== undefined) {
        whereClauses.push("active = ?");
        params.push(filters.active);
    }
    if (filters.search) {
        whereClauses.push("(package_name LIKE ? OR description LIKE ?)");
        const keyword = `%${filters.search}%`;
        params.push(keyword, keyword);
    }
    const whereSql = whereClauses.length ? `WHERE ${whereClauses.join(" AND ")}` : "";

    try {
        const [rows] = await sqldb.query(
            `SELECT package_id, type_id, service_type, package_name, duration_hours, duration_days, price,
                    distance_limit_km, extra_km_fee, extra_hour_fee, deposit_amount, description,
                    coverage_type, coverage_geojson, center_lat, center_lng, radius_km, is_geo_enabled,
                    active, date_created
             FROM rental_packages
             ${whereSql}
             ORDER BY package_id DESC`,
            params
        );
        return rows.map(mapPackageRow);
    } catch {
        // Fallback: cột GIS chưa tồn tại
        const [rows] = await sqldb.query(
            `SELECT package_id, type_id, service_type, package_name, duration_hours, duration_days, price,
                    distance_limit_km, extra_km_fee, extra_hour_fee, deposit_amount, description,
                    active, date_created
             FROM rental_packages
             ${whereSql}
             ORDER BY package_id DESC`,
            params
        );
        return rows.map((row) => mapPackageRow({
            ...row, coverage_type: null, coverage_geojson: null,
            center_lat: null, center_lng: null, radius_km: null, is_geo_enabled: 0,
        }));
    }
}

export async function findRentalPackageById(packageId, conn) {
    const db = dbConnection(conn);
    try {
        const [rows] = await db.query(
            `SELECT package_id, type_id, service_type, package_name, duration_hours, duration_days, price,
                    distance_limit_km, extra_km_fee, extra_hour_fee, deposit_amount, description,
                    coverage_type, coverage_geojson, center_lat, center_lng, radius_km, is_geo_enabled,
                    active, date_created
             FROM rental_packages
             WHERE package_id = ?
             LIMIT 1`,
            [packageId]
        );
        const row = rows[0];
        if (!row) return null;
        return mapPackageRow(row);
    } catch {
        // Fallback: cột GIS chưa tồn tại
        const [rows] = await db.query(
            `SELECT package_id, type_id, service_type, package_name, duration_hours, duration_days, price,
                    distance_limit_km, extra_km_fee, extra_hour_fee, deposit_amount, description,
                    active, date_created
             FROM rental_packages
             WHERE package_id = ?
             LIMIT 1`,
            [packageId]
        );
        const row = rows[0];
        if (!row) return null;
        return mapPackageRow({
            ...row, coverage_type: null, coverage_geojson: null,
            center_lat: null, center_lng: null, radius_km: null, is_geo_enabled: 0,
        });
    }
}

export async function createRentalPackage(payload, conn) {
    const db = dbConnection(conn);
    const geojsonStr = payload.coverage_geojson
        ? JSON.stringify(payload.coverage_geojson)
        : null;
    try {
        const [result] = await db.query(
            `INSERT INTO rental_packages
             (type_id, service_type, package_name, duration_hours, duration_days, price, distance_limit_km,
              extra_km_fee, extra_hour_fee, deposit_amount, description,
              coverage_type, coverage_geojson, center_lat, center_lng, radius_km, is_geo_enabled, active)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                payload.type_id || null, payload.service_type, payload.package_name,
                payload.duration_hours || null, payload.duration_days || null, payload.price,
                payload.distance_limit_km, payload.extra_km_fee, payload.extra_hour_fee,
                payload.deposit_amount, payload.description || null,
                payload.coverage_type || null, geojsonStr,
                payload.center_lat ?? null, payload.center_lng ?? null,
                payload.radius_km ?? null, payload.is_geo_enabled ?? 1, payload.active,
            ]
        );
        return Number(result.insertId);
    } catch {
        // Fallback: cột GIS chưa tồn tại → insert không có GIS
        const [result] = await db.query(
            `INSERT INTO rental_packages
             (type_id, service_type, package_name, duration_hours, duration_days, price, distance_limit_km,
              extra_km_fee, extra_hour_fee, deposit_amount, description, active)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                payload.type_id || null, payload.service_type, payload.package_name,
                payload.duration_hours || null, payload.duration_days || null, payload.price,
                payload.distance_limit_km, payload.extra_km_fee, payload.extra_hour_fee,
                payload.deposit_amount, payload.description || null, payload.active,
            ]
        );
        return Number(result.insertId);
    }
}

export async function updateRentalPackage(packageId, payload, conn) {
    const db = dbConnection(conn);
    const geojsonStr = payload.coverage_geojson
        ? JSON.stringify(payload.coverage_geojson)
        : null;
    try {
        await db.query(
            `UPDATE rental_packages
             SET type_id = ?, service_type = ?, package_name = ?, duration_hours = ?, duration_days = ?,
                 price = ?, distance_limit_km = ?, extra_km_fee = ?, extra_hour_fee = ?, deposit_amount = ?,
                 description = ?,
                 coverage_type = ?, coverage_geojson = ?, center_lat = ?, center_lng = ?, radius_km = ?, is_geo_enabled = ?,
                 active = ?
             WHERE package_id = ?
             LIMIT 1`,
            [
                payload.type_id || null, payload.service_type, payload.package_name,
                payload.duration_hours || null, payload.duration_days || null, payload.price,
                payload.distance_limit_km, payload.extra_km_fee, payload.extra_hour_fee,
                payload.deposit_amount, payload.description || null,
                payload.coverage_type || null, geojsonStr,
                payload.center_lat ?? null, payload.center_lng ?? null,
                payload.radius_km ?? null, payload.is_geo_enabled ?? 1,
                payload.active, packageId,
            ]
        );
    } catch {
        // Fallback: cột GIS chưa tồn tại → update không có GIS
        await db.query(
            `UPDATE rental_packages
             SET type_id = ?, service_type = ?, package_name = ?, duration_hours = ?, duration_days = ?,
                 price = ?, distance_limit_km = ?, extra_km_fee = ?, extra_hour_fee = ?, deposit_amount = ?,
                 description = ?, active = ?
             WHERE package_id = ?
             LIMIT 1`,
            [
                payload.type_id || null, payload.service_type, payload.package_name,
                payload.duration_hours || null, payload.duration_days || null, payload.price,
                payload.distance_limit_km, payload.extra_km_fee, payload.extra_hour_fee,
                payload.deposit_amount, payload.description || null,
                payload.active, packageId,
            ]
        );
    }
}

/**
 * Lấy tất cả gói thuê đang active kèm thông tin GIS,
 * dùng cho API nearby (kiểm tra phía JS thay vì MySQL spatial).
 * Nếu cột GIS chưa tồn tại (migration chưa chạy), fallback về query cơ bản
 * và coi mọi gói là "áp dụng toàn quốc" (is_geo_enabled = 0).
 */
export async function listActivePackagesWithGeo() {
    try {
        const [rows] = await sqldb.query(
            `SELECT package_id, type_id, service_type, package_name, duration_hours, duration_days, price,
                    distance_limit_km, extra_km_fee, extra_hour_fee, deposit_amount, description,
                    coverage_type, coverage_geojson, center_lat, center_lng, radius_km, is_geo_enabled,
                    active, date_created
             FROM rental_packages
             WHERE active = 1
             ORDER BY package_id DESC`
        );
        return rows.map(mapPackageRow);
    } catch {
        // Fallback: cột GIS chưa được migration → trả về không có giới hạn vùng
        const [rows] = await sqldb.query(
            `SELECT package_id, type_id, service_type, package_name, duration_hours, duration_days, price,
                    distance_limit_km, extra_km_fee, extra_hour_fee, deposit_amount, description,
                    active, date_created
             FROM rental_packages
             WHERE active = 1
             ORDER BY package_id DESC`
        );
        return rows.map((row) => mapPackageRow({
            ...row,
            coverage_type: null,
            coverage_geojson: null,
            center_lat: null,
            center_lng: null,
            radius_km: null,
            is_geo_enabled: 0,
        }));
    }
}

/**
 * Lấy danh sách xe đã đăng ký gói thuê (qua vehicle_rental_packages),
 * trả về thông tin xe kèm chủ xe và điểm đánh giá trung bình.
 * Chỉ trả về xe đã được admin duyệt (is_verified=1) và chủ xe đã đặt
 * ít nhất 1 block "manual_available" trong tương lai.
 */
export async function listPackageCars(packageId) {
    const [rows] = await sqldb.query(
        `SELECT v.vehicle_id, v.owner_id, v.type_id, v.brand, v.model, v.year, v.color,
                v.license_plate, v.seat_count, v.transmission, v.fuel_type, v.status, v.photo_url, v.interior_photo_urls,
                vt.type_name,
                vo.fullname AS owner_name, vo.phone AS owner_phone,
                ROUND(AVG(rv.rating), 1) AS avg_rating,
                COUNT(rv.id)            AS rating_count
         FROM vehicle_rental_packages vrp
         INNER JOIN vehicles v ON v.vehicle_id = vrp.vehicle_id
         LEFT JOIN vehicle_types vt  ON vt.type_id  = v.type_id
         LEFT JOIN vehicle_owners vo ON vo.owner_id = v.owner_id
         LEFT JOIN ratings_vehicles rv ON rv.vehicle_id = v.vehicle_id
         WHERE vrp.package_id = ?
           AND v.is_verified = 1
           AND v.status = 'available'
           AND NOT EXISTS (
               SELECT 1 FROM vehicle_maintenance vm
               WHERE vm.vehicle_id = v.vehicle_id
                 AND vm.status IN ('scheduled', 'in_progress')
                 AND vm.start_date <= NOW()
                 AND COALESCE(vm.end_date, '9999-12-31 23:59:59') >= NOW()
           )
           AND NOT EXISTS (
               SELECT 1 FROM rental_bookings rb
               WHERE rb.vehicle_id = v.vehicle_id
                 AND rb.status IN ('scheduled', 'pending', 'in_progress')
                 AND rb.start_datetime <= NOW()
                 AND rb.end_datetime >= NOW()
           )
         GROUP BY v.vehicle_id, vt.type_name, vo.fullname, vo.phone
         ORDER BY avg_rating DESC, v.vehicle_id ASC`,
        [packageId]
    );
    return rows.map((row) => ({
        vehicle_id: Number(row.vehicle_id),
        owner_id: Number(row.owner_id),
        type_id: Number(row.type_id),
        type_name: row.type_name,
        brand: row.brand,
        model: row.model,
        year: row.year,
        color: row.color,
        license_plate: row.license_plate,
        seat_count: Number(row.seat_count || 0),
        transmission: row.transmission,
        fuel_type: row.fuel_type,
        status: row.status,
        owner_name: row.owner_name,
        owner_phone: row.owner_phone,
        photo_url: row.photo_url || null,
        interior_photo_urls: (() => { try { return JSON.parse(row.interior_photo_urls || "[]"); } catch { return []; } })(),
        avg_rating: row.avg_rating !== null ? Number(row.avg_rating) : null,
        rating_count: Number(row.rating_count || 0),
    }));
}

export async function listRentalVehicles({ typeId, ownerId } = {}) {
    const whereClauses = ["v.status = 'available'", "v.is_verified = 1"];
    const params = [];
    if (typeId) {
        whereClauses.push("v.type_id = ?");
        params.push(typeId);
    }
    if (ownerId) {
        whereClauses.push("v.owner_id = ?");
        params.push(ownerId);
    }

    const [rows] = await sqldb.query(
        `SELECT v.vehicle_id, v.owner_id, v.type_id, v.brand, v.model, v.year, v.color, v.license_plate, v.seat_count,
                v.transmission, v.fuel_type, v.status, v.is_verified, vt.type_name, vo.fullname AS owner_name
         FROM vehicles v
         LEFT JOIN vehicle_types vt ON vt.type_id = v.type_id
         LEFT JOIN vehicle_owners vo ON vo.owner_id = v.owner_id
         WHERE ${whereClauses.join(" AND ")}
         ORDER BY v.vehicle_id DESC`,
        params
    );
    return rows.map((row) => ({
        vehicle_id: Number(row.vehicle_id),
        owner_id: Number(row.owner_id),
        type_id: Number(row.type_id),
        type_name: row.type_name,
        owner_name: row.owner_name,
        brand: row.brand,
        model: row.model,
        year: row.year,
        color: row.color,
        license_plate: row.license_plate,
        seat_count: Number(row.seat_count || 0),
        transmission: row.transmission,
        fuel_type: row.fuel_type,
        status: row.status,
        is_verified: Number(row.is_verified || 0),
    }));
}

export async function listRentalDrivers({ routeId, rideId } = {}) {
    const whereClauses = [
        "d.account_deleted = 0",
        "d.account_active = 1",
        "d.is_activated = 1",
        "d.available_for_rental = 1",
        "d.available = 1",
    ];
    const params = [];
    if (routeId) {
        whereClauses.push("(d.route_id = ? OR d.reg_route_id = ?)");
        params.push(routeId, routeId);
    }
    if (rideId) {
        whereClauses.push("d.ride_id = ?");
        params.push(rideId);
    }
    const [rows] = await sqldb.query(
        `SELECT driver_id, firstname, lastname, phone, ride_id, route_id, reg_route_id, hourly_rate, daily_rate
         FROM drivers d
         WHERE ${whereClauses.join(" AND ")}
         ORDER BY driver_id DESC`,
        params
    );
    return rows.map((row) => ({
        driver_id: Number(row.driver_id),
        firstname: row.firstname,
        lastname: row.lastname,
        full_name: `${row.firstname || ""} ${row.lastname || ""}`.trim(),
        phone: row.phone,
        ride_id: Number(row.ride_id || 0),
        route_id: row.route_id === null ? null : Number(row.route_id),
        reg_route_id: row.reg_route_id === null ? null : Number(row.reg_route_id),
        hourly_rate: Number(row.hourly_rate || 0),
        daily_rate: Number(row.daily_rate || 0),
    }));
}

export async function createRentalBooking(payload, conn) {
    const db = dbConnection(conn);
    const [result] = await db.query(
        `INSERT INTO rental_bookings
         (rental_code, user_id, vehicle_id, driver_id, package_id, owner_id, service_type, start_datetime, end_datetime,
          pickup_address, pickup_long, pickup_lat, dropoff_address, dropoff_long, dropoff_lat, distance_limit_km, distance_travelled_km,
          base_price, extra_time_fee, extra_distance_fee, deposit_amount, total_price, payment_status, payment_type, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
            payload.rental_code,
            payload.user_id,
            payload.vehicle_id || null,
            payload.driver_id || null,
            payload.package_id || null,
            payload.owner_id || null,
            payload.service_type,
            payload.start_datetime,
            payload.end_datetime,
            payload.pickup_address,
            payload.pickup_long || null,
            payload.pickup_lat || null,
            payload.dropoff_address || null,
            payload.dropoff_long || null,
            payload.dropoff_lat || null,
            payload.distance_limit_km,
            payload.distance_travelled_km || 0,
            payload.base_price,
            payload.extra_time_fee || 0,
            payload.extra_distance_fee || 0,
            payload.deposit_amount || 0,
            payload.total_price,
            payload.payment_status || "pending",
            payload.payment_type || null,
            payload.status || "scheduled",
        ]
    );
    const rentalId = Number(result.insertId);
    await db.query(
        `INSERT INTO rental_booking_status_history (rental_id, status, note) VALUES (?, ?, NULL)`,
        [rentalId, payload.status || "scheduled"]
    );
    return rentalId;
}

export async function findRentalBookingById(rentalId, conn) {
    const db = dbConnection(conn);
    const [rows] = await db.query(
        `SELECT rb.rental_id, rb.rental_code, rb.user_id, rb.vehicle_id, rb.driver_id, rb.package_id, rb.owner_id, rb.service_type,
                rb.start_datetime, rb.end_datetime, rb.actual_end_datetime, rb.pickup_address, rb.pickup_long, rb.pickup_lat,
                rb.dropoff_address, rb.dropoff_long, rb.dropoff_lat, rb.distance_limit_km, rb.distance_travelled_km, rb.base_price,
                rb.extra_time_fee, rb.extra_distance_fee, rb.deposit_amount, rb.total_price, rb.payment_status, rb.payment_type, rb.transaction_id,
                rb.status, rb.cancel_reason, rb.created_at, rb.updated_at,
                NULLIF(TRIM(CONCAT(COALESCE(u.firstname,''), ' ', COALESCE(u.lastname,''))), '') AS user_name,
                NULLIF(TRIM(CONCAT(COALESCE(d.firstname,''), ' ', COALESCE(d.lastname,''))), '') AS driver_name,
                d.phone AS driver_phone,
                v.license_plate, v.brand, v.model, vo.fullname AS owner_name, vo.phone AS owner_phone,
                rp.package_name
         FROM rental_bookings rb
         LEFT JOIN users u ON u.user_id = rb.user_id
         LEFT JOIN drivers d ON d.driver_id = rb.driver_id
         LEFT JOIN vehicles v ON v.vehicle_id = rb.vehicle_id
         LEFT JOIN vehicle_owners vo ON vo.owner_id = v.owner_id
         LEFT JOIN rental_packages rp ON rp.package_id = rb.package_id
         WHERE rb.rental_id = ?
         LIMIT 1`,
        [rentalId]
    );
    const row = rows[0];
    if (!row) return null;
    return {
        rental_id: Number(row.rental_id),
        rental_code: row.rental_code,
        user_id: Number(row.user_id),
        vehicle_id: row.vehicle_id === null ? null : Number(row.vehicle_id),
        driver_id: row.driver_id === null ? null : Number(row.driver_id),
        package_id: row.package_id === null ? null : Number(row.package_id),
        owner_id: row.owner_id === null ? null : Number(row.owner_id),
        service_type: Number(row.service_type || 1),
        start_datetime: row.start_datetime,
        end_datetime: row.end_datetime,
        actual_end_datetime: row.actual_end_datetime,
        pickup_address: row.pickup_address,
        pickup_long: row.pickup_long === null ? null : Number(row.pickup_long),
        pickup_lat: row.pickup_lat === null ? null : Number(row.pickup_lat),
        dropoff_address: row.dropoff_address,
        dropoff_long: row.dropoff_long === null ? null : Number(row.dropoff_long),
        dropoff_lat: row.dropoff_lat === null ? null : Number(row.dropoff_lat),
        distance_limit_km: Number(row.distance_limit_km || 0),
        distance_travelled_km: Number(row.distance_travelled_km || 0),
        base_price: Number(row.base_price || 0),
        extra_time_fee: Number(row.extra_time_fee || 0),
        extra_distance_fee: Number(row.extra_distance_fee || 0),
        deposit_amount: Number(row.deposit_amount || 0),
        total_price: Number(row.total_price || 0),
        payment_status: row.payment_status,
        payment_type: row.payment_type === null ? null : Number(row.payment_type),
        transaction_id: row.transaction_id === null ? null : Number(row.transaction_id),
        status: row.status,
        cancel_reason: row.cancel_reason,
        created_at: row.created_at,
        updated_at: row.updated_at,
        user_name: row.user_name,
        driver_name: row.driver_name,
        driver_phone: row.driver_phone,
        license_plate: row.license_plate,
        vehicle_name: [row.brand, row.model].filter(Boolean).join(" ").trim() || null,
        owner_name: row.owner_name,
        owner_phone: row.owner_phone,
        package_name: row.package_name,
    };
}

export async function listRentalBookings(filters = {}) {
    const whereClauses = [];
    const params = [];
    if (filters.userId !== undefined) {
        whereClauses.push("rb.user_id = ?");
        params.push(filters.userId);
    }
    if (filters.driverId !== undefined) {
        whereClauses.push("rb.driver_id = ?");
        params.push(filters.driverId);
    }
    if (filters.status) {
        whereClauses.push("rb.status = ?");
        params.push(filters.status);
    }
    if (filters.serviceType !== undefined) {
        whereClauses.push("rb.service_type = ?");
        params.push(filters.serviceType);
    }
    if (filters.search) {
        const keyword = `%${filters.search}%`;
        whereClauses.push("(rb.rental_code LIKE ? OR rb.pickup_address LIKE ? OR rb.dropoff_address LIKE ?)");
        params.push(keyword, keyword, keyword);
    }
    const whereSql = whereClauses.length ? `WHERE ${whereClauses.join(" AND ")}` : "";
    const limit = Math.min(Math.max(Number(filters.limit) || 20, 1), 100);
    const page = Math.max(Number(filters.page) || 1, 1);
    const offset = (page - 1) * limit;

    const [rows] = await sqldb.query(
        `SELECT rb.rental_id, rb.rental_code, rb.user_id, rb.driver_id, rb.vehicle_id, rb.service_type,
                rb.start_datetime, rb.end_datetime, rb.total_price, rb.payment_status, rb.status, rb.created_at,
                NULLIF(TRIM(CONCAT(COALESCE(u.firstname,''), ' ', COALESCE(u.lastname,''))), '') AS user_name,
                NULLIF(TRIM(CONCAT(COALESCE(d.firstname,''), ' ', COALESCE(d.lastname,''))), '') AS driver_name
         FROM rental_bookings rb
         LEFT JOIN users u ON u.user_id = rb.user_id
         LEFT JOIN drivers d ON d.driver_id = rb.driver_id
         ${whereSql}
         ORDER BY rb.rental_id DESC
         LIMIT ? OFFSET ?`,
        [...params, limit, offset]
    );

    const [countRows] = await sqldb.query(
        `SELECT COUNT(*) AS total_items
         FROM rental_bookings rb
         ${whereSql}`,
        params
    );

    return {
        items: rows.map((row) => ({
            rental_id: Number(row.rental_id),
            rental_code: row.rental_code,
            user_id: Number(row.user_id),
            user_name: row.user_name,
            driver_id: row.driver_id === null ? null : Number(row.driver_id),
            driver_name: row.driver_name,
            vehicle_id: row.vehicle_id === null ? null : Number(row.vehicle_id),
            service_type: Number(row.service_type || 1),
            start_datetime: row.start_datetime,
            end_datetime: row.end_datetime,
            total_price: Number(row.total_price || 0),
            payment_status: row.payment_status,
            status: row.status,
            created_at: row.created_at,
        })),
        totalItems: Number(countRows[0]?.total_items || 0),
        page,
        limit,
    };
}

export async function findRentalByIdForUpdate(rentalId, conn) {
    const db = dbConnection(conn);
    const [rows] = await db.query(
        `SELECT rental_id, user_id, vehicle_id, driver_id, package_id, owner_id, service_type, status, payment_status, base_price, deposit_amount, total_price, distance_limit_km, distance_travelled_km, start_datetime, end_datetime
         FROM rental_bookings
         WHERE rental_id = ?
         LIMIT 1
         FOR UPDATE`,
        [rentalId]
    );
    const row = rows[0];
    if (!row) return null;
    return {
        rental_id: Number(row.rental_id),
        user_id: Number(row.user_id),
        vehicle_id: row.vehicle_id === null ? null : Number(row.vehicle_id),
        driver_id: row.driver_id === null ? null : Number(row.driver_id),
        package_id: row.package_id === null ? null : Number(row.package_id),
        owner_id: row.owner_id === null ? null : Number(row.owner_id),
        service_type: Number(row.service_type || 1),
        status: row.status,
        payment_status: row.payment_status,
        base_price: Number(row.base_price || 0),
        deposit_amount: Number(row.deposit_amount || 0),
        total_price: Number(row.total_price || 0),
        distance_limit_km: Number(row.distance_limit_km || 0),
        distance_travelled_km: Number(row.distance_travelled_km || 0),
        start_datetime: row.start_datetime,
        end_datetime: row.end_datetime,
    };
}

export async function updateRentalStatus(payload, conn) {
    const db = dbConnection(conn);
    await db.query(
        `UPDATE rental_bookings
         SET status = ?, cancel_reason = ?, actual_end_datetime = ?, extra_time_fee = ?, extra_distance_fee = ?, total_price = ?, updated_at = NOW()
         WHERE rental_id = ?
         LIMIT 1`,
        [
            payload.status,
            payload.cancel_reason || null,
            payload.actual_end_datetime || null,
            payload.extra_time_fee || 0,
            payload.extra_distance_fee || 0,
            payload.total_price,
            payload.rental_id,
        ]
    );
    await db.query(
        `INSERT INTO rental_booking_status_history (rental_id, status, note) VALUES (?, ?, ?)`,
        [payload.rental_id, payload.status, payload.cancel_reason || null]
    );
}

export async function assignRentalDriverVehicle(payload, conn) {
    const db = dbConnection(conn);
    await db.query(
        `UPDATE rental_bookings
         SET driver_id = ?, vehicle_id = ?, owner_id = ?, updated_at = NOW()
         WHERE rental_id = ?
         LIMIT 1`,
        [payload.driver_id || null, payload.vehicle_id || null, payload.owner_id || null, payload.rental_id]
    );
}

export async function findVehicleById(vehicleId, conn) {
    const db = dbConnection(conn);
    const [rows] = await db.query(
        `SELECT vehicle_id, owner_id, type_id, status, is_verified, seat_count
         FROM vehicles
         WHERE vehicle_id = ?
         LIMIT 1`,
        [vehicleId]
    );
    const row = rows[0];
    if (!row) return null;
    return {
        vehicle_id: Number(row.vehicle_id),
        owner_id: Number(row.owner_id),
        type_id: Number(row.type_id),
        status: row.status,
        is_verified: Number(row.is_verified || 0),
        seat_count: Number(row.seat_count || 0),
    };
}

// ─── Vehicle–Package assignment (vehicle_rental_packages) ────────────────────

export async function listVehiclePackages(vehicleId, conn) {
    const db = dbConnection(conn);
    const [rows] = await db.query(
        `SELECT rp.package_id, rp.type_id, rp.service_type, rp.package_name,
                rp.duration_hours, rp.duration_days, rp.price, rp.distance_limit_km,
                rp.extra_km_fee, rp.extra_hour_fee, rp.deposit_amount, rp.description, rp.active
         FROM vehicle_rental_packages vrp
         INNER JOIN rental_packages rp ON rp.package_id = vrp.package_id
         WHERE vrp.vehicle_id = ?
         ORDER BY rp.package_id ASC`,
        [vehicleId]
    );
    return rows.map((row) => ({
        package_id: Number(row.package_id),
        type_id: row.type_id === null ? null : Number(row.type_id),
        service_type: Number(row.service_type || 1),
        package_name: row.package_name,
        duration_hours: row.duration_hours === null ? null : Number(row.duration_hours),
        duration_days: row.duration_days === null ? null : Number(row.duration_days),
        price: Number(row.price || 0),
        distance_limit_km: Number(row.distance_limit_km || 0),
        extra_km_fee: Number(row.extra_km_fee || 0),
        extra_hour_fee: Number(row.extra_hour_fee || 0),
        deposit_amount: Number(row.deposit_amount || 0),
        description: row.description,
        active: Number(row.active || 0),
    }));
}

export async function replaceVehiclePackages(vehicleId, packageIds, conn) {
    const db = dbConnection(conn);
    await db.query(`DELETE FROM vehicle_rental_packages WHERE vehicle_id = ?`, [vehicleId]);
    if (packageIds.length > 0) {
        const values = packageIds.map((pid) => [vehicleId, pid]);
        await db.query(
            `INSERT INTO vehicle_rental_packages (vehicle_id, package_id) VALUES ?`,
            [values]
        );
    }
}

// ─── Driver availability for rental ──────────────────────────────────────────

export async function findAvailableDriversForRental(startDatetime, endDatetime, conn) {
    const db = dbConnection(conn);
    const [rows] = await db.query(
        `SELECT DISTINCT d.driver_id, d.firstname, d.lastname, d.phone
         FROM drivers d
         INNER JOIN driver_schedule ds
             ON ds.driver_id = d.driver_id
             AND ds.status = 'available'
             AND ds.start_datetime <= ?
             AND ds.end_datetime >= ?
         WHERE d.available_for_rental = 1
           AND d.account_active = 1
           AND d.is_activated = 1
           AND d.account_deleted = 0
           AND d.available = 1
           AND NOT EXISTS (
               SELECT 1 FROM rental_bookings rb
               WHERE rb.driver_id = d.driver_id
                 AND rb.service_type IN (2, 3)
                 AND rb.status IN ('scheduled', 'pending', 'in_progress')
                 AND rb.start_datetime < ?
                 AND rb.end_datetime > ?
           )`,
        [startDatetime, endDatetime, endDatetime, startDatetime]
    );
    return rows.map((row) => ({
        driver_id: Number(row.driver_id),
        firstname: row.firstname,
        lastname: row.lastname,
        phone: row.phone,
    }));
}

export async function insertDriverNotificationsBatch(notifications, conn) {
    const db = dbConnection(conn);
    if (!notifications.length) return;
    const values = notifications.map((n) => [n.driver_id, n.content, n.rental_id, n.n_type]);
    await db.query(
        `INSERT INTO driver_notifications (driver_id, content, rental_id, n_type, is_read)
         VALUES ?`,
        [values]
    );
}

export async function countExistingRentalNotificationsForDrivers(rentalId, conn) {
    const db = dbConnection(conn);
    const [rows] = await db.query(
        `SELECT COUNT(*) AS cnt FROM driver_notifications WHERE rental_id = ? AND n_type = 10`,
        [rentalId]
    );
    return Number(rows[0]?.cnt || 0);
}

// ─── Driver lookup ────────────────────────────────────────────────────────────

export async function findDriverById(driverId, conn) {
    const db = dbConnection(conn);
    const [rows] = await db.query(
        `SELECT driver_id, available, available_for_rental, account_active, account_deleted, is_activated
         FROM drivers
         WHERE driver_id = ?
         LIMIT 1`,
        [driverId]
    );
    const row = rows[0];
    if (!row) return null;
    return {
        driver_id: Number(row.driver_id),
        available: Number(row.available || 0),
        available_for_rental: Number(row.available_for_rental || 0),
        account_active: Number(row.account_active || 0),
        account_deleted: Number(row.account_deleted || 0),
        is_activated: Number(row.is_activated || 0),
    };
}
