import sqldb from "../../config/sqldatabase.js";

function db(conn) {
    return conn || sqldb;
}

// ─── Status read ──────────────────────────────────────────────────────────────

/**
 * Lean SELECT for the working-status group.
 * Only fetches the fields needed for online/offline management — skips bank and
 * personal info that belong to the profile module.
 */
export async function findDriverWorkingStatus(driverId) {
    const [rows] = await sqldb.query(
        `SELECT
            d.driver_id,
            d.available,
            d.operation_status,
            d.available_for_rental,
            d.ride_id,
            rd.ride_type,
            d.route_id,
            r.r_title  AS route_name,
            d.reg_route_id,
            rr.r_title AS reg_route_name,
            d.is_activated,
            d.account_active,
            d.account_deleted
         FROM drivers d
         LEFT JOIN rides  rd ON rd.id = d.ride_id
         LEFT JOIN routes r  ON r.id  = d.route_id
         LEFT JOIN routes rr ON rr.id = d.reg_route_id
         WHERE d.driver_id = ?
         LIMIT 1`,
        [driverId]
    );
    const row = rows[0];
    if (!row) return null;
    return {
        driver_id:           Number(row.driver_id),
        available:           Number(row.available           || 0),
        operation_status:    Number(row.operation_status    || 0),
        available_for_rental:Number(row.available_for_rental|| 0),
        ride_id:             row.ride_id     === null ? null : Number(row.ride_id),
        ride_type:           row.ride_type   || null,
        route_id:            row.route_id    === null ? null : Number(row.route_id),
        route_name:          row.route_name  || null,
        reg_route_id:        row.reg_route_id === null ? null : Number(row.reg_route_id),
        reg_route_name:      row.reg_route_name || null,
        is_activated:        Number(row.is_activated  || 0),
        account_active:      Number(row.account_active|| 0),
        account_deleted:     Number(row.account_deleted|| 0),
    };
}

// ─── Online toggle ────────────────────────────────────────────────────────────

/**
 * Set drivers.available = 0|1.
 */
export async function setDriverAvailable(driverId, available, conn) {
    const [result] = await db(conn).query(
        `UPDATE drivers SET available = ? WHERE driver_id = ? LIMIT 1`,
        [available, driverId]
    );
    return result.affectedRows === 1;
}

// ─── Service-type flags ───────────────────────────────────────────────────────

/**
 * Update service-type toggles (available_for_rental).
 * Uses an explicit allowlist so only safe columns are written.
 */
export async function setDriverServiceFlags(driverId, fields, conn) {
    const ALLOWED = new Set(["available_for_rental"]);
    const sets = [];
    const params = [];
    for (const [key, value] of Object.entries(fields)) {
        if (ALLOWED.has(key)) {
            sets.push(`${key} = ?`);
            params.push(value);
        }
    }
    if (sets.length === 0) return false;
    params.push(driverId);
    const [result] = await db(conn).query(
        `UPDATE drivers SET ${sets.join(", ")} WHERE driver_id = ? LIMIT 1`,
        params
    );
    return result.affectedRows === 1;
}

// ─── Areas ────────────────────────────────────────────────────────────────────

/**
 * Return all routes with boundary/map data.
 */
export async function findAllRoutes() {
    const [rows] = await sqldb.query(
        `SELECT
            id, r_title, r_scope,
            lng, lat,
            city_bound_coords, city_radius, dist_unit
         FROM routes
         ORDER BY r_title ASC, id ASC`
    );
    return rows.map((row) => ({
        id:               Number(row.id),
        r_title:          row.r_title,
        r_scope:          Number(row.r_scope || 0),
        center: {
            lng: row.lng !== null ? Number(row.lng) : null,
            lat: row.lat !== null ? Number(row.lat) : null,
        },
        city_bound_coords: row.city_bound_coords || null,
        city_radius:       Number(row.city_radius || 0),
        dist_unit:         Number(row.dist_unit   || 0),
    }));
}

// ─── Heartbeat ────────────────────────────────────────────────────────────────

/**
 * Touch updated_at on an existing location row.
 * Returns false (no-op) if the driver has no location row yet — safe to ignore.
 */
export async function touchHeartbeat(driverId, conn) {
    const [result] = await db(conn).query(
        `UPDATE driver_current_locations SET updated_at = NOW() WHERE driver_id = ? LIMIT 1`,
        [driverId]
    );
    return result.affectedRows === 1;
}
