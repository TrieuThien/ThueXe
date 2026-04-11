import sqldb from "../config/sqldatabase.js";

const CUSTOMER_ACCOUNT_TYPE = 1;
const USER_WALLET_ACTOR_TYPE = 0;

const CUSTOMER_DOCUMENT_AGGREGATE_JOIN = `
    LEFT JOIN (
        SELECT
            ud.user_id,
            COUNT(*) AS document_count,
            SUM(CASE WHEN ud.verified = 0 AND (ud.doc_expiry_date IS NULL OR ud.doc_expiry_date >= CURDATE()) THEN 1 ELSE 0 END) AS pending_count,
            0 AS failed_count,
            SUM(CASE WHEN ud.doc_expiry_date IS NOT NULL AND ud.doc_expiry_date < CURDATE() THEN 1 ELSE 0 END) AS expired_count,
            SUM(CASE WHEN ud.verified = 1 AND (ud.doc_expiry_date IS NULL OR ud.doc_expiry_date >= CURDATE()) THEN 1 ELSE 0 END) AS approved_count,
            CASE
                WHEN SUM(CASE WHEN ud.doc_expiry_date IS NOT NULL AND ud.doc_expiry_date < CURDATE() THEN 1 ELSE 0 END) > 0 THEN 'expired'
                WHEN SUM(CASE WHEN ud.verified = 0 AND (ud.doc_expiry_date IS NULL OR ud.doc_expiry_date >= CURDATE()) THEN 1 ELSE 0 END) > 0 THEN 'pending'
                WHEN COUNT(*) > 0 THEN 'approved'
                ELSE NULL
            END AS document_status
        FROM user_documents ud
        GROUP BY ud.user_id
    ) doc ON doc.user_id = u.user_id
`;

const CUSTOMER_WALLET_AGGREGATE_JOIN = `
    LEFT JOIN (
        SELECT actor_id, SUM(balance) AS wallet_amount
        FROM wallet_accounts
        WHERE actor_type = ${USER_WALLET_ACTOR_TYPE}
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

function mapCustomerRow(row) {
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
        user_rating: Number(row.user_rating),
        account_active: Number(row.account_active),
        is_activated: Number(row.is_activated),
        account_deleted: Number(row.account_deleted),
        wallet_amount: Number(row.wallet_amount || 0),
        photo_file: row.photo_file,
        account_create_date: row.account_create_date,
        document_status: row.document_status,
        document_counts: {
            total: Number(row.document_count || 0),
            pending: Number(row.pending_count || 0),
            failed: Number(row.failed_count || 0),
            expired: Number(row.expired_count || 0),
            approved: Number(row.approved_count || 0),
        },
    };
}

function mapCustomerAccountRow(row) {
    if (!row) {
        return null;
    }

    return {
        user_id: Number(row.user_id),
        email: row.email,
        phone: row.phone,
        account_active: Number(row.account_active || 0),
        is_activated: Number(row.is_activated || 0),
        photo_file: row.photo_file || null,
    };
}

function buildCustomerFilterQueryParts(filters = {}) {
    const whereClauses = ["u.account_type = ?"];
    const params = [CUSTOMER_ACCOUNT_TYPE];

    if (filters.route_id !== undefined) {
        whereClauses.push("u.route_id = ?");
        params.push(filters.route_id);
    }

    if (filters.account_active !== undefined) {
        whereClauses.push("u.account_active = ?");
        params.push(filters.account_active);
    }

    if (filters.is_activated !== undefined) {
        whereClauses.push("u.is_activated = ?");
        params.push(filters.is_activated);
    }

    if (filters.document_status) {
        whereClauses.push("COALESCE(doc.document_status, 'no_documents') = ?");
        params.push(filters.document_status);
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

    if (filters.search) {
        const keyword = `%${filters.search}%`;
        whereClauses.push(
            "(u.firstname LIKE ? OR u.lastname LIKE ? OR u.email LIKE ? OR u.phone LIKE ?)"
        );
        params.push(keyword, keyword, keyword, keyword);
    }

    return {
        joins: `
            LEFT JOIN routes r ON r.id = u.route_id
            ${CUSTOMER_WALLET_AGGREGATE_JOIN}
            ${CUSTOMER_DOCUMENT_AGGREGATE_JOIN}
        `,
        whereSql: whereClauses.length > 0 ? `WHERE ${whereClauses.join(" AND ")}` : "",
        params,
    };
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

export async function routeExists(routeId) {
    const [rows] = await sqldb.query(
        `SELECT id FROM routes WHERE id = ? LIMIT 1`,
        [routeId]
    );

    return rows.length > 0;
}

export async function referalCodeExists(referalCode, conn) {
    const db = dbConnection(conn);
    const [rows] = await db.query(
        `SELECT user_id FROM users WHERE u_uuid = ? LIMIT 1`,
        [referalCode]
    );

    return rows.length > 0;
}

export async function insertCustomer(payload, conn) {
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
                u_uuid,
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
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), ?, ?, ?, ?, ?, ?, ?)
        `,
        [
            payload.passwordHash,
            payload.address,
            payload.email,
            payload.firstname,
            payload.lastname,
            payload.phone,
            payload.country,
            payload.referalCode,
            CUSTOMER_ACCOUNT_TYPE,
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

export async function findCustomerById(userId) {
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
                COALESCE(doc.document_status, 'no_documents') AS document_status,
                COALESCE(doc.document_count, 0) AS document_count,
                COALESCE(doc.pending_count, 0) AS pending_count,
                COALESCE(doc.failed_count, 0) AS failed_count,
                COALESCE(doc.expired_count, 0) AS expired_count,
                COALESCE(doc.approved_count, 0) AS approved_count
            FROM users u
            LEFT JOIN routes r ON r.id = u.route_id
            ${CUSTOMER_WALLET_AGGREGATE_JOIN}
            ${CUSTOMER_DOCUMENT_AGGREGATE_JOIN}
            WHERE u.user_id = ? AND u.account_type = ?
            LIMIT 1
        `,
        [userId, CUSTOMER_ACCOUNT_TYPE]
    );

    return mapCustomerRow(rows[0]);
}

export async function findCustomers(filters) {
    const { joins, whereSql, params } = buildCustomerFilterQueryParts(filters);
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
                COALESCE(doc.document_status, 'no_documents') AS document_status,
                COALESCE(doc.document_count, 0) AS document_count,
                COALESCE(doc.pending_count, 0) AS pending_count,
                COALESCE(doc.failed_count, 0) AS failed_count,
                COALESCE(doc.expired_count, 0) AS expired_count,
                COALESCE(doc.approved_count, 0) AS approved_count
            FROM users u
            ${joins}
            ${whereSql}
            ORDER BY ${sortColumn} ${sortOrder}, u.user_id DESC
            LIMIT ? OFFSET ?
        `,
        [...params, filters.limit, offset]
    );

    return rows.map(mapCustomerRow);
}

export async function countCustomers(filters) {
    const { joins, whereSql, params } = buildCustomerFilterQueryParts(filters);
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

export async function summarizeCustomers(filters) {
    const { joins, whereSql, params } = buildCustomerFilterQueryParts(filters);
    const [rows] = await sqldb.query(
        `
            SELECT
                COUNT(*) AS total_customers,
                SUM(CASE WHEN base.account_active = 1 THEN 1 ELSE 0 END) AS active_customers,
                SUM(CASE WHEN base.account_active = 0 THEN 1 ELSE 0 END) AS inactive_customers,
                SUM(CASE WHEN base.document_status = 'approved' THEN 1 ELSE 0 END) AS approved_documents,
                SUM(CASE WHEN base.document_status = 'pending' THEN 1 ELSE 0 END) AS pending_documents,
                SUM(CASE WHEN base.document_status = 'expired' THEN 1 ELSE 0 END) AS expired_documents,
                SUM(CASE WHEN base.document_status = 'failed' THEN 1 ELSE 0 END) AS failed_documents,
                SUM(CASE WHEN base.document_status = 'no_documents' THEN 1 ELSE 0 END) AS no_documents
            FROM (
                SELECT
                    u.user_id,
                    u.account_active,
                    COALESCE(doc.document_status, 'no_documents') AS document_status
                FROM users u
                ${joins}
                ${whereSql}
            ) base
        `,
        params
    );

    const row = rows[0] || {};

    return {
        totalCustomers: Number(row.total_customers || 0),
        accountActiveSummary: {
            active: Number(row.active_customers || 0),
            inactive: Number(row.inactive_customers || 0),
        },
        documentStatusSummary: {
            approved: Number(row.approved_documents || 0),
            pending: Number(row.pending_documents || 0),
            expired: Number(row.expired_documents || 0),
            failed: Number(row.failed_documents || 0),
            no_documents: Number(row.no_documents || 0),
        },
    };
}

export async function findCustomerAccountById(userId) {
    const [rows] = await sqldb.query(
        `
            SELECT user_id, email, phone, account_active, is_activated, photo_file
            FROM users
            WHERE user_id = ? AND account_type = ?
            LIMIT 1
        `,
        [userId, CUSTOMER_ACCOUNT_TYPE]
    );

    return mapCustomerAccountRow(rows[0]);
}

export async function updateCustomerAccountStatus({ userId, accountActive }, conn) {
    const db = dbConnection(conn);
    const [result] = await db.query(
        `
            UPDATE users
            SET account_active = ?
            WHERE user_id = ? AND account_type = ?
            LIMIT 1
        `,
        [accountActive, userId, CUSTOMER_ACCOUNT_TYPE]
    );

    return result.affectedRows === 1;
}

export async function updateCustomerActivationStatus({ userId, isActivated }, conn) {
    const db = dbConnection(conn);
    const [result] = await db.query(
        `
            UPDATE users
            SET is_activated = ?
            WHERE user_id = ? AND account_type = ?
            LIMIT 1
        `,
        [isActivated, userId, CUSTOMER_ACCOUNT_TYPE]
    );

    return result.affectedRows === 1;
}

export async function updateCustomerPersonalInfo(payload, conn) {
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
                account_active = ?,
                photo_file = ?,
                country_code = ?,
                country_dial_code = ?
            WHERE user_id = ? AND account_type = ?
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
            payload.accountActive,
            payload.photoFile,
            payload.countryCode,
            payload.countryDialCode,
            payload.userId,
            CUSTOMER_ACCOUNT_TYPE,
        ]
    );

    return result.affectedRows === 1;
}

export async function findCustomerTransactions(userId) {
    const [rows] = await sqldb.query(
        `
            SELECT
                CONCAT('wallet-ledger-', wl.ledger_id) AS row_key,
                wl.ledger_id AS source_id,
                wl.source_type AS source_type,
                COALESCE(p.payment_code, CAST(wl.payment_id AS CHAR)) AS reference_id,
                COALESCE(p.booking_id, 0) AS booking_id,
                wl.amount,
                c.symbol AS cur_symbol,
                c.iso_code AS cur_code,
                wl.balance_after AS wallet_balance,
                wl.description,
                CASE WHEN wl.direction = 'credit' THEN 2 ELSE 3 END AS type_code,
                NULL AS actor_name,
                wl.created_at AS transaction_date
            FROM wallet_accounts wa
            INNER JOIN wallet_ledger wl ON wl.wallet_id = wa.wallet_id
            LEFT JOIN payments p ON p.payment_id = wl.payment_id
            LEFT JOIN currencies c ON c.id = wa.currency_id
            WHERE wa.actor_id = ? AND wa.actor_type = ?
            ORDER BY wl.created_at DESC, wl.ledger_id DESC
        `,
        [userId, USER_WALLET_ACTOR_TYPE]
    );

    return rows.map((row) => ({
        row_key: row.row_key,
        source_id: Number(row.source_id),
        source_type: row.source_type,
        reference_id: row.reference_id,
        booking_id: Number(row.booking_id || 0),
        amount: Number(row.amount || 0),
        cur_symbol: row.cur_symbol,
        cur_code: row.cur_code,
        wallet_balance: Number(row.wallet_balance || 0),
        description: row.description,
        type_code: row.type_code === null ? null : Number(row.type_code),
        actor_name: row.actor_name,
        transaction_date: row.transaction_date,
    }));
}

export async function findCustomerBookings(userId) {
    const [rows] = await sqldb.query(
        `
            SELECT
                b.id,
                b.b_uuid,
                b.user_phone,
                b.driver_id,
                NULLIF(TRIM(CONCAT(COALESCE(d.firstname, ''), ' ', COALESCE(d.lastname, ''))), '') AS driver_name,
                b.driver_phone,
                b.pickup_datetime,
                b.pickup_address,
                b.dropoff_datetime,
                b.dropoff_address,
                b.route_id,
                r.r_title AS route_name,
                b.ride_id,
                rd.ride_type,
                b.scheduled,
                b.payment_type,
                b.status,
                b.estimated_cost,
                b.actual_cost,
                b.paid_amount,
                b.haspaid,
                b.cancel_comment,
                b.transaction_id,
                b.date_created,
                b.date_started,
                b.date_completed,
                b.num_seats
            FROM bookings b
            LEFT JOIN drivers d ON d.driver_id = b.driver_id
            LEFT JOIN routes r ON r.id = b.route_id
            LEFT JOIN rides rd ON rd.id = b.ride_id
            WHERE b.user_id = ?
            ORDER BY b.date_created DESC, b.id DESC
        `,
        [userId]
    );

    return rows.map((row) => ({
        id: Number(row.id),
        b_uuid: row.b_uuid,
        user_phone: row.user_phone,
        driver_id: Number(row.driver_id || 0),
        driver_name: row.driver_name,
        driver_phone: row.driver_phone,
        pickup_datetime: row.pickup_datetime,
        pickup_address: row.pickup_address,
        dropoff_datetime: row.dropoff_datetime,
        dropoff_address: row.dropoff_address,
        route_id: Number(row.route_id || 0),
        route_name: row.route_name,
        ride_id: Number(row.ride_id || 0),
        ride_type: row.ride_type,
        scheduled: Number(row.scheduled || 0),
        payment_type: row.payment_type === null ? null : Number(row.payment_type),
        status: Number(row.status || 0),
        estimated_cost: Number(row.estimated_cost || 0),
        actual_cost: Number(row.actual_cost || 0),
        paid_amount: Number(row.paid_amount || 0),
        haspaid: Number(row.haspaid || 0),
        cancel_comment: row.cancel_comment,
        transaction_id: Number(row.transaction_id || 0),
        date_created: row.date_created,
        date_started: row.date_started,
        date_completed: row.date_completed,
        num_seats: Number(row.num_seats || 1),
    }));
}

export async function findCustomerReviews(userId) {
    const [rows] = await sqldb.query(
        `
            SELECT
                review_data.review_key,
                review_data.review_id,
                review_data.booking_id,
                review_data.review_direction,
                review_data.counterparty_name,
                review_data.rating,
                review_data.comment,
                review_data.booking_date
            FROM (
                SELECT
                    CONCAT('given-', ru.id) AS review_key,
                    ru.id AS review_id,
                    ru.booking_id,
                    'given' AS review_direction,
                    NULLIF(TRIM(CONCAT(COALESCE(d.firstname, ''), ' ', COALESCE(d.lastname, ''))), '') AS counterparty_name,
                    ru.user_rating AS rating,
                    ru.user_comment AS comment,
                    b.date_created AS booking_date
                FROM ratings_users ru
                LEFT JOIN bookings b ON b.id = ru.booking_id
                LEFT JOIN drivers d ON d.driver_id = b.driver_id
                WHERE ru.user_id = ?

                UNION ALL

                SELECT
                    CONCAT('received-', rd.id) AS review_key,
                    rd.id AS review_id,
                    rd.booking_id,
                    'received' AS review_direction,
                    NULLIF(TRIM(CONCAT(COALESCE(d.firstname, ''), ' ', COALESCE(d.lastname, ''))), '') AS counterparty_name,
                    rd.driver_rating AS rating,
                    rd.driver_comment AS comment,
                    b.date_created AS booking_date
                FROM ratings_drivers rd
                INNER JOIN bookings b ON b.id = rd.booking_id
                LEFT JOIN drivers d ON d.driver_id = rd.driver_id
                WHERE b.user_id = ?
            ) review_data
            ORDER BY review_data.booking_date DESC, review_data.review_id DESC
        `,
        [userId, userId]
    );

    return rows.map((row) => ({
        review_key: row.review_key,
        review_id: Number(row.review_id),
        booking_id: Number(row.booking_id || 0),
        review_direction: row.review_direction,
        counterparty_name: row.counterparty_name,
        rating: Number(row.rating || 0),
        comment: row.comment,
        booking_date: row.booking_date,
    }));
}

export async function findCustomerDocuments(userId) {
    const [rows] = await sqldb.query(
        `
            SELECT
                ud.id,
                ud.document_id AS doc_id,
                doc.title AS document_title,
                doc.doc_desc AS document_description,
                doc.doc_id_num_title AS u_doc_id_num_title,
                ud.doc_number AS u_doc_id_num,
                1 AS u_can_edit,
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
        document_title: row.document_title,
        document_description: row.document_description,
        document_id_number_title: row.u_doc_id_num_title,
        document_id_number: row.u_doc_id_num,
        can_edit: Number(row.u_can_edit || 0),
        expiry_date: row.u_doc_expiry_date,
        image_url: row.u_doc_img,
        status: Number(row.u_doc_status || 0),
        date_created: row.date_created,
        date_updated: row.date_updated,
    }));
}
