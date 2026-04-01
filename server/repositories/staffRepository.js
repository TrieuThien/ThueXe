import sqldb from "../config/sqldatabase.js";

const STAFF_ACCOUNT_TYPES = [2, 3, 5];
const STAFF_WALLET_ACTOR_TYPE = 3;

const STAFF_WALLET_AGGREGATE_JOIN = `
    LEFT JOIN (
        SELECT actor_id, SUM(balance) AS wallet_amount
        FROM wallet_accounts
        WHERE actor_type = ${STAFF_WALLET_ACTOR_TYPE}
        GROUP BY actor_id
    ) wa ON wa.actor_id = u.user_id
`;

const SORT_COLUMN_MAP = {
    account_create_date: "u.account_create_date",
    firstname: "u.firstname",
    user_rating: "u.user_rating",
    wallet_amount: "COALESCE(wa.wallet_amount, 0)",
    user_id: "u.user_id",
};

function dbConnection(conn) {
    return conn || sqldb;
}

function mapStaffRow(row) {
    if (!row) {
        return null;
    }

    return {
        user_id: Number(row.user_id),
        firstname: row.firstname,
        lastname: row.lastname,
        full_name: row.full_name,
        email: row.email,
        phone: row.phone,
        address: row.address,
        country: row.country,
        country_code: row.country_code,
        country_dial_code: row.country_dial_code,
        route_id: row.route_id === null ? null : Number(row.route_id),
        route_name: row.route_name,
        user_rating: Number(row.user_rating || 0),
        account_active: Number(row.account_active || 0),
        is_activated: Number(row.is_activated || 0),
        account_deleted: Number(row.account_deleted || 0),
        wallet_amount: Number(row.wallet_amount || 0),
        photo_file: row.photo_file,
        account_create_date: row.account_create_date,
        last_login_date: row.last_login_date,
        account_type: Number(row.account_type || 0),
    };
}

function mapStaffAccountRow(row) {
    if (!row) {
        return null;
    }

    return {
        user_id: Number(row.user_id),
        email: row.email,
        phone: row.phone,
        account_deleted: Number(row.account_deleted || 0),
        photo_file: row.photo_file || null,
    };
}

function buildStaffFilterQueryParts(filters = {}) {
    const whereClauses = [
        `u.account_type IN (${STAFF_ACCOUNT_TYPES.map(() => "?").join(", ")})`,
    ];
    const params = [...STAFF_ACCOUNT_TYPES];

    if (filters.route_id !== undefined) {
        whereClauses.push("u.route_id = ?");
        params.push(filters.route_id);
    }

    if (filters.active_today !== undefined) {
        if (Number(filters.active_today) === 1) {
            whereClauses.push("DATE(u.last_login_date) = CURDATE()");
        } else {
            whereClauses.push("(u.last_login_date IS NULL OR DATE(u.last_login_date) < CURDATE())");
        }
    }

    if (filters.rating_min !== undefined) {
        whereClauses.push("u.user_rating >= ?");
        params.push(filters.rating_min);
    }

    if (filters.rating_max !== undefined) {
        whereClauses.push("u.user_rating <= ?");
        params.push(filters.rating_max);
    }

    if (filters.date_from) {
        whereClauses.push("u.account_create_date >= ?");
        params.push(`${filters.date_from} 00:00:00`);
    }

    if (filters.date_to) {
        whereClauses.push("u.account_create_date <= ?");
        params.push(`${filters.date_to} 23:59:59`);
    }

    whereClauses.push("u.account_deleted = 0");

    if (filters.search) {
        const keyword = `%${filters.search}%`;
        whereClauses.push(
            "(CAST(u.user_id AS CHAR) LIKE ? OR u.firstname LIKE ? OR u.lastname LIKE ? OR CONCAT(u.firstname, ' ', u.lastname) LIKE ? OR u.phone LIKE ?)"
        );
        params.push(keyword, keyword, keyword, keyword, keyword);
    }

    return {
        joins: `LEFT JOIN routes r ON r.id = u.route_id ${STAFF_WALLET_AGGREGATE_JOIN}`,
        whereSql: `WHERE ${whereClauses.join(" AND ")}`,
        params,
    };
}

export async function routeExists(routeId) {
    const [rows] = await sqldb.query(`SELECT id FROM routes WHERE id = ? LIMIT 1`, [routeId]);
    return rows.length > 0;
}

export async function findExistingAccountByEmail(email, excludeUserId = null) {
    if (!email) {
        return null;
    }

    const userWhereClause = excludeUserId
        ? "WHERE email = ? AND user_id <> ?"
        : "WHERE email = ?";
    const userParams = excludeUserId ? [email, excludeUserId] : [email];

    const [rows] = await sqldb.query(
        `
            SELECT source, account_id
            FROM (
                SELECT 'user' AS source, user_id AS account_id
                FROM users
                ${userWhereClause}
                UNION ALL
                SELECT 'driver' AS source, driver_id AS account_id
                FROM drivers
                WHERE email = ?
            ) existing_accounts
            LIMIT 1
        `,
        [...userParams, email]
    );

    return rows[0] || null;
}

export async function findExistingAccountByPhone(phone, excludeUserId = null) {
    if (!phone) {
        return null;
    }

    const userWhereClause = excludeUserId
        ? "WHERE phone = ? AND user_id <> ?"
        : "WHERE phone = ?";
    const userParams = excludeUserId ? [phone, excludeUserId] : [phone];

    const [rows] = await sqldb.query(
        `
            SELECT source, account_id
            FROM (
                SELECT 'user' AS source, user_id AS account_id
                FROM users
                ${userWhereClause}
                UNION ALL
                SELECT 'driver' AS source, driver_id AS account_id
                FROM drivers
                WHERE phone = ?
            ) existing_accounts
            LIMIT 1
        `,
        [...userParams, phone]
    );

    return rows[0] || null;
}

export async function insertStaff(payload, conn) {
    const db = dbConnection(conn);
    const [result] = await db.query(
        `
            INSERT INTO users (
                password_hash,
                address,
                email,
                firstname,
                lastname,
                phone,
                country,
                account_type,
                route_id,
                account_create_date,
                is_activated,
                account_deleted,
                account_active,
                photo_file,
                disp_lang,
                country_code,
                country_dial_code
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), ?, ?, ?, ?, ?, ?, ?)
        `,
        [
            payload.passwordHash,
            payload.address,
            payload.email,
            payload.firstname,
            payload.lastname,
            payload.phone,
            payload.country,
            payload.accountType,
            payload.routeId,
            payload.isActivated,
            0,
            payload.accountActive,
            payload.photoFile,
            payload.dispLang,
            payload.countryCode,
            payload.countryDialCode,
        ]
    );

    return Number(result.insertId);
}

export async function findStaffById(userId) {
    const [rows] = await sqldb.query(
        `
            SELECT
                u.user_id,
                u.firstname,
                u.lastname,
                CONCAT(u.firstname, ' ', u.lastname) AS full_name,
                u.email,
                u.phone,
                u.address,
                u.country,
                u.country_code,
                u.country_dial_code,
                u.route_id,
                r.r_title AS route_name,
                u.user_rating,
                u.account_active,
                u.is_activated,
                u.account_deleted,
                COALESCE(wa.wallet_amount, 0) AS wallet_amount,
                u.photo_file,
                u.account_create_date,
                u.last_login_date,
                u.account_type
            FROM users u
            LEFT JOIN routes r ON r.id = u.route_id
            ${STAFF_WALLET_AGGREGATE_JOIN}
            WHERE u.user_id = ?
                AND u.account_type IN (${STAFF_ACCOUNT_TYPES.map(() => "?").join(", ")})
                AND u.account_deleted = 0
            LIMIT 1
        `,
        [userId, ...STAFF_ACCOUNT_TYPES]
    );

    return mapStaffRow(rows[0]);
}

export async function findStaff(filters) {
    const { joins, whereSql, params } = buildStaffFilterQueryParts(filters);
    const sortColumn = SORT_COLUMN_MAP[filters.sort_by] || SORT_COLUMN_MAP.account_create_date;
    const sortOrder = filters.sort_order === "ASC" ? "ASC" : "DESC";
    const offset = (filters.page - 1) * filters.limit;

    const [rows] = await sqldb.query(
        `
            SELECT
                u.user_id,
                u.firstname,
                u.lastname,
                CONCAT(u.firstname, ' ', u.lastname) AS full_name,
                u.email,
                u.phone,
                u.address,
                u.country,
                u.country_code,
                u.country_dial_code,
                u.route_id,
                r.r_title AS route_name,
                u.user_rating,
                u.account_active,
                u.is_activated,
                u.account_deleted,
                COALESCE(wa.wallet_amount, 0) AS wallet_amount,
                u.photo_file,
                u.account_create_date,
                u.last_login_date,
                u.account_type
            FROM users u
            ${joins}
            ${whereSql}
            ORDER BY ${sortColumn} ${sortOrder}, u.user_id DESC
            LIMIT ? OFFSET ?
        `,
        [...params, filters.limit, offset]
    );

    return rows.map(mapStaffRow);
}

export async function countStaff(filters) {
    const { joins, whereSql, params } = buildStaffFilterQueryParts(filters);
    const [rows] = await sqldb.query(
        `
            SELECT COUNT(*) AS total_items
            FROM users u
            ${joins}
            ${whereSql}
        `,
        params
    );

    return Number(rows[0]?.total_items || 0);
}

export async function summarizeStaff(filters) {
    const { joins, whereSql, params } = buildStaffFilterQueryParts(filters);
    const [rows] = await sqldb.query(
        `
            SELECT
                COUNT(*) AS total_staff,
                SUM(CASE WHEN DATE(base.last_login_date) = CURDATE() THEN 1 ELSE 0 END) AS active_today_staff,
                SUM(CASE WHEN base.account_type = 2 THEN 1 ELSE 0 END) AS dispatcher_count,
                SUM(CASE WHEN base.account_type = 3 THEN 1 ELSE 0 END) AS admin_count,
                SUM(CASE WHEN base.account_type = 5 THEN 1 ELSE 0 END) AS biller_count
            FROM (
                SELECT u.user_id, u.account_type, u.last_login_date
                FROM users u
                ${joins}
                ${whereSql}
            ) base
        `,
        params
    );

    const row = rows[0] || {};

    return {
        totalStaff: Number(row.total_staff || 0),
        activeTodayStaff: Number(row.active_today_staff || 0),
        roleSummary: {
            dispatcher: Number(row.dispatcher_count || 0),
            admin: Number(row.admin_count || 0),
            biller: Number(row.biller_count || 0),
        },
    };
}

export async function findStaffAccountById(userId) {
    const [rows] = await sqldb.query(
        `
            SELECT user_id, email, phone, account_deleted, photo_file
            FROM users
            WHERE user_id = ?
                AND account_type IN (${STAFF_ACCOUNT_TYPES.map(() => "?").join(", ")})
            LIMIT 1
        `,
        [userId, ...STAFF_ACCOUNT_TYPES]
    );

    return mapStaffAccountRow(rows[0]);
}

export async function findAdminPasswordById(userId) {
    const [rows] = await sqldb.query(
        `SELECT user_id, password_hash FROM users WHERE user_id = ? AND account_type = 3 LIMIT 1`,
        [userId]
    );

    const row = rows[0];
    return row ? { user_id: Number(row.user_id), password_hash: row.password_hash } : null;
}

export async function updateStaffPersonalInfo(payload, conn) {
    const db = dbConnection(conn);
    const [result] = await db.query(
        `
            UPDATE users
            SET
                firstname = ?,
                lastname = ?,
                email = ?,
                phone = ?,
                address = ?,
                country = ?,
                route_id = ?,
                account_type = ?,
                account_active = ?,
                photo_file = ?,
                country_code = ?,
                country_dial_code = ?
            WHERE user_id = ?
                AND account_type IN (${STAFF_ACCOUNT_TYPES.map(() => "?").join(", ")})
                AND account_deleted = 0
            LIMIT 1
        `,
        [
            payload.firstname,
            payload.lastname,
            payload.email,
            payload.phone,
            payload.address,
            payload.country,
            payload.routeId,
            payload.accountType,
            payload.accountActive,
            payload.photoFile,
            payload.countryCode,
            payload.countryDialCode,
            payload.userId,
            ...STAFF_ACCOUNT_TYPES,
        ]
    );

    return result.affectedRows === 1;
}

export async function softDeleteStaffAccount(userId, conn) {
    const db = dbConnection(conn);
    const [result] = await db.query(
        `
            UPDATE users
            SET account_deleted = 1, account_active = 0
            WHERE user_id = ?
                AND account_type IN (${STAFF_ACCOUNT_TYPES.map(() => "?").join(", ")})
                AND account_deleted = 0
            LIMIT 1
        `,
        [userId, ...STAFF_ACCOUNT_TYPES]
    );

    return result.affectedRows === 1;
}

export async function findStaffTransactions(userId) {
    const [rows] = await sqldb.query(
        `
            SELECT
                CONCAT('wallet-ledger-', wl.ledger_id) AS row_key,
                wl.ledger_id AS source_id,
                COALESCE(p.payment_code, CAST(wl.payment_id AS CHAR)) AS reference_id,
                wl.amount,
                wl.balance_after AS wallet_balance,
                COALESCE(p.booking_id, 0) AS booking_id,
                CASE WHEN wl.direction = 'credit' THEN 2 ELSE 3 END AS type_code,
                wl.description,
                wl.created_at AS transaction_date
            FROM wallet_accounts wa
            INNER JOIN wallet_ledger wl ON wl.wallet_id = wa.wallet_id
            LEFT JOIN payments p ON p.payment_id = wl.payment_id
            WHERE wa.actor_id = ? AND wa.actor_type = ?
            ORDER BY wl.created_at DESC, wl.ledger_id DESC
        `,
        [userId, STAFF_WALLET_ACTOR_TYPE]
    );

    return rows.map((row) => ({
        row_key: row.row_key,
        source_id: Number(row.source_id),
        reference_id: row.reference_id,
        amount: Number(row.amount || 0),
        wallet_balance: Number(row.wallet_balance || 0),
        booking_id: Number(row.booking_id || 0),
        type_code: Number(row.type_code || 0),
        description: row.description,
        transaction_date: row.transaction_date,
    }));
}

export async function findStaffReviews(userId) {
    const [rows] = await sqldb.query(
        `
            SELECT
                rd.id,
                rd.booking_id,
                NULLIF(TRIM(CONCAT(COALESCE(d.firstname, ''), ' ', COALESCE(d.lastname, ''))), '') AS reviewer_name,
                rd.driver_rating,
                rd.driver_comment
            FROM ratings_drivers rd
            INNER JOIN bookings b ON b.id = rd.booking_id
            LEFT JOIN drivers d ON d.driver_id = rd.driver_id
            WHERE b.user_id = ?
            ORDER BY rd.id DESC
        `,
        [userId]
    );

    return rows.map((row) => ({
        id: Number(row.id),
        booking_id: Number(row.booking_id || 0),
        reviewer_name: row.reviewer_name,
        rating: Number(row.driver_rating || 0),
        comment: row.driver_comment,
    }));
}

export async function findStaffDocuments(userId) {
    const [rows] = await sqldb.query(
        `
            SELECT
                ud.id,
                ud.document_id AS doc_id,
                doc.title AS document_title,
                doc.doc_id_num_title AS u_doc_id_num_title,
                ud.doc_number AS u_doc_id_num,
                ud.doc_expiry_date AS u_doc_expiry_date,
                NULL AS u_doc_img,
                CASE
                    WHEN ud.doc_expiry_date IS NOT NULL AND ud.doc_expiry_date < CURDATE() THEN 2
                    WHEN ud.verified = 1 THEN 3
                    ELSE 0
                END AS u_doc_status,
                ud.date_submitted AS date_created,
                ud.date_submitted AS date_updated
            FROM user_documents ud
            LEFT JOIN documents doc ON doc.id = ud.document_id
            WHERE ud.user_id = ?
            ORDER BY ud.date_submitted DESC, ud.id DESC
        `,
        [userId]
    );

    return rows.map((row) => ({
        id: Number(row.id),
        doc_id: Number(row.doc_id || 0),
        title: row.document_title,
        id_number_title: row.u_doc_id_num_title,
        id_number: row.u_doc_id_num,
        expiry_date: row.u_doc_expiry_date,
        image_url: row.u_doc_img,
        status: Number(row.u_doc_status || 0),
        date_created: row.date_created,
        date_updated: row.date_updated,
    }));
}
