import sqldb from "../config/sqldatabase.js";

function dbConnection(conn) {
    return conn || sqldb;
}

function toNumber(value, fallback = 0) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
}

function mapCoupon(row) {
    if (!row) return null;

    return {
        id: Number(row.id),
        coupon_code: row.coupon_code,
        coupon_title: row.coupon_title,
        city: Number(row.city),
        city_name: row.city_name || null,
        vehicles: row.vehicles || null,
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
    };
}

const COUPON_SELECT_BASE = `
    SELECT
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
        COALESCE(usage_total.total_used, 0) AS total_used
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
    ) AS usage_total ON usage_total.coupon_id = c.id
`;

async function replaceCouponVehicleTypes(couponId, vehicleTypeIds, conn) {
    const db = dbConnection(conn);
    await db.query(`DELETE FROM coupon_vehicle_types WHERE coupon_id = ?`, [couponId]);

    if (!Array.isArray(vehicleTypeIds) || vehicleTypeIds.length === 0) {
        return;
    }

    const values = vehicleTypeIds.map((typeId) => [couponId, Number(typeId)]);
    await db.query(
        `INSERT INTO coupon_vehicle_types (coupon_id, vehicle_type_id)
         VALUES ?`,
        [values]
    );
}

export async function findCouponAdminMeta() {
    const [routes] = await sqldb.query(
        `SELECT id, r_title, c_name
         FROM routes
         ORDER BY r_title ASC`
    );

    const [vehicleTypes] = await sqldb.query(
        `SELECT type_id, type_name, description, active
         FROM vehicle_types
         WHERE active = 1
         ORDER BY type_id ASC`
    );

    return {
        cities: routes.map((row) => ({
            id: Number(row.id),
            r_title: row.r_title,
            c_name: row.c_name,
        })),
        rides: vehicleTypes.map((row) => ({
            id: Number(row.type_id),
            ride_type: row.type_name,
            ride_desc: row.description,
            avail: Number(row.active || 0),
        })),
    };
}

export async function findAdminCoupons(filters) {
    const whereClauses = [];
    const params = [];

    if (filters.search) {
        whereClauses.push("(c.coupon_code LIKE ? OR c.coupon_title LIKE ?)");
        params.push(`%${filters.search}%`, `%${filters.search}%`);
    }

    if (filters.status !== null) {
        whereClauses.push("c.status = ?");
        params.push(filters.status);
    }

    if (filters.city !== null) {
        whereClauses.push("c.city = ?");
        params.push(filters.city);
    }

    if (filters.visibility !== null) {
        whereClauses.push("c.visibility = ?");
        params.push(filters.visibility);
    }

    if (filters.activeFrom) {
        whereClauses.push("c.expiry_date >= ?");
        params.push(filters.activeFrom);
    }

    if (filters.activeTo) {
        whereClauses.push("c.active_date <= ?");
        params.push(filters.activeTo);
    }

    const whereSql = whereClauses.length ? `WHERE ${whereClauses.join(" AND ")}` : "";
    const offset = (filters.page - 1) * filters.limit;

    const [rows] = await sqldb.query(
        `${COUPON_SELECT_BASE}
         ${whereSql}
         ORDER BY c.id DESC
         LIMIT ? OFFSET ?`,
        [...params, filters.limit, offset]
    );

    return rows.map(mapCoupon);
}

export async function countAdminCoupons(filters) {
    const whereClauses = [];
    const params = [];

    if (filters.search) {
        whereClauses.push("(coupon_code LIKE ? OR coupon_title LIKE ?)");
        params.push(`%${filters.search}%`, `%${filters.search}%`);
    }

    if (filters.status !== null) {
        whereClauses.push("status = ?");
        params.push(filters.status);
    }

    if (filters.city !== null) {
        whereClauses.push("city = ?");
        params.push(filters.city);
    }

    if (filters.visibility !== null) {
        whereClauses.push("visibility = ?");
        params.push(filters.visibility);
    }

    if (filters.activeFrom) {
        whereClauses.push("expiry_date >= ?");
        params.push(filters.activeFrom);
    }

    if (filters.activeTo) {
        whereClauses.push("active_date <= ?");
        params.push(filters.activeTo);
    }

    const whereSql = whereClauses.length ? `WHERE ${whereClauses.join(" AND ")}` : "";

    const [rows] = await sqldb.query(
        `SELECT COUNT(*) AS total_items
         FROM coupon_codes
         ${whereSql}`,
        params
    );

    return Number(rows[0]?.total_items || 0);
}

export async function findCouponById(couponId) {
    const [rows] = await sqldb.query(
        `${COUPON_SELECT_BASE}
         WHERE c.id = ?
         LIMIT 1`,
        [couponId]
    );

    return mapCoupon(rows[0]);
}

export async function findCouponByCodeAndCity(couponCode, cityId, userId = null) {
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
         ) AS usage_total ON usage_total.coupon_id = c.id
         LEFT JOIN (
            SELECT coupon_id, SUM(times_used) AS user_used
            FROM coupons_used
            WHERE user_id = ?
            GROUP BY coupon_id
         ) AS usage_user ON usage_user.coupon_id = c.id
         WHERE c.coupon_code = ? AND c.city = ?
         LIMIT 1`,
        [userId || 0, couponCode, cityId]
    );

    return mapCoupon(rows[0]);
}

export async function findCouponByCodeAndCityForUpdate(couponCode, cityId, conn) {
    const db = dbConnection(conn);
    const [rows] = await db.query(
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
            COALESCE(cvt.vehicle_ids, NULL) AS vehicles
         FROM coupon_codes c
         LEFT JOIN (
            SELECT coupon_id, GROUP_CONCAT(vehicle_type_id ORDER BY vehicle_type_id ASC SEPARATOR ',') AS vehicle_ids
            FROM coupon_vehicle_types
            GROUP BY coupon_id
         ) cvt ON cvt.coupon_id = c.id
         WHERE c.coupon_code = ? AND c.city = ?
         LIMIT 1
         FOR UPDATE`,
        [couponCode, cityId]
    );

    return mapCoupon(rows[0]);
}

export async function couponCodeExistsInCity(couponCode, cityId, excludeId = null) {
    const query = excludeId
        ? `SELECT id FROM coupon_codes WHERE coupon_code = ? AND city = ? AND id <> ? LIMIT 1`
        : `SELECT id FROM coupon_codes WHERE coupon_code = ? AND city = ? LIMIT 1`;

    const params = excludeId ? [couponCode, cityId, excludeId] : [couponCode, cityId];
    const [rows] = await sqldb.query(query, params);

    return rows.length > 0;
}

export async function routeExists(routeId) {
    const [rows] = await sqldb.query(
        `SELECT id FROM routes WHERE id = ? LIMIT 1`,
        [routeId]
    );
    return rows.length > 0;
}

export async function findActiveRideIds() {
    const [rows] = await sqldb.query(
        `SELECT type_id
         FROM vehicle_types
         WHERE active = 1`
    );

    return new Set(rows.map((row) => Number(row.type_id)));
}

export async function insertCoupon(payload, conn) {
    const db = dbConnection(conn);
    const [result] = await db.query(
        `INSERT INTO coupon_codes (
            coupon_code,
            coupon_title,
            city,
            service_type,
            visibility,
            discount_type,
            discount_value,
            min_fare,
            max_discount_amount,
            limit_count,
            user_limit_count,
            status,
            active_date,
            expiry_date,
            date_created
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
        [
            payload.coupon_code,
            payload.coupon_title,
            payload.city,
            0,
            payload.visibility,
            payload.discount_type,
            payload.discount_value,
            payload.min_fare,
            payload.max_discount_amount,
            payload.limit_count,
            payload.user_limit_count,
            payload.status,
            payload.active_date,
            payload.expiry_date,
        ]
    );

    const couponId = Number(result.insertId);
    await replaceCouponVehicleTypes(couponId, payload.vehicle_ids || [], db);

    return couponId;
}

export async function updateCoupon(couponId, payload, conn) {
    const db = dbConnection(conn);
    const [result] = await db.query(
        `UPDATE coupon_codes
         SET
            coupon_code = ?,
            coupon_title = ?,
            city = ?,
            service_type = ?,
            visibility = ?,
            discount_type = ?,
            discount_value = ?,
            min_fare = ?,
            max_discount_amount = ?,
            limit_count = ?,
            user_limit_count = ?,
            status = ?,
            active_date = ?,
            expiry_date = ?
         WHERE id = ?
         LIMIT 1`,
        [
            payload.coupon_code,
            payload.coupon_title,
            payload.city,
            0,
            payload.visibility,
            payload.discount_type,
            payload.discount_value,
            payload.min_fare,
            payload.max_discount_amount,
            payload.limit_count,
            payload.user_limit_count,
            payload.status,
            payload.active_date,
            payload.expiry_date,
            couponId,
        ]
    );

    if (result.affectedRows > 0) {
        await replaceCouponVehicleTypes(couponId, payload.vehicle_ids || [], db);
    }

    return result.affectedRows > 0;
}

export async function updateCouponStatus(couponId, status, conn) {
    const db = dbConnection(conn);
    const [result] = await db.query(
        `UPDATE coupon_codes
         SET status = ?
         WHERE id = ?
         LIMIT 1`,
        [status, couponId]
    );

    return result.affectedRows > 0;
}

export async function findAvailableCouponsForUser({ cityId, userId }) {
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
         ) AS usage_total ON usage_total.coupon_id = c.id
         LEFT JOIN (
            SELECT coupon_id, SUM(times_used) AS user_used
            FROM coupons_used
            WHERE user_id = ?
            GROUP BY coupon_id
         ) AS usage_user ON usage_user.coupon_id = c.id
         WHERE
            c.status = 1
            AND c.visibility = 1
            AND c.city = ?
            AND c.service_type = 0
            AND NOW() >= c.active_date
            AND NOW() <= c.expiry_date
         ORDER BY c.expiry_date ASC, c.id DESC`,
        [userId, cityId]
    );

    return rows.map(mapCoupon);
}

export async function getCouponTotalUsage(couponId, conn) {
    const db = dbConnection(conn);
    const [rows] = await db.query(
        `SELECT COALESCE(SUM(times_used), 0) AS total_used
         FROM coupons_used
         WHERE coupon_id = ?`,
        [couponId]
    );

    return Number(rows[0]?.total_used || 0);
}

export async function getUserCouponUsage(couponId, userId, conn) {
    const db = dbConnection(conn);
    const [rows] = await db.query(
        `SELECT COALESCE(SUM(times_used), 0) AS user_used
         FROM coupons_used
         WHERE coupon_id = ? AND user_id = ?`,
        [couponId, userId]
    );

    return Number(rows[0]?.user_used || 0);
}

export async function upsertCouponUsage(couponId, userId, conn) {
    const db = dbConnection(conn);

    const [rows] = await db.query(
        `SELECT id, times_used
         FROM coupons_used
         WHERE coupon_id = ? AND user_id = ?
         ORDER BY id ASC
         FOR UPDATE`,
        [couponId, userId]
    );

    if (!rows.length) {
        const [insertResult] = await db.query(
            `INSERT INTO coupons_used (coupon_id, user_id, times_used)
             VALUES (?, ?, 1)`,
            [couponId, userId]
        );

        return {
            id: Number(insertResult.insertId),
            times_used: 1,
        };
    }

    const targetId = Number(rows[0].id);

    await db.query(
        `UPDATE coupons_used
         SET times_used = times_used + 1
         WHERE id = ?
         LIMIT 1`,
        [targetId]
    );

    const [updatedRows] = await db.query(
        `SELECT times_used
         FROM coupons_used
         WHERE id = ?
         LIMIT 1`,
        [targetId]
    );

    return {
        id: targetId,
        times_used: Number(updatedRows[0]?.times_used || 0),
    };
}
