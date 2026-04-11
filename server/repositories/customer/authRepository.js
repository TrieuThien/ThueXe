import sqldb from "../../config/sqldatabase.js";

const CUSTOMER_ACCOUNT_TYPE = 1;

function dbConnection(conn) {
    return conn || sqldb;
}

function mapCustomerAuthRow(row) {
    if (!row) return null;

    return {
        id: Number(row.user_id),
        firstname: row.firstname,
        lastname: row.lastname,
        email: row.email,
        phone: row.phone,
        address: row.address,
        role: row.role || "customer",
        accountType: Number(row.account_type || CUSTOMER_ACCOUNT_TYPE),
        isActivated: Number(row.is_activated || 0),
        accountActive: Number(row.account_active || 0),
        accountDeleted: Number(row.account_deleted || 0),
        passwordHash: row.password_hash,
        pushNotificationToken: row.push_notification_token || null,
        country: row.country,
        routeId: row.route_id,
        dispLang: row.disp_lang,
        countryCode: row.country_code,
        countryDialCode: row.country_dial_code,
    };
}

export async function findCustomerById(userId) {
    const [rows] = await sqldb.query(
        `SELECT user_id, firstname, lastname, email, phone, address, role, account_type,
                is_activated, account_active, account_deleted, push_notification_token,
                country, route_id, disp_lang, country_code, country_dial_code
         FROM users
         WHERE user_id = ? AND account_type = ?
         LIMIT 1`,
        [userId, CUSTOMER_ACCOUNT_TYPE]
    );

    return mapCustomerAuthRow(rows[0]);
}

export async function findCustomerByIdentifier(identifier) {
    const [rows] = await sqldb.query(
        `SELECT user_id, firstname, lastname, email, phone, address, role, account_type,
                password_hash, is_activated, account_active, account_deleted,
                push_notification_token, country, route_id, disp_lang, country_code, country_dial_code
         FROM users
         WHERE account_type = ? AND (email = ? OR phone = ?)
         LIMIT 1`,
        [CUSTOMER_ACCOUNT_TYPE, identifier, identifier]
    );

    return mapCustomerAuthRow(rows[0]);
}

export async function findAnyAccountByEmail(email, excludeUserId = null) {
    if (!email) return null;

    const [rows] = await sqldb.query(
        `SELECT source, account_id
         FROM (
            SELECT 'user' AS source, user_id AS account_id
            FROM users
            WHERE email = ? ${excludeUserId ? "AND user_id <> ?" : ""}
            UNION ALL
            SELECT 'driver' AS source, driver_id AS account_id
            FROM drivers
            WHERE email = ?
         ) existing
         LIMIT 1`,
        excludeUserId ? [email, excludeUserId, email] : [email, email]
    );

    return rows[0] || null;
}

export async function findAnyAccountByPhone(phone, excludeUserId = null) {
    if (!phone) return null;

    const [rows] = await sqldb.query(
        `SELECT source, account_id
         FROM (
            SELECT 'user' AS source, user_id AS account_id
            FROM users
            WHERE phone = ? ${excludeUserId ? "AND user_id <> ?" : ""}
            UNION ALL
            SELECT 'driver' AS source, driver_id AS account_id
            FROM drivers
            WHERE phone = ?
         ) existing
         LIMIT 1`,
        excludeUserId ? [phone, excludeUserId, phone] : [phone, phone]
    );

    return rows[0] || null;
}

export async function createCustomerAccount(payload, conn) {
    const db = dbConnection(conn);
    const [result] = await db.query(
        `INSERT INTO users (
            password_hash, firstname, lastname, email, phone, address, country,
            account_type, role, route_id, is_activated, account_deleted, account_active,
            disp_lang, country_code, country_dial_code
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
            payload.passwordHash,
            payload.firstname,
            payload.lastname,
            payload.email || null,
            payload.phone || "",
            payload.address || null,
            payload.country || "Vietnam",
            CUSTOMER_ACCOUNT_TYPE,
            "customer",
            payload.routeId || 1,
            payload.isActivated,
            0,
            1,
            payload.dispLang || "vi",
            payload.countryCode || "vn",
            payload.countryDialCode || "+84",
        ]
    );

    return Number(result.insertId);
}

export async function createSessionToken({ token, userId }, conn) {
    const db = dbConnection(conn);
    await db.query(`INSERT INTO user_sessions (token, user_id) VALUES (?, ?)`, [token, userId]);
}

export async function findSessionToken({ token, userId }) {
    const [rows] = await sqldb.query(
        `SELECT id, token, user_id
         FROM user_sessions
         WHERE token = ? AND user_id = ?
         LIMIT 1`,
        [token, userId]
    );

    return rows[0] || null;
}

export async function deleteSessionToken({ token, userId }, conn) {
    const db = dbConnection(conn);
    const [result] = await db.query(
        `DELETE FROM user_sessions WHERE token = ? AND user_id = ?`,
        [token, userId]
    );

    return result.affectedRows > 0;
}

export async function deleteAllUserSessions(userId, conn) {
    const db = dbConnection(conn);
    await db.query(`DELETE FROM user_sessions WHERE user_id = ?`, [userId]);
}

export async function replaceAccountCode({ userId, context, code }, conn) {
    const db = dbConnection(conn);

    await db.query(
        `DELETE FROM user_account_codes WHERE user_id = ? AND context = ?`,
        [userId, context]
    );

    await db.query(
        `INSERT INTO user_account_codes (code, user_id, context)
         VALUES (?, ?, ?)`,
        [code, userId, context]
    );
}

export async function consumeAccountCode({ userId, context, code }, conn) {
    const db = dbConnection(conn);

    const [result] = await db.query(
        `DELETE FROM user_account_codes
         WHERE user_id = ? AND context = ? AND code = ?
         LIMIT 1`,
        [userId, context, code]
    );

    return result.affectedRows === 1;
}

export async function updateUserActivation(userId, isActivated, conn) {
    const db = dbConnection(conn);
    await db.query(
        `UPDATE users SET is_activated = ? WHERE user_id = ? AND account_type = ?`,
        [isActivated, userId, CUSTOMER_ACCOUNT_TYPE]
    );
}

export async function updateUserPassword(userId, passwordHash, conn) {
    const db = dbConnection(conn);
    await db.query(
        `UPDATE users SET password_hash = ? WHERE user_id = ? AND account_type = ?`,
        [passwordHash, userId, CUSTOMER_ACCOUNT_TYPE]
    );
}

export async function updateUserLastLogin(userId, conn) {
    const db = dbConnection(conn);
    await db.query(
        `UPDATE users
         SET last_login_date = NOW(), login_count = login_count + 1
         WHERE user_id = ? AND account_type = ?`,
        [userId, CUSTOMER_ACCOUNT_TYPE]
    );
}

export async function updateCustomerProfile(userId, payload, conn) {
    const db = dbConnection(conn);

    const updates = [];
    const params = [];

    if (payload.firstname !== undefined) {
        updates.push("firstname = ?");
        params.push(payload.firstname);
    }

    if (payload.lastname !== undefined) {
        updates.push("lastname = ?");
        params.push(payload.lastname);
    }

    if (payload.phone !== undefined) {
        updates.push("phone = ?");
        params.push(payload.phone);
    }

    if (payload.email !== undefined) {
        updates.push("email = ?");
        params.push(payload.email || null);
    }

    if (payload.address !== undefined) {
        updates.push("address = ?");
        params.push(payload.address || null);
    }

    if (updates.length === 0) {
        return false;
    }

    params.push(userId, CUSTOMER_ACCOUNT_TYPE);

    const [result] = await db.query(
        `UPDATE users
         SET ${updates.join(", ")}
         WHERE user_id = ? AND account_type = ?`,
        params
    );

    return result.affectedRows === 1;
}

export async function updatePushToken(userId, pushNotificationToken, conn) {
    const db = dbConnection(conn);

    const [result] = await db.query(
        `UPDATE users
         SET push_notification_token = ?
         WHERE user_id = ? AND account_type = ?`,
        [pushNotificationToken || null, userId, CUSTOMER_ACCOUNT_TYPE]
    );

    return result.affectedRows === 1;
}
