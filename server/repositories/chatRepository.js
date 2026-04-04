import sqldb from "../config/sqldatabase.js";

export async function findBookingParticipants(bookingId) {
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

export async function listBookingChats(bookingId, { limit = 100, offset = 0 } = {}) {
    const [rows] = await sqldb.query(
        `SELECT id, booking_id, user_id, driver_id, chat_msg, date_created
         FROM chats
         WHERE booking_id = ?
         ORDER BY id DESC
         LIMIT ? OFFSET ?`,
        [bookingId, limit, offset]
    );
    return rows.map((row) => ({
        id: Number(row.id),
        booking_id: Number(row.booking_id),
        user_id: row.user_id === null ? null : Number(row.user_id),
        driver_id: row.driver_id === null ? null : Number(row.driver_id),
        chat_msg: row.chat_msg,
        date_created: row.date_created,
    }));
}

export async function insertBookingChat({ bookingId, userId, driverId, chatMsg }) {
    const [result] = await sqldb.query(
        `INSERT INTO chats (booking_id, user_id, driver_id, chat_msg)
         VALUES (?, ?, ?, ?)`,
        [bookingId, userId || null, driverId || null, chatMsg]
    );
    return Number(result.insertId);
}

export async function listSupportChats({ userId, driverId, adminId, recipientUserId, recipientDriverId, limit = 100, offset = 0 }) {
    const whereClauses = [];
    const params = [];

    if (userId !== undefined) {
        whereClauses.push("user_id = ?");
        params.push(userId);
    }
    if (driverId !== undefined) {
        whereClauses.push("driver_id = ?");
        params.push(driverId);
    }
    if (adminId !== undefined) {
        whereClauses.push("admin_id = ?");
        params.push(adminId);
    }
    if (recipientUserId !== undefined) {
        whereClauses.push("rider_recipient_id = ?");
        params.push(recipientUserId);
    }
    if (recipientDriverId !== undefined) {
        whereClauses.push("driver_recipient_id = ?");
        params.push(recipientDriverId);
    }
    const whereSql = whereClauses.length ? `WHERE ${whereClauses.join(" AND ")}` : "";

    const [rows] = await sqldb.query(
        `SELECT id, session_status, user_id, driver_id, admin_id, rider_recipient_id, driver_recipient_id, chat_msg, date_created
         FROM chatsupport
         ${whereSql}
         ORDER BY id DESC
         LIMIT ? OFFSET ?`,
        [...params, limit, offset]
    );
    return rows.map((row) => ({
        id: Number(row.id),
        session_status: Number(row.session_status || 0),
        user_id: Number(row.user_id || 0),
        driver_id: Number(row.driver_id || 0),
        admin_id: Number(row.admin_id || 0),
        rider_recipient_id: Number(row.rider_recipient_id || 0),
        driver_recipient_id: Number(row.driver_recipient_id || 0),
        chat_msg: row.chat_msg,
        date_created: row.date_created,
    }));
}

export async function insertSupportChat(payload) {
    const [result] = await sqldb.query(
        `INSERT INTO chatsupport
         (session_status, user_id, driver_id, admin_id, rider_recipient_id, driver_recipient_id, chat_msg)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
            payload.session_status ?? 1,
            payload.user_id ?? 0,
            payload.driver_id ?? 0,
            payload.admin_id ?? 0,
            payload.rider_recipient_id ?? 0,
            payload.driver_recipient_id ?? 0,
            payload.chat_msg,
        ]
    );
    return Number(result.insertId);
}

