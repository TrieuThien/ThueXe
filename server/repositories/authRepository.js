import sqldb from "../config/sqldatabase.js";
import { CODE_CONTEXT, USER_TYPE, mapUserAccountTypeToRole } from "../utils/authRole.js";

function dbConnection(conn) {
    return conn || sqldb;
}

function resolveAccountCodeTable(userType) {
    if (userType === USER_TYPE.DRIVER) {
        return {
            table: "driver_account_codes",
            idColumn: "driver_id",
        };
    }

    return {
        table: "user_account_codes",
        idColumn: "user_id",
    };
}

function resolveSessionTable(userType) {
    if (userType === USER_TYPE.DRIVER) {
        return {
            table: "driver_sessions",
            idColumn: "driver_id",
        };
    }

    return {
        table: "user_sessions",
        idColumn: "user_id",
    };
}

function sanitizeRecord(record) {
    if (!record) return null;

    return {
        ...record,
        is_activated: Number(record.is_activated || 0),
        account_active: Number(record.account_active || 0),
        account_deleted: Number(record.account_deleted || 0),
    };
}

export async function findUserByIdentifier(identifier) {
    const [rows] = await sqldb.query(
        `SELECT user_id, firstname, lastname, email, phone, password_hash, account_type,
            is_activated, account_active, account_deleted
     FROM users
     WHERE email = ? OR phone = ?
     LIMIT 1`,
        [identifier, identifier]
    );

    const user = sanitizeRecord(rows[0]);

    if (!user) return null;

    return {
        source: "users",
        id: Number(user.user_id),
        firstname: user.firstname,
        lastname: user.lastname,
        email: user.email,
        phone: user.phone,
        passwordHash: user.password_hash,
        userType: USER_TYPE.USER,
        accountType: Number(user.account_type || 1),
        role: mapUserAccountTypeToRole(user.account_type),
        isActivated: user.is_activated,
        accountActive: user.account_active,
        accountDeleted: user.account_deleted,
    };
}

export async function findDriverByIdentifier(identifier) {
    const [rows] = await sqldb.query(
        `SELECT driver_id, firstname, lastname, email, phone, password_hash,
            is_activated, account_active, account_deleted
     FROM drivers
     WHERE email = ? OR phone = ?
     LIMIT 1`,
        [identifier, identifier]
    );

    const driver = sanitizeRecord(rows[0]);

    if (!driver) return null;

    return {
        source: "drivers",
        id: Number(driver.driver_id),
        firstname: driver.firstname,
        lastname: driver.lastname,
        email: driver.email,
        phone: driver.phone,
        passwordHash: driver.password_hash,
        userType: USER_TYPE.DRIVER,
        accountType: null,
        role: "driver",
        isActivated: driver.is_activated,
        accountActive: driver.account_active,
        accountDeleted: driver.account_deleted,
    };
}

export async function findUserByEmail(email) {
    if (!email) return null;

    const [rows] = await sqldb.query(
        `SELECT user_id, firstname, lastname, email, phone, account_type,
            is_activated, account_active, account_deleted
     FROM users
     WHERE email = ?
     LIMIT 1`,
        [email]
    );

    const user = sanitizeRecord(rows[0]);
    if (!user) return null;

    return {
        source: "users",
        id: Number(user.user_id),
        firstname: user.firstname,
        lastname: user.lastname,
        email: user.email,
        phone: user.phone,
        userType: USER_TYPE.USER,
        accountType: Number(user.account_type || 1),
        role: mapUserAccountTypeToRole(user.account_type),
        isActivated: user.is_activated,
        accountActive: user.account_active,
        accountDeleted: user.account_deleted,
    };
}

export async function findDriverByEmail(email) {
    if (!email) return null;

    const [rows] = await sqldb.query(
        `SELECT driver_id, firstname, lastname, email, phone,
            is_activated, account_active, account_deleted
     FROM drivers
     WHERE email = ?
     LIMIT 1`,
        [email]
    );

    const driver = sanitizeRecord(rows[0]);
    if (!driver) return null;

    return {
        source: "drivers",
        id: Number(driver.driver_id),
        firstname: driver.firstname,
        lastname: driver.lastname,
        email: driver.email,
        phone: driver.phone,
        userType: USER_TYPE.DRIVER,
        accountType: null,
        role: "driver",
        isActivated: driver.is_activated,
        accountActive: driver.account_active,
        accountDeleted: driver.account_deleted,
    };
}

export async function findUserByPhone(phone) {
    if (!phone) return null;

    const [rows] = await sqldb.query(
        `SELECT user_id FROM users WHERE phone = ? LIMIT 1`,
        [phone]
    );

    return rows[0] || null;
}

export async function findDriverByPhone(phone) {
    if (!phone) return null;

    const [rows] = await sqldb.query(
        `SELECT driver_id FROM drivers WHERE phone = ? LIMIT 1`,
        [phone]
    );

    return rows[0] || null;
}

export async function createPassengerAccount(payload, conn) {
    const db = dbConnection(conn);
    const {
        firstname,
        lastname,
        email,
        phone,
        passwordHash,
        country,
        routeId,
        dispLang,
        countryCode,
        countryDialCode,
    } = payload;

    const [result] = await db.query(
        `INSERT INTO users
      (password_hash, firstname, lastname, email, phone, country,
       account_type, route_id, is_activated, account_deleted, account_active,
       disp_lang, country_code, country_dial_code)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
            passwordHash,
            firstname,
            lastname,
            email || null,
            phone || "",
            country || "Vietnam",
            1,
            routeId || 1,
            1,
            0,
            1,
            dispLang || "vi",
            countryCode || "vn",
            countryDialCode || "+84",
        ]
    );

    return Number(result.insertId);
}

export async function createStaffAccount(payload, conn) {
    const db = dbConnection(conn);
    const {
        firstname,
        lastname,
        email,
        phone,
        passwordHash,
        accountType,
        country,
        routeId,
        dispLang,
        countryCode,
        countryDialCode,
    } = payload;

    const [result] = await db.query(
        `INSERT INTO users
      (password_hash, firstname, lastname, email, phone, country,
       account_type, route_id, is_activated, account_deleted, account_active,
       disp_lang, country_code, country_dial_code)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)` ,
        [
            passwordHash,
            firstname,
            lastname,
            email || null,
            phone || "",
            country || "Vietnam",
            accountType,
            routeId || 1,
            1,
            0,
            1,
            dispLang || "vi",
            countryCode || "vn",
            countryDialCode || "+84",
        ]
    );

    return Number(result.insertId);
}

export async function updateUserLastLogin(userId, conn) {
    const db = dbConnection(conn);

    await db.query(
        `UPDATE users
     SET last_login_date = NOW(), login_count = login_count + 1
     WHERE user_id = ?`,
        [userId]
    );
}

export async function updateDriverLastLogin(driverId, conn) {
    const db = dbConnection(conn);

    await db.query(
        `UPDATE drivers
     SET last_login_date = NOW()
     WHERE driver_id = ?`,
        [driverId]
    );
}

export async function replaceAccountCode({ userId, userType, context, code }, conn) {
    const db = dbConnection(conn);
    const { table, idColumn } = resolveAccountCodeTable(userType);

    await db.query(
        `DELETE FROM ${table}
     WHERE ${idColumn} = ? AND context = ?`,
        [userId, context]
    );

    await db.query(
        `INSERT INTO ${table} (code, ${idColumn}, context)
     VALUES (?, ?, ?)`,
        [code, userId, context]
    );
}

export async function consumeAccountCode({ userId, userType, context, code }, conn) {
    const db = dbConnection(conn);
    const { table, idColumn } = resolveAccountCodeTable(userType);

    const [result] = await db.query(
        `DELETE FROM ${table}
     WHERE ${idColumn} = ? AND context = ? AND code = ?
     LIMIT 1`,
        [userId, context, code]
    );

    return result.affectedRows === 1;
}

export async function createSessionToken({ token, userId, userType }, conn) {
    const db = dbConnection(conn);
    const { table, idColumn } = resolveSessionTable(userType);

    await db.query(
        `INSERT INTO ${table} (token, ${idColumn})
     VALUES (?, ?)`,
        [token, userId]
    );
}

export async function deleteSessionToken({ token, userId, userType }, conn) {
    const db = dbConnection(conn);
    const { table, idColumn } = resolveSessionTable(userType);

    const [result] = await db.query(
        `DELETE FROM ${table} WHERE token = ? AND ${idColumn} = ?`,
        [token, userId]
    );

    return result.affectedRows > 0;
}

export async function deleteAllUserSessions({ userId, userType }, conn) {
    const db = dbConnection(conn);
    const { table, idColumn } = resolveSessionTable(userType);

    await db.query(`DELETE FROM ${table} WHERE ${idColumn} = ?`, [userId]);
}

export async function findSessionToken({ token, userId, userType }) {
    const { table, idColumn } = resolveSessionTable(userType);
    const [rows] = await sqldb.query(
        `SELECT id, token, ${idColumn} AS user_id
     FROM ${table}
     WHERE token = ? AND ${idColumn} = ?
     LIMIT 1`,
        [token, userId]
    );

    return rows[0]
        ? {
            ...rows[0],
            user_type: userType,
        }
        : null;
}

export async function updateUserPassword(userId, passwordHash, conn) {
    const db = dbConnection(conn);

    await db.query(
        `UPDATE users
     SET password_hash = ?
     WHERE user_id = ?`,
        [passwordHash, userId]
    );
}

export async function updateDriverPassword(driverId, passwordHash, conn) {
    const db = dbConnection(conn);

    await db.query(
        `UPDATE drivers
     SET password_hash = ?
     WHERE driver_id = ?`,
        [passwordHash, driverId]
    );
}

export async function findAccountByTypeAndId({ userType, userId }) {
    if (userType === USER_TYPE.DRIVER) {
        const [rows] = await sqldb.query(
            `SELECT driver_id, firstname, lastname, email, phone, is_activated, account_active, account_deleted
       FROM drivers
       WHERE driver_id = ?
       LIMIT 1`,
            [userId]
        );

        const row = sanitizeRecord(rows[0]);
        if (!row) return null;

        return {
            source: "drivers",
            id: Number(row.driver_id),
            firstname: row.firstname,
            lastname: row.lastname,
            email: row.email,
            phone: row.phone,
            userType: USER_TYPE.DRIVER,
            role: "driver",
            accountType: null,
            isActivated: row.is_activated,
            accountActive: row.account_active,
            accountDeleted: row.account_deleted,
        };
    }

    const [rows] = await sqldb.query(
        `SELECT user_id, firstname, lastname, email, phone, account_type, is_activated, account_active, account_deleted
     FROM users
     WHERE user_id = ?
     LIMIT 1`,
        [userId]
    );

    const row = sanitizeRecord(rows[0]);
    if (!row) return null;

    return {
        source: "users",
        id: Number(row.user_id),
        firstname: row.firstname,
        lastname: row.lastname,
        email: row.email,
        phone: row.phone,
        userType: USER_TYPE.USER,
        role: mapUserAccountTypeToRole(row.account_type),
        accountType: Number(row.account_type || 1),
        isActivated: row.is_activated,
        accountActive: row.account_active,
        accountDeleted: row.account_deleted,
    };
}

export { CODE_CONTEXT, USER_TYPE };
