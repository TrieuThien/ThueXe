import sqldb from "../../config/sqldatabase.js";

function db(conn = null) {
    return conn || sqldb;
}

// ─── Queries ──────────────────────────────────────────────────────────────────

export async function listDriverNotifications(
    driverId,
    { nType, isRead, limit, offset } = {},
    conn = null
) {
    const clauses = ["driver_id = ?"];
    const params = [driverId];

    if (nType !== undefined && nType !== null) {
        clauses.push("n_type = ?");
        params.push(nType);
    }

    if (isRead !== undefined && isRead !== null) {
        clauses.push("is_read = ?");
        params.push(isRead);
    }

    params.push(limit, offset);

    const [rows] = await db(conn).query(
        `SELECT id, driver_id, content, route_id, rental_id,
                n_type, is_read, read_at, date_created
         FROM driver_notifications
         WHERE ${clauses.join(" AND ")}
         ORDER BY date_created DESC, id DESC
         LIMIT ? OFFSET ?`,
        params
    );

    return rows.map(mapNotificationRow);
}

export async function countDriverNotifications(
    driverId,
    { nType, isRead } = {},
    conn = null
) {
    const clauses = ["driver_id = ?"];
    const params = [driverId];

    if (nType !== undefined && nType !== null) {
        clauses.push("n_type = ?");
        params.push(nType);
    }

    if (isRead !== undefined && isRead !== null) {
        clauses.push("is_read = ?");
        params.push(isRead);
    }

    const [rows] = await db(conn).query(
        `SELECT COUNT(*) AS cnt FROM driver_notifications WHERE ${clauses.join(" AND ")}`,
        params
    );
    return Number(rows[0]?.cnt || 0);
}

export async function countUnreadDriverNotifications(driverId, conn = null) {
    const [rows] = await db(conn).query(
        `SELECT COUNT(*) AS cnt
         FROM driver_notifications
         WHERE driver_id = ? AND is_read = 0`,
        [driverId]
    );
    return Number(rows[0]?.cnt || 0);
}

/**
 * Find a single notification owned by this driver.
 */
export async function findNotificationByIdForDriver(
    notificationId,
    driverId,
    conn = null
) {
    const [rows] = await db(conn).query(
        `SELECT id, driver_id, content, route_id, rental_id,
                n_type, is_read, read_at, date_created
         FROM driver_notifications
         WHERE id = ? AND driver_id = ?
         LIMIT 1`,
        [notificationId, driverId]
    );
    return rows[0] ? mapNotificationRow(rows[0]) : null;
}

/**
 * Mark a single notification as read.
 * Returns affected rows (0 = already read or not found).
 */
export async function markNotificationRead(
    notificationId,
    driverId,
    conn = null
) {
    const [result] = await db(conn).query(
        `UPDATE driver_notifications
         SET is_read = 1, read_at = NOW()
         WHERE id = ? AND driver_id = ? AND is_read = 0
         LIMIT 1`,
        [notificationId, driverId]
    );
    return Number(result.affectedRows || 0);
}

/**
 * Mark ALL unread notifications for this driver as read.
 * Returns how many rows were updated.
 */
export async function markAllNotificationsRead(driverId, conn = null) {
    const [result] = await db(conn).query(
        `UPDATE driver_notifications
         SET is_read = 1, read_at = NOW()
         WHERE driver_id = ? AND is_read = 0`,
        [driverId]
    );
    return Number(result.affectedRows || 0);
}

// ─── Row mapper ───────────────────────────────────────────────────────────────

function mapNotificationRow(row) {
    return {
        id: Number(row.id),
        driver_id: Number(row.driver_id),
        n_type: Number(row.n_type || 0),
        title: row.content || "",
        body: row.content || "",
        is_read: Number(row.is_read || 0),
        read_at: row.read_at || null,
        created_at: row.date_created,
        route_id: row.route_id === null ? null : Number(row.route_id),
        rental_id: row.rental_id === null ? null : Number(row.rental_id),
    };
}
