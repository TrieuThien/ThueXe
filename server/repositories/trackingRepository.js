import sqldb from "../config/sqldatabase.js";

function dbConnection(conn) {
    return conn || sqldb;
}

export async function upsertDriverCurrentLocation(payload, conn) {
    const db = dbConnection(conn);
    await db.query(
        `INSERT INTO driver_current_locations (driver_id, \`long\`, lat, b_angle, loc_static_status, loc_static_duration)
         VALUES (?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
            \`long\` = VALUES(\`long\`),
            lat = VALUES(lat),
            b_angle = VALUES(b_angle),
            loc_static_status = VALUES(loc_static_status),
            loc_static_duration = VALUES(loc_static_duration),
            updated_at = NOW()`,
        [
            payload.driver_id,
            payload.long,
            payload.lat,
            payload.b_angle,
            payload.loc_static_status,
            payload.loc_static_duration,
        ]
    );
}

export async function getDriverCurrentLocation(driverId) {
    const [rows] = await sqldb.query(
        `SELECT driver_id, \`long\`, lat, b_angle, loc_static_status, loc_static_duration, updated_at
         FROM driver_current_locations
         WHERE driver_id = ?
         LIMIT 1`,
        [driverId]
    );
    const row = rows[0];
    if (!row) return null;
    return {
        driver_id: Number(row.driver_id),
        long: Number(row.long),
        lat: Number(row.lat),
        b_angle: Number(row.b_angle || 0),
        loc_static_status: Number(row.loc_static_status || 0),
        loc_static_duration: row.loc_static_duration === null ? null : Number(row.loc_static_duration),
        updated_at: row.updated_at,
    };
}

export async function findBookingDriver(bookingId) {
    const [rows] = await sqldb.query(
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

export async function findDriverTravelRouteRecord({ bookingId, driverId }, conn) {
    const db = dbConnection(conn);
    const [rows] = await db.query(
        `SELECT id, booking_id, driver_id, route_data
         FROM driver_travel_route
         WHERE booking_id = ? AND driver_id = ?
         LIMIT 1`,
        [bookingId, driverId]
    );
    const row = rows[0];
    if (!row) return null;
    return {
        id: Number(row.id),
        booking_id: Number(row.booking_id),
        driver_id: Number(row.driver_id),
        route_data: row.route_data,
    };
}

export async function createDriverTravelRouteRecord({ bookingId, driverId, routeData }, conn) {
    const db = dbConnection(conn);
    const [result] = await db.query(
        `INSERT INTO driver_travel_route (booking_id, driver_id, route_data)
         VALUES (?, ?, ?)`,
        [bookingId, driverId, routeData]
    );
    return Number(result.insertId);
}

export async function updateDriverTravelRouteRecord(id, routeData, conn) {
    const db = dbConnection(conn);
    await db.query(
        `UPDATE driver_travel_route
         SET route_data = ?
         WHERE id = ?
         LIMIT 1`,
        [routeData, id]
    );
}

