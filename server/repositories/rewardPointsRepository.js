import sqldb from "../config/sqldatabase.js";

function dbConnection(conn) {
    return conn || sqldb;
}

function toNumber(value, fallback = 0) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
}

function mapRewardConfig(row) {
    if (!row) return null;

    return {
        id: Number(row.id),
        cur_to_points_conv: toNumber(row.cur_to_points_conv, 0),
        points_to_cur_conv: toNumber(row.points_to_cur_conv, 0),
        status: Number(row.status || 0),
        min_points_redeemable: Number(row.min_points_redeemable || 0),
        date_created: row.date_created,
    };
}

function mapRewardWallet(row) {
    if (!row) return null;

    return {
        user_id: Number(row.user_id),
        account_type: Number(row.account_type || 0),
        firstname: row.firstname,
        lastname: row.lastname,
        email: row.email,
        phone: row.phone,
        reward_points: toNumber(row.reward_points, 0),
        reward_points_redeemed: toNumber(row.reward_points_redeemed, 0),
    };
}

function mapHistoryRow(row) {
    if (!row) return null;

    return {
        id: Number(row.id),
        user_type: Number(row.user_type || 0),
        user_id: Number(row.user_id || 0),
        user_name: row.user_name,
        user_phone: row.user_phone,
        user_email: row.user_email,
        booking_id: row.booking_id === null ? null : Number(row.booking_id),
        action_type: Number(row.action_type || 0),
        points: toNumber(row.points, 0),
        money_value: toNumber(row.money_value, 0),
        balance_before: toNumber(row.balance_before, 0),
        balance_after: toNumber(row.balance_after, 0),
        ref_table: row.ref_table,
        ref_id: row.ref_id === null ? null : Number(row.ref_id),
        note: row.note,
        created_by: row.created_by === null ? null : Number(row.created_by),
        created_by_name: row.created_by_name,
        date_created: row.date_created,
    };
}

function buildHistoryWhere(filters = {}, params = []) {
    const where = [];

    if (filters.userId) {
        where.push("h.user_id = ?");
        params.push(filters.userId);
    }

    if (filters.actionType) {
        where.push("h.action_type = ?");
        params.push(filters.actionType);
    }

    if (filters.dateFrom) {
        where.push("h.date_created >= ?");
        params.push(filters.dateFrom);
    }

    if (filters.dateTo) {
        where.push("h.date_created <= ?");
        params.push(filters.dateTo);
    }

    if (filters.userType !== undefined && filters.userType !== null) {
        where.push("h.user_type = ?");
        params.push(filters.userType);
    }

    if (filters.search) {
        where.push("(u.firstname LIKE ? OR u.lastname LIKE ? OR u.phone LIKE ? OR u.email LIKE ?)");
        const keyword = `%${filters.search}%`;
        params.push(keyword, keyword, keyword, keyword);
    }

    return where.length ? `WHERE ${where.join(" AND ")}` : "";
}

export async function findRewardConfig(conn) {
    const db = dbConnection(conn);
    const [rows] = await db.query(
        `SELECT id, cur_to_points_conv, points_to_cur_conv, status, min_points_redeemable, date_created
         FROM reward_points
         ORDER BY id ASC
         LIMIT 1`
    );

    return mapRewardConfig(rows[0]);
}

export async function upsertRewardConfig(payload, conn) {
    const db = dbConnection(conn);
    const current = await findRewardConfig(db);

    if (!current) {
        const [result] = await db.query(
            `INSERT INTO reward_points (
                cur_to_points_conv,
                points_to_cur_conv,
                status,
                min_points_redeemable,
                date_created
            ) VALUES (?, ?, ?, ?, NOW())`,
            [
                payload.cur_to_points_conv,
                payload.points_to_cur_conv,
                payload.status,
                payload.min_points_redeemable,
            ]
        );

        return Number(result.insertId);
    }

    await db.query(
        `UPDATE reward_points
         SET
            cur_to_points_conv = ?,
            points_to_cur_conv = ?,
            status = ?,
            min_points_redeemable = ?
         WHERE id = ?
         LIMIT 1`,
        [
            payload.cur_to_points_conv,
            payload.points_to_cur_conv,
            payload.status,
            payload.min_points_redeemable,
            current.id,
        ]
    );

    return current.id;
}

export async function findRewardWalletByUserId(userId, conn) {
    const db = dbConnection(conn);
    const [rows] = await db.query(
        `SELECT user_id, account_type, firstname, lastname, email, phone, reward_points, reward_points_redeemed
         FROM users
         WHERE user_id = ?
         LIMIT 1`,
        [userId]
    );

    return mapRewardWallet(rows[0]);
}

export async function findRewardWalletByUserIdForUpdate(userId, conn) {
    const db = dbConnection(conn);
    const [rows] = await db.query(
        `SELECT user_id, account_type, firstname, lastname, email, phone, reward_points, reward_points_redeemed
         FROM users
         WHERE user_id = ?
         LIMIT 1
         FOR UPDATE`,
        [userId]
    );

    return mapRewardWallet(rows[0]);
}

export async function updateUserRewardBalance(
    userId,
    { reward_points, reward_points_redeemed },
    conn
) {
    const db = dbConnection(conn);
    const [result] = await db.query(
        `UPDATE users
         SET reward_points = ?, reward_points_redeemed = ?
         WHERE user_id = ?
         LIMIT 1`,
        [reward_points, reward_points_redeemed, userId]
    );

    return result.affectedRows > 0;
}

export async function findBookingForRewardByIdForUpdate(bookingId, conn) {
    const db = dbConnection(conn);
    const [rows] = await db.query(
        `SELECT id, user_id, status, haspaid, paid_amount, actual_cost
         FROM bookings
         WHERE id = ?
         LIMIT 1
         FOR UPDATE`,
        [bookingId]
    );

    if (!rows[0]) return null;

    return {
        id: Number(rows[0].id),
        user_id: Number(rows[0].user_id),
        status: Number(rows[0].status || 0),
        haspaid: Number(rows[0].haspaid || 0),
        paid_amount: toNumber(rows[0].paid_amount, 0),
        actual_cost: toNumber(rows[0].actual_cost, 0),
    };
}

export async function findEarnHistoryByBookingId(bookingId, userId, conn) {
    const db = dbConnection(conn);
    const [rows] = await db.query(
        `SELECT id, points, money_value, balance_before, balance_after, date_created
         FROM reward_points_history
         WHERE booking_id = ?
           AND user_type = 0
           AND user_id = ?
           AND action_type = 1
         LIMIT 1`,
        [bookingId, userId]
    );

    return rows[0]
        ? {
            id: Number(rows[0].id),
            points: toNumber(rows[0].points, 0),
            money_value: toNumber(rows[0].money_value, 0),
            balance_before: toNumber(rows[0].balance_before, 0),
            balance_after: toNumber(rows[0].balance_after, 0),
            date_created: rows[0].date_created,
        }
        : null;
}

export async function insertRewardHistory(payload, conn) {
    const db = dbConnection(conn);
    const [result] = await db.query(
        `INSERT INTO reward_points_history (
            user_type,
            user_id,
            booking_id,
            action_type,
            points,
            money_value,
            balance_before,
            balance_after,
            ref_table,
            ref_id,
            note,
            created_by,
            date_created
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
        [
            payload.user_type,
            payload.user_id,
            payload.booking_id ?? null,
            payload.action_type,
            payload.points,
            payload.money_value,
            payload.balance_before,
            payload.balance_after,
            payload.ref_table ?? null,
            payload.ref_id ?? null,
            payload.note ?? null,
            payload.created_by ?? null,
        ]
    );

    return Number(result.insertId);
}

export async function findRewardHistory(filters = {}) {
    const params = [];
    const whereSql = buildHistoryWhere(filters, params);
    const offset = (filters.page - 1) * filters.limit;

    const [rows] = await sqldb.query(
        `SELECT
            h.id,
            h.user_type,
            h.user_id,
            h.booking_id,
            h.action_type,
            h.points,
            h.money_value,
            h.balance_before,
            h.balance_after,
            h.ref_table,
            h.ref_id,
            h.note,
            h.created_by,
            h.date_created,
            CONCAT(COALESCE(u.firstname, ''), ' ', COALESCE(u.lastname, '')) AS user_name,
            u.phone AS user_phone,
            u.email AS user_email,
            CASE
                WHEN ca.user_id IS NULL THEN NULL
                ELSE CONCAT(COALESCE(ca.firstname, ''), ' ', COALESCE(ca.lastname, ''))
            END AS created_by_name
         FROM reward_points_history h
         LEFT JOIN users u ON u.user_id = h.user_id
         LEFT JOIN users ca ON ca.user_id = h.created_by
         ${whereSql}
         ORDER BY h.id DESC
         LIMIT ? OFFSET ?`,
        [...params, filters.limit, offset]
    );

    return rows.map(mapHistoryRow);
}

export async function countRewardHistory(filters = {}) {
    const params = [];
    const whereSql = buildHistoryWhere(filters, params);

    const [rows] = await sqldb.query(
        `SELECT COUNT(*) AS total_items
         FROM reward_points_history h
         LEFT JOIN users u ON u.user_id = h.user_id
         ${whereSql}`,
        params
    );

    return Number(rows[0]?.total_items || 0);
}

export async function findRewardHistoryByUserId(userId, filters = {}) {
    const scoped = {
        ...filters,
        userType: 0,
        userId,
    };

    return findRewardHistory(scoped);
}

export async function countRewardHistoryByUserId(userId, filters = {}) {
    const scoped = {
        ...filters,
        userType: 0,
        userId,
    };

    return countRewardHistory(scoped);
}

export async function findEligibleBookingIdsMissingEarnHistoryByUserId(userId, limit = 50) {
    const [rows] = await sqldb.query(
        `SELECT b.id
         FROM bookings b
         LEFT JOIN reward_points_history h
            ON h.booking_id = b.id
            AND h.user_type = 0
            AND h.user_id = b.user_id
            AND h.action_type = 1
         WHERE b.user_id = ?
           AND b.status = 3
           AND b.haspaid = 1
           AND h.id IS NULL
         ORDER BY b.id ASC
         LIMIT ?`,
        [userId, limit]
    );

    return rows.map((row) => Number(row.id));
}
