import sqldb from "../../config/sqldatabase.js";

let notificationSchemaCache = null;

function toNumber(value, fallback = 0) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
}

function mapBannerRow(row) {
    return {
        id: Number(row.id),
        title: row.title,
        excerpt: row.excerpt,
        content: row.content,
        city: Number(row.city || 0),
        feature_img: row.feature_img,
        visibility: Number(row.visibility || 0),
        status: Number(row.status || 0),
        date_created: row.date_created,
    };
}

function mapRouteRow(row) {
    return {
        id: Number(row.id),
        r_title: row.r_title,
        c_name: row.c_name,
        r_scope: Number(row.r_scope || 0),
    };
}

async function resolveNotificationSchema() {
    if (notificationSchemaCache) return notificationSchemaCache;

    const [rows] = await sqldb.query(
        `SELECT column_name
         FROM information_schema.columns
         WHERE table_schema = DATABASE()
           AND table_name = 'user_notifications'
           AND column_name IN ('read_status', 'created_at')`
    );

    const columns = new Set(rows.map((row) => String(row.column_name).toLowerCase()));
    notificationSchemaCache = {
        hasReadStatus: columns.has("read_status"),
        hasCreatedAt: columns.has("created_at"),
    };

    return notificationSchemaCache;
}

function buildNotificationExpressions(schema) {
    const createdAtExpr = schema.hasCreatedAt ? "un.created_at" : "un.date_created";
    const readStatusExpr = schema.hasReadStatus
        ? "COALESCE(un.read_status, 0)"
        : "CASE WHEN COALESCE(un.n_type, 0) = 0 THEN 0 ELSE 1 END";

    return {
        createdAtExpr,
        readStatusExpr,
    };
}

export async function findCustomerContext(userId) {
    const [rows] = await sqldb.query(
        `SELECT user_id, route_id, address, account_type, account_active, account_deleted, is_activated
         FROM users
         WHERE user_id = ? AND account_type = 1
         LIMIT 1`,
        [userId]
    );

    const row = rows[0];
    if (!row) return null;

    return {
        userId: Number(row.user_id),
        routeId: row.route_id === null ? null : Number(row.route_id),
        address: row.address || "",
        accountType: Number(row.account_type || 0),
        accountActive: Number(row.account_active || 0),
        accountDeleted: Number(row.account_deleted || 0),
        isActivated: Number(row.is_activated || 0),
    };
}

export async function listActiveBanners(routeId = null) {
    const params = [];
    let cityFilterSql = "";

    if (routeId) {
        cityFilterSql = " AND (b.city = 0 OR b.city = ?)";
        params.push(routeId);
    }

    const [rows] = await sqldb.query(
        `SELECT b.id, b.title, b.excerpt, b.content, b.city, b.feature_img, b.visibility, b.status, b.date_created
         FROM banners b
         WHERE b.status = 1
           AND b.visibility IN (0, 1)
           ${cityFilterSql}
         ORDER BY b.id DESC`,
        params
    );

    return rows.map(mapBannerRow);
}

export async function listRoutes() {
    const [rows] = await sqldb.query(
        `SELECT id, r_title, c_name, r_scope
         FROM routes
         ORDER BY r_title ASC, id ASC`
    );

    return rows.map(mapRouteRow);
}

export async function listRidesWithTariffs(routeId = null) {
    const params = [];
    const routeFilterSql = routeId ? "AND rt.routes_id = ?" : "";
    if (routeId) params.push(routeId);

    const [rows] = await sqldb.query(
        `SELECT
            r.id AS ride_id,
            r.ride_type,
            r.ride_desc,
            r.ride_img,
            r.num_seats,
            r.avail,
            rt.id AS tariff_id,
            rt.routes_id,
            rt.cost_per_km,
            rt.cost_per_minute,
            rt.pickup_cost,
            rt.drop_off_cost,
            rt.wait_cost_per_minute,
            rt.cancel_cost,
            rt.init_distance,
            rt.ncost_per_km,
            rt.ncost_per_minute,
            rt.npickup_cost,
            rt.ndrop_off_cost,
            rt.nwait_cost_per_minute,
            rt.ncancel_cost,
            rt.hour_rate,
            rt.day_rate,
            rt.deposit,
            rt.distance_limit_km,
            rt.extra_km_fee,
            route.r_title AS route_name
         FROM rides r
         LEFT JOIN rides_tariffs rt
            ON rt.ride_id = r.id
           AND rt.service_type = 0
           ${routeFilterSql}
         LEFT JOIN routes route ON route.id = rt.routes_id
         WHERE r.avail = 1
         ORDER BY r.id ASC, rt.routes_id ASC`,
        params
    );

    const grouped = new Map();

    for (const row of rows) {
        const rideId = Number(row.ride_id);
        if (!grouped.has(rideId)) {
            grouped.set(rideId, {
                id: rideId,
                ride_type: row.ride_type,
                ride_desc: row.ride_desc,
                ride_img: row.ride_img,
                num_seats: Number(row.num_seats || 0),
                avail: Number(row.avail || 0),
                base_fare: null,
                price_per_km: null,
                price_per_min: null,
                minimum_fare: null,
                tariffs: [],
            });
        }

        if (row.tariff_id) {
            const ride = grouped.get(rideId);
            const tariff = {
                tariff_id: Number(row.tariff_id),
                route_id: Number(row.routes_id),
                route_name: row.route_name,
                base_fare: toNumber(row.pickup_cost, 0),
                price_per_km: toNumber(row.cost_per_km, 0),
                price_per_min: toNumber(row.cost_per_minute, 0),
                minimum_fare: toNumber(row.pickup_cost, 0),
                drop_off_fare: toNumber(row.drop_off_cost, 0),
                wait_price_per_min: toNumber(row.wait_cost_per_minute, 0),
                cancel_fare: toNumber(row.cancel_cost, 0),
                init_distance: toNumber(row.init_distance, 0),
                night: {
                    price_per_km: toNumber(row.ncost_per_km, 0),
                    price_per_min: toNumber(row.ncost_per_minute, 0),
                    base_fare: toNumber(row.npickup_cost, 0),
                    drop_off_fare: toNumber(row.ndrop_off_cost, 0),
                    wait_price_per_min: toNumber(row.nwait_cost_per_minute, 0),
                    cancel_fare: toNumber(row.ncancel_cost, 0),
                },
                rental: {
                    hour_rate: toNumber(row.hour_rate, 0),
                    day_rate: toNumber(row.day_rate, 0),
                    deposit: toNumber(row.deposit, 0),
                    distance_limit_km: Number(row.distance_limit_km || 0),
                    extra_km_fee: toNumber(row.extra_km_fee, 0),
                },
            };

            ride.tariffs.push(tariff);

            if (ride.base_fare === null) {
                ride.base_fare = tariff.base_fare;
                ride.price_per_km = tariff.price_per_km;
                ride.price_per_min = tariff.price_per_min;
                ride.minimum_fare = tariff.minimum_fare;
            }
        }
    }

    const result = [...grouped.values()];
    return routeId ? result.filter((ride) => ride.tariffs.length > 0) : result;
}

export async function listQuickDestinationCandidatesByUser(userId, limit = 8) {
    const [rows] = await sqldb.query(
        `SELECT src.address,
                COUNT(*) AS frequency,
                MAX(src.used_at) AS last_used_at
         FROM (
            SELECT b.dropoff_address AS address,
                   COALESCE(b.dropoff_datetime, b.date_completed, b.date_created) AS used_at
            FROM bookings b
            WHERE b.user_id = ?
              AND b.dropoff_address IS NOT NULL
              AND b.dropoff_address <> ''
              AND b.status IN (2, 3, 4, 5)
            UNION ALL
            SELECT rb.dropoff_address AS address,
                   COALESCE(rb.actual_end_datetime, rb.end_datetime, rb.updated_at, rb.created_at, rb.start_datetime) AS used_at
            FROM rental_bookings rb
            WHERE rb.user_id = ?
              AND rb.dropoff_address IS NOT NULL
              AND rb.dropoff_address <> ''
              AND rb.status IN ('completed', 'cancelled')
         ) src
         GROUP BY src.address
         ORDER BY frequency DESC, last_used_at DESC
         LIMIT ?`,
        [userId, userId, limit]
    );

    return rows.map((row) => ({
        address: row.address,
        frequency: Number(row.frequency || 0),
        last_used_at: row.last_used_at,
    }));
}

export async function listRecentRoutesByUser(userId, limit = 4) {
    const [rows] = await sqldb.query(
        `SELECT *
         FROM (
            SELECT
                CONCAT('booking_', b.id) AS source_id,
                b.pickup_address,
                b.dropoff_address,
                COALESCE(b.dropoff_datetime, b.date_completed, b.date_created) AS used_at,
                'booking' AS source_type,
                0 AS service_type
            FROM bookings b
            WHERE b.user_id = ?
              AND b.pickup_address IS NOT NULL
              AND b.pickup_address <> ''
              AND b.dropoff_address IS NOT NULL
              AND b.dropoff_address <> ''
              AND b.status IN (2, 3, 4, 5)
            UNION ALL
            SELECT
                CONCAT('rental_', rb.rental_id) AS source_id,
                rb.pickup_address,
                rb.dropoff_address,
                COALESCE(rb.actual_end_datetime, rb.end_datetime, rb.updated_at, rb.created_at, rb.start_datetime) AS used_at,
                'rental' AS source_type,
                COALESCE(rb.service_type, 0) AS service_type
            FROM rental_bookings rb
            WHERE rb.user_id = ?
              AND rb.pickup_address IS NOT NULL
              AND rb.pickup_address <> ''
              AND rb.dropoff_address IS NOT NULL
              AND rb.dropoff_address <> ''
              AND rb.status IN ('completed', 'cancelled')
         ) merged
         ORDER BY used_at DESC
         LIMIT ?`,
        [userId, userId, limit]
    );

    return rows.map((row) => ({
        id: row.source_id,
        pickup_address: row.pickup_address,
        destination_address: row.dropoff_address,
        used_at: row.used_at,
        source_type: row.source_type,
        service_type: Number(row.service_type || 0),
    }));
}

function buildCouponWhere({ routeId, search, rideId }) {
    const where = [
        "c.status = 1",
        "c.visibility = 1",
        "c.service_type = 0",
        "NOW() >= c.active_date",
        "NOW() <= c.expiry_date",
        "c.city = ?",
        "(c.limit_count = 0 OR COALESCE(usage_total.total_used, 0) < c.limit_count)",
        "(c.user_limit_count = 0 OR COALESCE(usage_user.user_used, 0) < c.user_limit_count)",
    ];

    const params = [routeId];

    if (search) {
        where.push("(c.coupon_code LIKE ? OR c.coupon_title LIKE ?)");
        params.push(`%${search}%`, `%${search}%`);
    }

    if (rideId) {
        where.push(
            `(NOT EXISTS (SELECT 1 FROM coupon_vehicle_types cvx WHERE cvx.coupon_id = c.id)
              OR EXISTS (SELECT 1 FROM coupon_vehicle_types cvf WHERE cvf.coupon_id = c.id AND cvf.vehicle_type_id = ?))`
        );
        params.push(rideId);
    }

    return {
        whereSql: `WHERE ${where.join(" AND ")}`,
        params,
    };
}

export async function findAvailableCouponsForCustomer({
    userId,
    routeId,
    page,
    limit,
    search,
    rideId,
}) {
    if (!routeId) {
        return { items: [] };
    }

    const offset = (page - 1) * limit;

    const { whereSql, params } = buildCouponWhere({
        routeId,
        search,
        rideId,
    });

    const [rows] = await sqldb.query(
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
            c.date_created,
            r.r_title AS city_name,
            COALESCE(cvt.vehicle_ids, NULL) AS vehicles,
            COALESCE(usage_total.total_used, 0) AS total_used,
            COALESCE(usage_user.user_used, 0) AS user_used
         FROM coupon_codes c
         LEFT JOIN routes r ON r.id = c.city
         LEFT JOIN (
            SELECT coupon_id, GROUP_CONCAT(vehicle_type_id ORDER BY vehicle_type_id ASC SEPARATOR ',') AS vehicle_ids
            FROM coupon_vehicle_types
            GROUP BY coupon_id
         ) cvt ON cvt.coupon_id = c.id
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
         ${whereSql}
         ORDER BY c.expiry_date ASC, c.id DESC
         LIMIT ? OFFSET ?`,
        [userId, ...params, limit, offset]
    );

    return {
        items: rows.map((row) => ({
            id: Number(row.id),
            coupon_code: row.coupon_code,
            coupon_title: row.coupon_title,
            city: Number(row.city || 0),
            city_name: row.city_name,
            vehicles: row.vehicles,
            visibility: Number(row.visibility || 0),
            discount_type: Number(row.discount_type || 0),
            discount_value: toNumber(row.discount_value, 0),
            min_fare: toNumber(row.min_fare, 0),
            max_discount_amount: toNumber(row.max_discount_amount, 0),
            limit_count: Number(row.limit_count || 0),
            user_limit_count: Number(row.user_limit_count || 0),
            status: Number(row.status || 0),
            active_date: row.active_date,
            expiry_date: row.expiry_date,
            date_created: row.date_created,
            total_used: Number(row.total_used || 0),
            user_used: Number(row.user_used || 0),
        })),
    };
}

export async function countAvailableCouponsForCustomer({ userId, routeId, search, rideId }) {
    if (!routeId) {
        return 0;
    }

    const { whereSql, params } = buildCouponWhere({ routeId, search, rideId });

    const [rows] = await sqldb.query(
        `SELECT COUNT(*) AS total_items
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
         ${whereSql}`,
        [userId, ...params]
    );

    return Number(rows[0]?.total_items || 0);
}

export async function findNotificationsByUser(userId, { page, limit }) {
    const schema = await resolveNotificationSchema();
    const { createdAtExpr, readStatusExpr } = buildNotificationExpressions(schema);
    const offset = (page - 1) * limit;

    const [rows] = await sqldb.query(
        `SELECT
            un.id,
            un.content,
            un.route_id,
            un.rental_id,
            un.n_type,
            ${createdAtExpr} AS created_at,
            ${readStatusExpr} AS read_status
         FROM user_notifications un
         WHERE un.user_id = ?
         ORDER BY ${createdAtExpr} DESC, un.id DESC
         LIMIT ? OFFSET ?`,
        [userId, limit, offset]
    );

    return rows.map((row) => ({
        id: Number(row.id),
        content: row.content,
        route_id: row.route_id === null ? null : Number(row.route_id),
        rental_id: row.rental_id === null ? null : Number(row.rental_id),
        n_type: Number(row.n_type || 0),
        read_status: Number(row.read_status || 0),
        created_at: row.created_at,
    }));
}

export async function countUnreadNotifications(userId, { mode = "unread" } = {}) {
    const schema = await resolveNotificationSchema();
    const { readStatusExpr } = buildNotificationExpressions(schema);

    const countFilter = mode === "all" ? "" : `AND ${readStatusExpr} = 0`;

    const [rows] = await sqldb.query(
        `SELECT COUNT(*) AS total_items
         FROM user_notifications un
         WHERE un.user_id = ? ${countFilter}`,
        [userId]
    );

    return Number(rows[0]?.total_items || 0);
}
