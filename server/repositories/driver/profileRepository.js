import sqldb from "../../config/sqldatabase.js";

function db(conn) {
    return conn || sqldb;
}

// ─── Profile read ─────────────────────────────────────────────────────────────

/**
 * Full driver profile including bank fields.
 * Used by the driver app's own-profile endpoints.
 * Does NOT include password_hash or push_notification_token.
 */
export async function findDriverOwnProfile(driverId) {
    const [rows] = await sqldb.query(
        `SELECT
            d.driver_id, d.firstname, d.lastname, d.email, d.phone,
            d.photo_file, d.drv_address, d.state, d.drv_country,
            d.car_model, d.car_plate_num, d.car_reg_num, d.car_color, d.car_year,
            d.ride_id, d.reg_route_id, d.route_id,
            d.driver_rating, d.completed_rides, d.cancelled_rides,
            d.reward_points, d.available, d.operation_status,
            d.available_for_rental, d.hourly_rate, d.daily_rate,
            d.country_code, d.country_dial_code,
            d.is_activated, d.account_active, d.account_deleted,
            d.allow_photo_edit, d.allow_vehicle_edit, d.allow_city_edit,
            d.disp_lang, d.account_create_date,
            d.bank_name, d.bank_acc_holder_name, d.bank_acc_num,
            d.bank_code, d.bank_swift_code,
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
        driver_id: Number(row.driver_id),
        firstname: row.firstname,
        lastname: row.lastname,
        email: row.email,
        phone: row.phone,
        photo_file: row.photo_file,
        drv_address: row.drv_address,
        state: row.state,
        drv_country: row.drv_country,
        car_model: row.car_model,
        car_plate_num: row.car_plate_num,
        car_reg_num: row.car_reg_num,
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
        bank_name: row.bank_name,
        bank_acc_holder_name: row.bank_acc_holder_name,
        bank_acc_num: row.bank_acc_num,
        bank_code: row.bank_code,
        bank_swift_code: row.bank_swift_code,
    };
}

// ─── Profile update ───────────────────────────────────────────────────────────

/**
 * Update safe, driver-editable fields.
 * The service layer enforces allow_vehicle_edit / allow_city_edit before calling this.
 * Only keys present in `fields` are updated (partial update pattern).
 */
export async function updateDriverOwnProfile(driverId, fields, conn) {
    const ALLOWED_COLUMNS = new Set([
        "firstname", "lastname", "drv_address", "state", "drv_country",
        "country_code", "country_dial_code", "disp_lang",
        // vehicle (included only when service allows)
        "car_model", "car_plate_num", "car_reg_num", "car_color", "car_year",
        // route (included only when service allows)
        "reg_route_id", "route_id",
    ]);

    const sets = [];
    const params = [];
    for (const [key, value] of Object.entries(fields)) {
        if (ALLOWED_COLUMNS.has(key)) {
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

// ─── Bank account update ──────────────────────────────────────────────────────

export async function updateDriverOwnBankAccount(driverId, payload, conn) {
    const [result] = await db(conn).query(
        `UPDATE drivers
         SET bank_name = ?, bank_acc_holder_name = ?, bank_acc_num = ?,
             bank_code = ?, bank_swift_code = ?
         WHERE driver_id = ?
         LIMIT 1`,
        [
            payload.bankName,
            payload.bankAccHolderName,
            payload.bankAccNum,
            payload.bankCode || null,
            payload.bankSwiftCode || null,
            driverId,
        ]
    );
    return result.affectedRows === 1;
}

// ─── Photo update ─────────────────────────────────────────────────────────────

export async function updateDriverOwnPhoto(driverId, photoFile, conn) {
    const [result] = await db(conn).query(
        `UPDATE drivers SET photo_file = ? WHERE driver_id = ? LIMIT 1`,
        [photoFile, driverId]
    );
    return result.affectedRows === 1;
}
