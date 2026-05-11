import sqldb from "../config/sqldatabase.js";

const BOOKING_SORT_COLUMNS = {
    date_created: "b.date_created",
    pickup_datetime: "b.pickup_datetime",
    status: "b.status",
    estimated_cost: "b.estimated_cost",
    id: "b.id",
};

const PROCESSING_STATUS_SQL = "b.status IN (0, 1, 6)";

function dbConnection(conn) {
    return conn || sqldb;
}

function normalizeNumber(value, fallback = 0) {
    const numericValue = Number(value);
    return Number.isFinite(numericValue) ? numericValue : fallback;
}

function mapBookingRow(row) {
    return {
        id: Number(row.id),
        b_uuid: row.b_uuid,
        user_id: Number(row.user_id),
        user_name: row.user_name,
        user_phone: row.user_phone,
        driver_id: Number(row.driver_id || 0),
        driver_name: row.driver_name,
        driver_phone: row.driver_phone,
        driver_rating: row.driver_rating === null ? null : Number(row.driver_rating || 5),
        driver_photo_file: row.driver_photo_file || null,
        driver_car_model: row.driver_car_model || null,
        driver_car_plate_num: row.driver_car_plate_num || null,
        pickup_datetime: row.pickup_datetime,
        pickup_address: row.pickup_address,
        pickup_long: row.pickup_long,
        pickup_lat: row.pickup_lat,
        dropoff_datetime: row.dropoff_datetime,
        dropoff_address: row.dropoff_address,
        dropoff_long: row.dropoff_long,
        dropoff_lat: row.dropoff_lat,
        waypoint1_address: row.waypoint1_address,
        waypoint1_long: row.waypoint1_long,
        waypoint1_lat: row.waypoint1_lat,
        waypoint2_address: row.waypoint2_address,
        waypoint2_long: row.waypoint2_long,
        waypoint2_lat: row.waypoint2_lat,
        est_distance: normalizeNumber(row.est_distance),
        est_duration: normalizeNumber(row.est_duration),
        estimated_cost: normalizeNumber(row.estimated_cost),
        actual_cost: normalizeNumber(row.actual_cost),
        paid_amount: normalizeNumber(row.paid_amount),
        haspaid: Number(row.haspaid || 0),
        route_id: Number(row.route_id || 0),
        route_name: row.route_name,
        route_scope: row.route_scope === null || row.route_scope === undefined ? null : Number(row.route_scope),
        ride_id: Number(row.ride_id || 0),
        ride_type: row.ride_type,
        payment_type: row.payment_type === null ? null : Number(row.payment_type),
        scheduled: Number(row.scheduled || 0),
        scheduled_driver: Number(row.scheduled_driver || 0),
        dispatch_mode: Number(row.dispatch_mode || 0),
        status: Number(row.status || 0),
        cancel_comment: row.cancel_comment,
        num_seats: Number(row.num_seats || 1),
        date_created: row.date_created,
        date_arrived: row.date_arrived,
        date_started: row.date_started,
        date_completed: row.date_completed,
    };
}

export async function findPassengerById(userId, conn) {
    const db = dbConnection(conn);
    const [rows] = await db.query(
        `SELECT user_id, firstname, lastname, phone, account_active, is_activated, account_deleted
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
        account_active: Number(row.account_active || 0),
        is_activated: Number(row.is_activated || 0),
        account_deleted: Number(row.account_deleted || 0),
    };
}

export async function findRouteById(routeId, conn) {
    const db = dbConnection(conn);
    const [rows] = await db.query(
        `SELECT id, r_title, r_scope FROM routes WHERE id = ? LIMIT 1`,
        [routeId]
    );

    if (!rows[0]) {
        return null;
    }

    return {
        id: Number(rows[0].id),
        r_title: rows[0].r_title,
        r_scope: rows[0].r_scope === null || rows[0].r_scope === undefined ? null : Number(rows[0].r_scope),
    };
}

export async function findRideById(rideId, conn) {
    const db = dbConnection(conn);
    const [rows] = await db.query(
        `SELECT id, ride_type, avail FROM rides WHERE id = ? LIMIT 1`,
        [rideId]
    );

    if (!rows[0]) {
        return null;
    }

    return {
        id: Number(rows[0].id),
        ride_type: rows[0].ride_type,
        avail: Number(rows[0].avail || 0),
    };
}

export async function findBookingByUuidForUser({ userId, bookingUuid }, conn) {
    const db = dbConnection(conn);
    const [rows] = await db.query(
        `SELECT id FROM bookings WHERE user_id = ? AND b_uuid = ? LIMIT 1`,
        [userId, bookingUuid]
    );

    return rows[0] ? Number(rows[0].id) : null;
}

export async function findUserActiveBookingForUpdate(userId, conn) {
    const db = dbConnection(conn);
    const [rows] = await db.query(
        `SELECT id, status
         FROM bookings
         WHERE user_id = ? AND status IN (0, 1, 6)
         ORDER BY id DESC
         LIMIT 1
         FOR UPDATE`,
        [userId]
    );

    if (!rows[0]) return null;

    return {
        id: Number(rows[0].id),
        status: Number(rows[0].status || 0),
    };
}

export async function insertBooking(payload, conn) {
    const db = dbConnection(conn);

    const [result] = await db.query(
        `INSERT INTO bookings (
            b_uuid,
            user_id,
            user_firstname,
            user_lastname,
            user_phone,
            pickup_datetime,
            pickup_address,
            pickup_long,
            pickup_lat,
            dropoff_address,
            dropoff_long,
            dropoff_lat,
            waypoint1_address,
            waypoint1_long,
            waypoint1_lat,
            waypoint2_address,
            waypoint2_long,
            waypoint2_lat,
            est_distance,
            est_duration,
            estimated_cost,
            actual_cost,
            route_id,
            ride_id,
            payment_type,
            scheduled,
            dispatch_mode,
            num_seats,
            cur_symbol,
            cur_code,
            status,
            scheduled_driver
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)` ,
        [
            payload.bookingUuid,
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
            payload.route_id,
            payload.ride_id,
            payload.payment_type,
            payload.scheduled,
            payload.dispatch_mode,
            payload.num_seats,
            payload.cur_symbol,
            payload.cur_code,
            payload.status,
            payload.scheduled_driver,
        ]
    );

    return Number(result.insertId);
}

export async function findBookingByIdForUpdate(bookingId, conn) {
    const db = dbConnection(conn);
    const [rows] = await db.query(
        `SELECT id, user_id, driver_id, scheduled, scheduled_driver, status, payment_type,
                haspaid, paid_amount, transaction_id
         FROM bookings
         WHERE id = ?
         LIMIT 1
         FOR UPDATE`,
        [bookingId]
    );

    if (!rows[0]) {
        return null;
    }

    return {
        id: Number(rows[0].id),
        user_id: Number(rows[0].user_id),
        driver_id: Number(rows[0].driver_id || 0),
        scheduled: Number(rows[0].scheduled || 0),
        scheduled_driver: Number(rows[0].scheduled_driver || 0),
        status: Number(rows[0].status || 0),
        payment_type: rows[0].payment_type === null ? null : Number(rows[0].payment_type),
        haspaid: Number(rows[0].haspaid || 0),
        paid_amount: rows[0].paid_amount != null ? Number(rows[0].paid_amount) : null,
        transaction_id: rows[0].transaction_id != null ? Number(rows[0].transaction_id) : null,
    };
}

export async function findDriverById(driverId, conn) {
    const db = dbConnection(conn);
    const [rows] = await db.query(
        `SELECT driver_id, firstname, lastname, phone, account_active, is_activated,
                account_deleted, available, operation_status, route_id, ride_id
         FROM drivers
         WHERE driver_id = ?
         LIMIT 1`,
        [driverId]
    );

    const row = rows[0];
    if (!row) return null;

    return {
        driver_id: Number(row.driver_id),
        firstname: row.firstname,
        lastname: row.lastname,
        phone: row.phone,
        franchise_id: 0,
        account_active: Number(row.account_active || 0),
        is_activated: Number(row.is_activated || 0),
        account_deleted: Number(row.account_deleted || 0),
        available: Number(row.available || 0),
        operation_status: Number(row.operation_status || 0),
        route_id: row.route_id === null ? null : Number(row.route_id),
        ride_id: row.ride_id === null ? null : Number(row.ride_id),
    };
}

export async function updateBookingDriverAssignment({
    bookingId,
    driverId,
    driverFirstname,
    driverLastname,
    driverPhone,
    dispatchMode,
    scheduledDriver,
}, conn) {
    const db = dbConnection(conn);
    await db.query(
        `UPDATE bookings
         SET driver_id = ?,
             driver_firstname = ?,
             driver_lastname = ?,
             driver_phone = ?,
             dispatch_mode = ?,
             scheduled_driver = ?
         WHERE id = ?
         LIMIT 1`,
        [
            driverId,
            driverFirstname,
            driverLastname,
            driverPhone,
            dispatchMode,
            scheduledDriver,
            bookingId,
        ]
    );
}

export async function finalizeNonAcceptedAllocations(bookingId, conn) {
    const db = dbConnection(conn);
    await db.query(
        `UPDATE driver_allocate
         SET status = 4
         WHERE booking_id = ? AND status IN (0, 2, 3)`,
        [bookingId]
    );
}

export async function createDriverAllocation({ bookingId, driverId, status }, conn) {
    const db = dbConnection(conn);
    const [result] = await db.query(
        `INSERT INTO driver_allocate (booking_id, driver_id, status)
         VALUES (?, ?, ?)`,
        [bookingId, driverId, status]
    );

    return Number(result.insertId);
}

export async function updateBookingStatus({ bookingId, status, cancelComment = null }, conn) {
    const db = dbConnection(conn);

    const timestampAssignments = [];
    if (status === 6) {
        timestampAssignments.push("date_arrived = COALESCE(date_arrived, NOW())");
    }
    if (status === 1) {
        timestampAssignments.push("date_started = COALESCE(date_started, NOW())");
    }
    if (status === 3) {
        timestampAssignments.push("date_completed = COALESCE(date_completed, NOW())");
    }

    const sql = `UPDATE bookings
                 SET status = ?,
                     cancel_comment = ?,
                     ${timestampAssignments.length > 0 ? `${timestampAssignments.join(", ")},` : ""}
                     dropoff_datetime = CASE WHEN ? = 3 THEN COALESCE(dropoff_datetime, NOW()) ELSE dropoff_datetime END
                 WHERE id = ?
                 LIMIT 1`;

    await db.query(sql, [status, cancelComment, status, bookingId]);
}

function buildBookingFiltersWhere(filters, auth, { ignoreScheduledOnly = false } = {}) {
    const whereClauses = [];
    const params = [];

    if (auth.role === "passenger") {
        whereClauses.push("b.user_id = ?");
        params.push(auth.userId);
    }

    if (!ignoreScheduledOnly && filters.scheduledOnly) {
        whereClauses.push("b.scheduled = 1");
    }

    if (filters.processingOnly) {
        whereClauses.push(PROCESSING_STATUS_SQL);
    }

    if (filters.userId) {
        whereClauses.push("b.user_id = ?");
        params.push(filters.userId);
    }

    if (filters.status !== undefined) {
        whereClauses.push("b.status = ?");
        params.push(filters.status);
    }

    if (filters.bookingType !== undefined) {
        whereClauses.push("r.r_scope = ?");
        params.push(filters.bookingType);
    }

    if (filters.bookingCode) {
        whereClauses.push("(CAST(b.id AS CHAR) LIKE ? OR b.b_uuid LIKE ?)");
        const keyword = `%${filters.bookingCode}%`;
        params.push(keyword, keyword);
    }

    if (filters.customerName) {
        whereClauses.push(
            "CONCAT(COALESCE(b.user_firstname, ''), ' ', COALESCE(b.user_lastname, '')) LIKE ?"
        );
        params.push(`%${filters.customerName}%`);
    }

    if (filters.customerPhone) {
        whereClauses.push("b.user_phone LIKE ?");
        params.push(`%${filters.customerPhone}%`);
    }

    if (filters.driverKeyword) {
        whereClauses.push(
            "(CAST(b.driver_id AS CHAR) LIKE ? OR CONCAT(COALESCE(b.driver_firstname, ''), ' ', COALESCE(b.driver_lastname, '')) LIKE ?)"
        );
        const keyword = `%${filters.driverKeyword}%`;
        params.push(keyword, keyword);
    }

    if (filters.paymentType !== undefined) {
        whereClauses.push("b.payment_type = ?");
        params.push(filters.paymentType);
    }

    if (filters.bookingDate) {
        whereClauses.push("DATE(b.date_created) = ?");
        params.push(filters.bookingDate);
    }

    if (filters.search) {
        whereClauses.push(
            `(CAST(b.id AS CHAR) LIKE ? OR b.b_uuid LIKE ? OR b.pickup_address LIKE ? OR b.dropoff_address LIKE ? OR u.phone LIKE ? OR d.phone LIKE ?)`
        );
        const keyword = `%${filters.search}%`;
        params.push(keyword, keyword, keyword, keyword, keyword, keyword);
    }

    const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(" AND ")}` : "";

    return { whereSql, params };
}

export async function listBookings(filters, auth) {
    const { whereSql, params } = buildBookingFiltersWhere(filters, auth);
    const sortColumn = BOOKING_SORT_COLUMNS[filters.sort_by] || BOOKING_SORT_COLUMNS.date_created;
    const sortOrder = filters.sort_order === "ASC" ? "ASC" : "DESC";
    const offset = (filters.page - 1) * filters.limit;

    const [rows] = await sqldb.query(
        `SELECT
            b.id,
            b.b_uuid,
            b.user_id,
            NULLIF(TRIM(CONCAT(COALESCE(u.firstname, ''), ' ', COALESCE(u.lastname, ''))), '') AS user_name,
            b.user_phone,
            b.driver_id,
            NULLIF(TRIM(CONCAT(COALESCE(d.firstname, ''), ' ', COALESCE(d.lastname, ''))), '') AS driver_name,
            b.driver_phone,
            d.driver_rating,
            d.photo_file AS driver_photo_file,
            d.car_model AS driver_car_model,
            d.car_plate_num AS driver_car_plate_num,
            b.pickup_datetime,
            b.pickup_address,
            b.dropoff_address,
            b.estimated_cost,
            b.actual_cost,
            b.payment_type,
            b.scheduled,
            b.status,
            b.date_created,
            b.date_started,
            b.date_completed,
            r.r_title AS route_name,
            r.r_scope AS route_scope,
            rd.ride_type
         FROM bookings b
         LEFT JOIN users u ON u.user_id = b.user_id
         LEFT JOIN drivers d ON d.driver_id = b.driver_id
         LEFT JOIN routes r ON r.id = b.route_id
         LEFT JOIN rides rd ON rd.id = b.ride_id
         ${whereSql}
         ORDER BY ${sortColumn} ${sortOrder}, b.id DESC
         LIMIT ? OFFSET ?`,
        [...params, filters.limit, offset]
    );

    return rows.map(mapBookingRow);
}

export async function countBookings(filters, auth) {
    const { whereSql, params } = buildBookingFiltersWhere(filters, auth);

    const [rows] = await sqldb.query(
        `SELECT COUNT(*) AS total_items
         FROM bookings b
         LEFT JOIN users u ON u.user_id = b.user_id
         LEFT JOIN drivers d ON d.driver_id = b.driver_id
         ${whereSql}`,
        params
    );

    return Number(rows[0]?.total_items || 0);
}

export async function countBookingsByScheduleType(filters, auth) {
    const { whereSql, params } = buildBookingFiltersWhere(filters, auth, { ignoreScheduledOnly: true });
    const [rows] = await sqldb.query(
        `SELECT
            SUM(CASE WHEN b.scheduled = 0 THEN 1 ELSE 0 END) AS immediate_count,
            SUM(CASE WHEN b.scheduled = 1 THEN 1 ELSE 0 END) AS scheduled_count
         FROM bookings b
         LEFT JOIN users u ON u.user_id = b.user_id
         LEFT JOIN drivers d ON d.driver_id = b.driver_id
         LEFT JOIN routes r ON r.id = b.route_id
         ${whereSql}`,
        params
    );

    return {
        immediate_count: Number(rows[0]?.immediate_count || 0),
        scheduled_count: Number(rows[0]?.scheduled_count || 0),
    };
}

export async function findBookingDetailById(bookingId) {
    const [rows] = await sqldb.query(
        `SELECT
            b.id,
            b.b_uuid,
            b.user_id,
            b.user_firstname,
            b.user_lastname,
            b.user_phone,
            b.driver_id,
            b.driver_firstname,
            b.driver_lastname,
            b.driver_phone,
            b.pickup_datetime,
            b.pickup_address,
            b.pickup_long,
            b.pickup_lat,
            b.dropoff_datetime,
            b.dropoff_address,
            b.dropoff_long,
            b.dropoff_lat,
            b.waypoint1_address,
            b.waypoint1_long,
            b.waypoint1_lat,
            b.waypoint2_address,
            b.waypoint2_long,
            b.waypoint2_lat,
            b.est_distance,
            b.est_duration,
            b.estimated_cost,
            b.actual_cost,
            b.paid_amount,
            b.haspaid,
            b.route_id,
            r.r_title AS route_name,
            b.ride_id,
            rd.ride_type,
            b.payment_type,
            b.scheduled,
            b.scheduled_driver,
            b.dispatch_mode,
            b.status,
            b.cancel_comment,
            b.num_seats,
            b.date_created,
            b.date_arrived,
            b.date_started,
            b.date_completed,
            NULLIF(TRIM(CONCAT(COALESCE(u.firstname, ''), ' ', COALESCE(u.lastname, ''))), '') AS user_name,
            u.email AS user_email,
            u.account_active AS user_account_active,
            NULLIF(TRIM(CONCAT(COALESCE(d.firstname, ''), ' ', COALESCE(d.lastname, ''))), '') AS driver_name,
            d.account_active AS driver_account_active,
            d.available AS driver_available,
            d.operation_status AS driver_operation_status,
            d.ride_id AS driver_ride_id,
            d.route_id AS driver_route_id,
            d.driver_rating,
            d.photo_file AS driver_photo_file,
            d.car_model AS driver_car_model,
            d.car_plate_num AS driver_car_plate_num
         FROM bookings b
         LEFT JOIN users u ON u.user_id = b.user_id
         LEFT JOIN drivers d ON d.driver_id = b.driver_id
         LEFT JOIN routes r ON r.id = b.route_id
         LEFT JOIN rides rd ON rd.id = b.ride_id
         WHERE b.id = ?
         LIMIT 1`,
        [bookingId]
    );

    const row = rows[0];
    if (!row) {
        return null;
    }

    return {
        booking: mapBookingRow(row),
        user: {
            id: Number(row.user_id),
            full_name: row.user_name,
            firstname: row.user_firstname,
            lastname: row.user_lastname,
            phone: row.user_phone,
            email: row.user_email,
            account_active: Number(row.user_account_active || 0),
        },
        driver:
            Number(row.driver_id || 0) > 0
                ? {
                    id: Number(row.driver_id),
                    full_name: row.driver_name,
                    firstname: row.driver_firstname,
                    lastname: row.driver_lastname,
                    phone: row.driver_phone,
                    rating: row.driver_rating === null ? null : Number(row.driver_rating || 5),
                    avatar_url: row.driver_photo_file || null,
                    vehicle_name: row.driver_car_model || null,
                    license_plate: row.driver_car_plate_num || null,
                    account_active: Number(row.driver_account_active || 0),
                    available: Number(row.driver_available || 0),
                    operation_status: Number(row.driver_operation_status || 0),
                    ride_id: row.driver_ride_id === null ? null : Number(row.driver_ride_id),
                    route_id: row.driver_route_id === null ? null : Number(row.driver_route_id),
                }
                : null,
    };
}

export async function findBookingAllocations(bookingId) {
    const [rows] = await sqldb.query(
        `SELECT
            da.id,
            da.booking_id,
            da.driver_id,
            da.status,
            da.date_allocated,
            NULLIF(TRIM(CONCAT(COALESCE(d.firstname, ''), ' ', COALESCE(d.lastname, ''))), '') AS driver_name,
            d.phone AS driver_phone
         FROM driver_allocate da
         LEFT JOIN drivers d ON d.driver_id = da.driver_id
         WHERE da.booking_id = ?
         ORDER BY da.id DESC`,
        [bookingId]
    );

    return rows.map((row) => ({
        id: Number(row.id),
        booking_id: Number(row.booking_id),
        driver_id: Number(row.driver_id || 0),
        driver_name: row.driver_name,
        driver_phone: row.driver_phone,
        status: Number(row.status || 0),
        date_allocated: row.date_allocated,
    }));
}

export async function findLatestDriverLocation(driverId) {
    const [rows] = await sqldb.query(
        `SELECT driver_id, \`long\`, lat, b_angle, loc_static_status, loc_static_duration, updated_at
         FROM driver_current_locations
         WHERE driver_id = ?
         LIMIT 1`,
        [driverId]
    );

    const row = rows[0];
    if (!row) {
        return null;
    }

    return {
        id: Number(row.driver_id),
        driver_id: Number(row.driver_id),
        long: normalizeNumber(row.long),
        lat: normalizeNumber(row.lat),
        b_angle: normalizeNumber(row.b_angle),
        loc_static_status: Number(row.loc_static_status || 0),
        loc_static_duration: row.loc_static_duration === null ? null : Number(row.loc_static_duration),
        location_date: row.updated_at,
    };
}

export async function insertNotification({ personId, userType, content, routeId = 0, nType = 2 }, conn) {
    const db = dbConnection(conn);
    const isDriver = Number(userType) === 1;
    const table = isDriver ? "driver_notifications" : "user_notifications";
    const actorColumn = isDriver ? "driver_id" : "user_id";

    await db.query(
        `INSERT INTO ${table} (${actorColumn}, content, route_id, n_type)
         VALUES (?, ?, ?, ?)`,
        [personId, content, routeId || null, nType]
    );
}

export async function listBookingMetaRoutes() {
    const [rows] = await sqldb.query(
        `SELECT id, r_title, r_scope
         FROM routes
         ORDER BY r_title ASC, id ASC`
    );

    return rows.map((row) => ({
        id: Number(row.id),
        r_title: row.r_title,
        r_scope: row.r_scope === null || row.r_scope === undefined ? null : Number(row.r_scope),
    }));
}

export async function listBookingMetaRides() {
    const [rows] = await sqldb.query(
        `SELECT id, ride_type, num_seats
         FROM rides
         WHERE avail = 1
         ORDER BY id ASC`
    );

    return rows.map((row) => ({
        id: Number(row.id),
        ride_type: row.ride_type,
        num_seats: Number(row.num_seats || 0),
    }));
}

export async function findTariffByRouteAndRide(routeId, rideId) {
    const [rows] = await sqldb.query(
        `SELECT
            rt.id,
            rt.routes_id,
            rt.ride_id,
            rt.cost_per_km,
            rt.cost_per_minute,
            rt.wait_cost_per_minute,
            rt.pickup_cost,
            rt.drop_off_cost,
            rt.init_distance,
            rt.ncost_per_km,
            rt.ncost_per_minute,
            rt.nwait_cost_per_minute,
            rt.npickup_cost,
            rt.ndrop_off_cost,
            r.city_currency_id,
            c.symbol AS cur_symbol,
            c.iso_code AS cur_code
         FROM rides_tariffs rt
         INNER JOIN routes r ON r.id = rt.routes_id
         LEFT JOIN currencies c ON c.id = r.city_currency_id
         WHERE rt.routes_id = ? AND rt.ride_id = ? AND rt.service_type = 0
         LIMIT 1`,
        [routeId, rideId]
    );

    const row = rows[0];
    if (!row) return null;

    return {
        id: Number(row.id),
        routes_id: Number(row.routes_id),
        ride_id: Number(row.ride_id),
        cost_per_km: normalizeNumber(row.cost_per_km),
        cost_per_minute: normalizeNumber(row.cost_per_minute),
        wait_cost_per_minute: normalizeNumber(row.wait_cost_per_minute),
        pickup_cost: normalizeNumber(row.pickup_cost),
        drop_off_cost: normalizeNumber(row.drop_off_cost),
        init_distance: normalizeNumber(row.init_distance),
        ncost_per_km: normalizeNumber(row.ncost_per_km),
        ncost_per_minute: normalizeNumber(row.ncost_per_minute),
        nwait_cost_per_minute: normalizeNumber(row.nwait_cost_per_minute),
        npickup_cost: normalizeNumber(row.npickup_cost),
        ndrop_off_cost: normalizeNumber(row.ndrop_off_cost),
        city_currency_id: Number(row.city_currency_id || 0),
        cur_symbol: row.cur_symbol,
        cur_code: row.cur_code,
    };
}

export async function listLocationSuggestions(keyword, limit = 8) {
    const likeKeyword = `%${keyword}%`;
    const [rows] = await sqldb.query(
        `SELECT suggestion, source FROM (
            SELECT DISTINCT b.pickup_address AS suggestion, 'pickup' AS source
            FROM bookings b
            WHERE b.pickup_address IS NOT NULL AND b.pickup_address <> '' AND b.pickup_address LIKE ?
            UNION
            SELECT DISTINCT b.dropoff_address AS suggestion, 'dropoff' AS source
            FROM bookings b
            WHERE b.dropoff_address IS NOT NULL AND b.dropoff_address <> '' AND b.dropoff_address LIKE ?
            UNION
            SELECT DISTINCT r.r_title AS suggestion, 'route' AS source
            FROM routes r
            WHERE r.r_title IS NOT NULL AND r.r_title <> '' AND r.r_title LIKE ?
        ) src
        ORDER BY suggestion ASC
        LIMIT ?`,
        [likeKeyword, likeKeyword, likeKeyword, limit]
    );

    return rows.map((row) => ({
        suggestion: row.suggestion,
        source: row.source,
    }));
}

export async function listAssignableDrivers({ routeId, rideId, search, limit = 30 }) {
    const whereClauses = [
        "d.account_active = 1",
        "d.account_deleted = 0",
        "d.is_activated = 1",
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

    if (search) {
        const keyword = `%${search}%`;
        whereClauses.push(
            "(CAST(d.driver_id AS CHAR) LIKE ? OR d.phone LIKE ? OR CONCAT(COALESCE(d.firstname,''), ' ', COALESCE(d.lastname,'')) LIKE ?)"
        );
        params.push(keyword, keyword, keyword);
    }

    const [rows] = await sqldb.query(
        `SELECT
            d.driver_id,
            d.firstname,
            d.lastname,
            d.phone,
            d.available,
            d.operation_status,
            d.route_id,
            d.reg_route_id,
            d.ride_id,
            r.r_title AS route_name,
            rd.ride_type
         FROM drivers d
         LEFT JOIN routes r ON r.id = d.route_id
         LEFT JOIN rides rd ON rd.id = d.ride_id
         WHERE ${whereClauses.join(" AND ")}
         ORDER BY d.available DESC, d.driver_id DESC
         LIMIT ?`,
        [...params, limit]
    );

    return rows.map((row) => ({
        driver_id: Number(row.driver_id),
        firstname: row.firstname,
        lastname: row.lastname,
        full_name: `${row.firstname || ""} ${row.lastname || ""}`.trim(),
        phone: row.phone,
        available: Number(row.available || 0),
        operation_status: Number(row.operation_status || 0),
        route_id: row.route_id === null ? null : Number(row.route_id),
        reg_route_id: row.reg_route_id === null ? null : Number(row.reg_route_id),
        ride_id: row.ride_id === null ? null : Number(row.ride_id),
        route_name: row.route_name,
        ride_type: row.ride_type,
    }));
}

/**
 * Find available drivers near a GPS coordinate using Haversine formula.
 * Conditions:
 *  - account_active=1, is_activated=1, available=1, operation_status=0
 *  - GPS updated within last 5 minutes
 *  - Not currently on an active booking (status 0, 1, or 6)
 *  - Not already tried for this booking (excludeIds)
 * Ordered by distance ASC.
 */
export async function findNearbyDriversForRide(lat, lng, radiusKm = 2, excludeIds = []) {
    // Bounding box pre-filter (1 degree lat ≈ 111 km)
    const latDelta = radiusKm / 111.0;
    const lngDelta = radiusKm / (111.0 * Math.cos((lat * Math.PI) / 180));

    const latMin = lat - latDelta;
    const latMax = lat + latDelta;
    const lngMin = lng - lngDelta;
    const lngMax = lng + lngDelta;

    let excludeSql = "";
    const excludeParams = [];

    if (excludeIds.length > 0) {
        excludeSql = `AND d.driver_id NOT IN (${excludeIds.map(() => "?").join(",")})`;
        excludeParams.push(...excludeIds);
    }

    // Parameter order matches placeholder order in the query below:
    // 1. lat, lng, lat  → Haversine ACOS args (SELECT clause)
    // 2. latMin, latMax → bounding box lat BETWEEN
    // 3. lngMin, lngMax → bounding box lng BETWEEN
    // 4. excludeParams  → NOT IN list
    // 5. radiusKm       → HAVING distance_km <=
    const queryParams = [lat, lng, lat, latMin, latMax, lngMin, lngMax, ...excludeParams, radiusKm];

    const [rows] = await sqldb.query(
        `SELECT
            d.driver_id,
            d.firstname,
            d.lastname,
            d.phone,
            d.driver_rating,
            dcl.lat,
            dcl.long,
            (
                6371 * ACOS(
                    GREATEST(-1, LEAST(1,
                        COS(RADIANS(?)) * COS(RADIANS(dcl.lat))
                        * COS(RADIANS(dcl.long) - RADIANS(?))
                        + SIN(RADIANS(?)) * SIN(RADIANS(dcl.lat))
                    ))
                )
            ) AS distance_km
         FROM drivers d
         INNER JOIN driver_current_locations dcl ON dcl.driver_id = d.driver_id
         WHERE d.account_active = 1
           AND d.is_activated = 1
           AND d.account_deleted = 0
           AND d.available = 1
           AND d.operation_status = 0
           AND d.available_for_rental = 0
           AND dcl.lat BETWEEN ? AND ?
           AND dcl.long BETWEEN ? AND ?
           AND dcl.updated_at >= DATE_SUB(NOW(), INTERVAL 2 HOUR)
           AND NOT EXISTS (
               SELECT 1 FROM bookings ab
               WHERE ab.driver_id = d.driver_id
                 AND ab.status IN (0, 1, 6)
               LIMIT 1
           )
           ${excludeSql}
         HAVING distance_km <= ?
         ORDER BY distance_km ASC
         LIMIT 10`,
        queryParams
    );

    return rows.map((row) => ({
        driver_id: Number(row.driver_id),
        firstname: row.firstname,
        lastname: row.lastname,
        phone: row.phone,
        driver_rating: Number(row.driver_rating || 0),
        current_lat: Number(row.lat),
        current_lng: Number(row.long),
        distance_km: Number(Number(row.distance_km).toFixed(2)),
    }));
}

/**
 * Atomically assign a driver to a booking.
 * Uses WHERE driver_id IS NULL to prevent double-assignment race conditions.
 * Returns true if the update succeeded (this driver won the race), false otherwise.
 */
export async function atomicAssignDriverToBooking(bookingId, driverId, driverFirstname, driverLastname, driverPhone, conn) {
    const db = dbConnection(conn);
    const [result] = await db.query(
        `UPDATE bookings
         SET driver_id        = ?,
             driver_firstname = ?,
             driver_lastname  = ?,
             driver_phone     = ?,
             dispatch_mode    = 1
         WHERE id = ?
           AND driver_id IS NULL
           AND status = 0
         LIMIT 1`,
        [driverId, driverFirstname, driverLastname, driverPhone, bookingId]
    );
    return result.affectedRows === 1;
}

/** Increment dispatch_attempts counter for a booking. */
export async function incrementBookingDispatchAttempts(bookingId, conn) {
    const db = dbConnection(conn);
    await db.query(
        `UPDATE bookings SET dispatch_attempts = dispatch_attempts + 1 WHERE id = ? LIMIT 1`,
        [bookingId]
    );
}

/**
 * Cancel a booking with a no-driver-found reason (dispatch gave up).
 * Only updates if booking is still pending (status=0) and has no driver assigned.
 */
export async function markBookingNoDriverFound(bookingId, reason, conn) {
    const db = dbConnection(conn);
    const [result] = await db.query(
        `UPDATE bookings
         SET status = 2, no_driver_reason = ?, cancel_comment = ?
         WHERE id = ? AND status = 0 AND driver_id IS NULL
         LIMIT 1`,
        [reason, reason, bookingId]
    );
    return result.affectedRows === 1;
}

/** Create a dispatch allocation record for a driver. */
export async function createDispatchAllocation({ bookingId, driverId, expiresAt }, conn) {
    const db = dbConnection(conn);
    const [result] = await db.query(
        `INSERT INTO driver_allocate (booking_id, driver_id, status, expires_at)
         VALUES (?, ?, 0, ?)`,
        [bookingId, driverId, expiresAt]
    );
    return Number(result.insertId);
}

/** Mark a specific allocation as timed-out. */
export async function timeoutDispatchAllocation(allocationId, conn) {
    const db = dbConnection(conn);
    const [result] = await db.query(
        `UPDATE driver_allocate SET status = 3 WHERE id = ? AND status = 0 LIMIT 1`,
        [allocationId]
    );
    return result.affectedRows === 1;
}

/** Mark a specific allocation as rejected (driver explicitly rejected). */
export async function rejectDispatchAllocation(allocationId, conn) {
    const db = dbConnection(conn);
    const [result] = await db.query(
        `UPDATE driver_allocate SET status = 2 WHERE id = ? AND status = 0 LIMIT 1`,
        [allocationId]
    );
    return result.affectedRows === 1;
}

/** Get current dispatch state of a booking (for the dispatch engine to check if already assigned). */
export async function getBookingDispatchState(bookingId, conn) {
    const db = dbConnection(conn);
    const [rows] = await db.query(
        `SELECT id, status, driver_id,
                user_id, pickup_address, dropoff_address, estimated_cost,
                pickup_lat, pickup_long
         FROM bookings WHERE id = ? LIMIT 1`,
        [bookingId]
    );
    if (!rows[0]) return null;
    return {
        id:             Number(rows[0].id),
        status:         Number(rows[0].status),
        driver_id:      rows[0].driver_id === null ? null : Number(rows[0].driver_id),
        user_id:        rows[0].user_id    != null  ? Number(rows[0].user_id) : null,
        pickup_address:  rows[0].pickup_address  ?? null,
        dropoff_address: rows[0].dropoff_address ?? null,
        estimated_cost:  rows[0].estimated_cost  != null ? Number(rows[0].estimated_cost) : null,
        pickup_lat:      rows[0].pickup_lat  != null ? Number(rows[0].pickup_lat)  : null,
        pickup_long:     rows[0].pickup_long != null ? Number(rows[0].pickup_long) : null,
    };
}

/** Get the IDs of all drivers already tried for a booking (all allocations regardless of outcome). */
export async function getTriedDriverIdsForBooking(bookingId) {
    const [rows] = await sqldb.query(
        `SELECT DISTINCT driver_id FROM driver_allocate WHERE booking_id = ?`,
        [bookingId]
    );
    return rows.map((r) => Number(r.driver_id));
}

export async function findSystemSettingByKey(key, conn = null) {
    const db = conn || sqldb;
    const [rows] = await db.query(
        `SELECT setting_value FROM system_settings WHERE setting_key = ? LIMIT 1`,
        [key]
    );
    return rows[0]?.setting_value ?? null;
}

export async function findTariffWaitData({ routeId, rideId, serviceType = 0 }, conn = null) {
    const db = conn || sqldb;
    const [rows] = await db.query(
        `SELECT wait_time, nwait_time, wait_cost_per_minute, nwait_cost_per_minute
         FROM rides_tariffs
         WHERE routes_id = ? AND ride_id = ? AND service_type = ?
         LIMIT 1`,
        [routeId, rideId, serviceType]
    );
    const row = rows[0];
    if (!row) return null;
    return {
        wait_time: Number(row.wait_time || 0),
        nwait_time: Number(row.nwait_time || 0),
        wait_cost_per_minute: Number(row.wait_cost_per_minute || 0),
        nwait_cost_per_minute: Number(row.nwait_cost_per_minute || 0),
    };
}
