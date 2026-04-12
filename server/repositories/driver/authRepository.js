import sqldb from "../../config/sqldatabase.js";
import { USER_TYPE } from "../../utils/authRole.js";
import {
    createSessionToken as sharedCreateSessionToken,
    deleteAllUserSessions,
    deleteSessionToken as sharedDeleteSessionToken,
    findSessionToken as sharedFindSessionToken,
    replaceAccountCode,
    consumeAccountCode,
    updateDriverLastLogin as sharedUpdateDriverLastLogin,
    updateDriverPassword as sharedUpdateDriverPassword,
} from "../authRepository.js";

function db(conn) {
    return conn || sqldb;
}

// ─── Driver lookup ────────────────────────────────────────────────────────────

export async function findDriverByIdentifier(identifier) {
    if (!identifier) return null;

    const [rows] = await sqldb.query(
        `SELECT driver_id, firstname, lastname, email, phone, password_hash,
                is_activated, account_active, account_deleted
         FROM drivers
         WHERE email = ? OR phone = ?
         LIMIT 1`,
        [identifier, identifier]
    );

    const row = rows[0];
    if (!row) return null;

    return {
        id: Number(row.driver_id),
        firstname: row.firstname,
        lastname: row.lastname,
        email: row.email,
        phone: row.phone,
        passwordHash: row.password_hash,
        isActivated: Number(row.is_activated || 0),
        accountActive: Number(row.account_active || 0),
        accountDeleted: Number(row.account_deleted || 0),
        userType: USER_TYPE.DRIVER,
        role: "driver",
        accountType: null,
    };
}

export async function findDriverById(driverId) {
    const [rows] = await sqldb.query(
        `SELECT
            d.driver_id, d.firstname, d.lastname, d.email, d.phone,
            d.photo_file, d.drv_address, d.drv_country,
            d.car_model, d.car_plate_num, d.car_color, d.car_year,
            d.ride_id, d.reg_route_id, d.route_id,
            d.driver_rating, d.completed_rides, d.cancelled_rides,
            d.reward_points, d.available, d.operation_status,
            d.available_for_rental, d.hourly_rate, d.daily_rate,
            d.push_notification_token, d.country_code, d.country_dial_code,
            d.is_activated, d.account_active, d.account_deleted,
            d.allow_photo_edit, d.allow_vehicle_edit, d.allow_city_edit,
            d.disp_lang, d.account_create_date,
            r.r_title AS route_name,
            rd.ride_type
         FROM drivers d
         LEFT JOIN routes r ON r.id = d.route_id
         LEFT JOIN rides rd ON rd.id = d.ride_id
         WHERE d.driver_id = ?
         LIMIT 1`,
        [driverId]
    );

    const row = rows[0];
    if (!row) return null;

    return {
        id: Number(row.driver_id),
        driver_id: Number(row.driver_id),
        firstname: row.firstname,
        lastname: row.lastname,
        email: row.email,
        phone: row.phone,
        photo_file: row.photo_file,
        drv_address: row.drv_address,
        drv_country: row.drv_country,
        car_model: row.car_model,
        car_plate_num: row.car_plate_num,
        car_color: row.car_color,
        car_year: row.car_year,
        ride_id: row.ride_id === null ? null : Number(row.ride_id),
        ride_type: row.ride_type,
        reg_route_id: row.reg_route_id === null ? null : Number(row.reg_route_id),
        route_id: row.route_id === null ? null : Number(row.route_id),
        route_name: row.route_name,
        driver_rating: Number(row.driver_rating || 0),
        completed_rides: Number(row.completed_rides || 0),
        cancelled_rides: Number(row.cancelled_rides || 0),
        reward_points: Number(row.reward_points || 0),
        available: Number(row.available || 0),
        operation_status: Number(row.operation_status || 0),
        available_for_rental: Number(row.available_for_rental || 0),
        hourly_rate: Number(row.hourly_rate || 0),
        daily_rate: Number(row.daily_rate || 0),
        push_notification_token: row.push_notification_token,
        country_code: row.country_code,
        country_dial_code: row.country_dial_code,
        is_activated: Number(row.is_activated || 0),
        account_active: Number(row.account_active || 0),
        account_deleted: Number(row.account_deleted || 0),
        allow_photo_edit: Number(row.allow_photo_edit || 0),
        allow_vehicle_edit: Number(row.allow_vehicle_edit || 0),
        allow_city_edit: Number(row.allow_city_edit || 0),
        disp_lang: row.disp_lang,
        account_create_date: row.account_create_date,
        userType: USER_TYPE.DRIVER,
        role: "driver",
        accountType: null,
    };
}

export async function findDriverPasswordHash(driverId) {
    const [rows] = await sqldb.query(
        `SELECT driver_id, password_hash FROM drivers WHERE driver_id = ? LIMIT 1`,
        [driverId]
    );
    const row = rows[0];
    return row ? String(row.password_hash) : null;
}

export async function findDriverByPhone(phone, excludeDriverId = null) {
    if (!phone) return null;

    const sql = excludeDriverId
        ? `SELECT driver_id FROM drivers WHERE phone = ? AND driver_id <> ? LIMIT 1`
        : `SELECT driver_id FROM drivers WHERE phone = ? LIMIT 1`;
    const params = excludeDriverId ? [phone, excludeDriverId] : [phone];

    const [rows] = await sqldb.query(sql, params);
    return rows[0] ? { driver_id: Number(rows[0].driver_id) } : null;
}

// ─── Profile update ───────────────────────────────────────────────────────────

export async function updateDriverPushToken(driverId, token, conn) {
    const [result] = await db(conn).query(
        `UPDATE drivers SET push_notification_token = ? WHERE driver_id = ? LIMIT 1`,
        [token || null, driverId]
    );
    return result.affectedRows === 1;
}

export async function updateDriverAddress(driverId, drvAddress, conn) {
    const [result] = await db(conn).query(
        `UPDATE drivers SET drv_address = ? WHERE driver_id = ? LIMIT 1`,
        [drvAddress || null, driverId]
    );
    return result.affectedRows === 1;
}

// ─── Session management (delegate to shared, injecting DRIVER userType) ───────

export async function createSessionToken({ token, userId }, conn) {
    return sharedCreateSessionToken({ token, userId, userType: USER_TYPE.DRIVER }, conn);
}

export async function deleteSessionToken(tokenId, driverId, conn) {
    return sharedDeleteSessionToken(
        { token: tokenId, userId: driverId, userType: USER_TYPE.DRIVER },
        conn
    );
}

export async function deleteAllDriverSessions(driverId, conn) {
    return deleteAllUserSessions({ userId: driverId, userType: USER_TYPE.DRIVER }, conn);
}

export async function findSessionToken(tokenId, driverId) {
    return sharedFindSessionToken({ token: tokenId, userId: driverId, userType: USER_TYPE.DRIVER });
}

// ─── Password reset codes ─────────────────────────────────────────────────────

export async function replaceDriverAccountCode({ driverId, context, code }, conn) {
    return replaceAccountCode(
        { userId: driverId, userType: USER_TYPE.DRIVER, context, code },
        conn
    );
}

export async function consumeDriverAccountCode({ driverId, context, code }, conn) {
    return consumeAccountCode(
        { userId: driverId, userType: USER_TYPE.DRIVER, context, code },
        conn
    );
}

// ─── Password update ──────────────────────────────────────────────────────────

export async function updateDriverLastLogin(driverId, conn) {
    return sharedUpdateDriverLastLogin(driverId, conn);
}

export async function updateDriverPassword(driverId, passwordHash, conn) {
    return sharedUpdateDriverPassword(driverId, passwordHash, conn);
}

// ─── Registration helpers ─────────────────────────────────────────────────────

/**
 * Check if an email is already registered in users OR drivers.
 * Prevents cross-table collisions.
 */
export async function emailExistsAnyAccount(email) {
    if (!email) return false;
    const [rows] = await sqldb.query(
        `SELECT 1 FROM (
            SELECT user_id AS id FROM users WHERE email = ?
            UNION ALL
            SELECT driver_id AS id FROM drivers WHERE email = ?
        ) t LIMIT 1`,
        [email, email]
    );
    return rows.length > 0;
}

/**
 * Check if a phone is already registered in users OR drivers.
 */
export async function phoneExistsAnyAccount(phone) {
    if (!phone) return false;
    const [rows] = await sqldb.query(
        `SELECT 1 FROM (
            SELECT user_id AS id FROM users WHERE phone = ?
            UNION ALL
            SELECT driver_id AS id FROM drivers WHERE phone = ?
        ) t LIMIT 1`,
        [phone, phone]
    );
    return rows.length > 0;
}

/**
 * Insert a minimal driver record for self-registration.
 * account_active=1 (enabled), is_activated=0 (needs OTP).
 * Admin sets commission, car details, bank info later.
 */
export async function insertDriverAccount(payload, conn) {
    const [result] = await db(conn).query(
        `INSERT INTO drivers (
            password_hash, firstname, lastname, email, phone,
            drv_country, reg_route_id, ride_id,
            country_code, country_dial_code, driver_commision,
            is_activated, account_active, account_deleted,
            available, operation_status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
            payload.passwordHash,
            payload.firstname,
            payload.lastname,
            payload.email || null,
            payload.phone,
            payload.drvCountry || "Vietnam",
            payload.regRouteId || 1,
            payload.rideId || 1,
            payload.countryCode || "vn",
            payload.countryDialCode || "+84",
            0,    // driver_commision – admin sets later
            0,    // is_activated – requires OTP verification
            1,    // account_active – enabled from day 1
            0,    // account_deleted
            0,    // available
            0,    // operation_status
        ]
    );
    return Number(result.insertId);
}

/**
 * Activate a driver account after successful OTP verification.
 * Sets is_activated=1 only; account_active is already 1 from registration.
 */
export async function setDriverActivated(driverId, conn) {
    const [result] = await db(conn).query(
        `UPDATE drivers SET is_activated = 1 WHERE driver_id = ? LIMIT 1`,
        [driverId]
    );
    return result.affectedRows === 1;
}
