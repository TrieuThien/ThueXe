import sqldb from "../../config/sqldatabase.js";

function db(conn = null) {
    return conn || sqldb;
}

export async function findRideBookingForCustomer(bookingId, userId, conn = null) {
    const [rows] = await db(conn).query(
        `SELECT id, user_id, driver_id, status
         FROM bookings
         WHERE id = ? AND user_id = ?
         LIMIT 1`,
        [bookingId, userId]
    );
    return rows[0] || null;
}

export async function countRideMessagesByBooking(bookingId, conn = null) {
    const [rows] = await db(conn).query(
        `SELECT COUNT(*) AS total_items
         FROM chats
         WHERE booking_id = ?`,
        [bookingId]
    );

    return Number(rows[0]?.total_items || 0);
}

export async function listRideMessagesByBooking(
    bookingId,
    { limit = 50, offset = 0, afterMessageId = null } = {},
    conn = null
) {
    const params = [bookingId];
    let extraWhere = "";

    if (afterMessageId !== null && afterMessageId !== undefined) {
        extraWhere = " AND id > ?";
        params.push(afterMessageId);
    }

    const [rows] = await db(conn).query(
        `SELECT id, booking_id, user_id, driver_id, chat_msg, date_created
         FROM chats
         WHERE booking_id = ?${extraWhere}
         ORDER BY id ASC
         LIMIT ? OFFSET ?`,
        [...params, limit, offset]
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

export async function insertRideMessage({ bookingId, userId, driverId, chatMsg }, conn = null) {
    const [result] = await db(conn).query(
        `INSERT INTO chats (booking_id, user_id, driver_id, chat_msg)
         VALUES (?, ?, ?, ?)`,
        [bookingId, userId || null, driverId || null, chatMsg]
    );

    return Number(result.insertId);
}

export async function findRentalBookingForCustomer(rentalId, userId, conn = null) {
    const [rows] = await db(conn).query(
        `SELECT rental_id, rental_code, user_id, owner_id, driver_id
         FROM rental_bookings
         WHERE rental_id = ? AND user_id = ?
         LIMIT 1`,
        [rentalId, userId]
    );

    return rows[0] || null;
}

export async function findRentalChatByRentalId(rentalId, conn = null, forUpdate = false) {
    const lockSql = forUpdate ? " FOR UPDATE" : "";
    const [rows] = await db(conn).query(
        `SELECT chat_id, rental_id, booking_code, customer_id, owner_id, driver_id, chat_type, status,
                last_message_id, last_message, last_message_at,
                unread_count_customer, unread_count_owner, unread_count_driver,
                created_at, updated_at
         FROM rental_chats
         WHERE rental_id = ?
         LIMIT 1${lockSql}`,
        [rentalId]
    );

    return rows[0] || null;
}

export async function createRentalChat(payload, conn = null) {
    const [result] = await db(conn).query(
        `INSERT INTO rental_chats
         (rental_id, booking_code, customer_id, owner_id, driver_id, chat_type, status)
         VALUES (?, ?, ?, ?, ?, ?, 'active')`,
        [
            payload.rental_id,
            payload.booking_code || null,
            payload.customer_id,
            payload.owner_id || null,
            payload.driver_id || null,
            payload.chat_type || "group",
        ]
    );

    return Number(result.insertId);
}

export async function countRentalMessagesByChatId(chatId, conn = null) {
    const [rows] = await db(conn).query(
        `SELECT COUNT(*) AS total_items
         FROM rental_chat_messages
         WHERE chat_id = ?
           AND COALESCE(is_deleted, 0) = 0`,
        [chatId]
    );

    return Number(rows[0]?.total_items || 0);
}

export async function listRentalMessagesByChatId(
    chatId,
    { limit = 50, offset = 0, afterMessageId = null } = {},
    conn = null
) {
    const params = [chatId];
    let extraWhere = "";

    if (afterMessageId !== null && afterMessageId !== undefined) {
        extraWhere = " AND message_id > ?";
        params.push(afterMessageId);
    }

    const [rows] = await db(conn).query(
        `SELECT message_id, chat_id, sender_id, sender_role, message_type, message_text,
                media_url, thumbnail_url, latitude, longitude, status, reply_to_message_id,
                is_deleted, is_edited, created_at, updated_at
         FROM rental_chat_messages
         WHERE chat_id = ?
           AND COALESCE(is_deleted, 0) = 0${extraWhere}
         ORDER BY message_id ASC
         LIMIT ? OFFSET ?`,
        [...params, limit, offset]
    );

    return rows.map((row) => ({
        message_id: Number(row.message_id),
        chat_id: Number(row.chat_id),
        sender_id: Number(row.sender_id),
        sender_role: row.sender_role,
        message_type: row.message_type,
        message_text: row.message_text,
        media_url: row.media_url,
        thumbnail_url: row.thumbnail_url,
        latitude: row.latitude === null ? null : Number(row.latitude),
        longitude: row.longitude === null ? null : Number(row.longitude),
        status: row.status,
        reply_to_message_id: row.reply_to_message_id === null ? null : Number(row.reply_to_message_id),
        is_deleted: Number(row.is_deleted || 0),
        is_edited: Number(row.is_edited || 0),
        created_at: row.created_at,
        updated_at: row.updated_at,
    }));
}

export async function insertRentalMessage(payload, conn = null) {
    const [result] = await db(conn).query(
        `INSERT INTO rental_chat_messages
         (chat_id, sender_id, sender_role, message_type, message_text, media_url, latitude, longitude, status, reply_to_message_id)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'sent', ?)`,
        [
            payload.chat_id,
            payload.sender_id,
            payload.sender_role,
            payload.message_type,
            payload.message_text,
            payload.media_url || null,
            payload.latitude ?? null,
            payload.longitude ?? null,
            payload.reply_to_message_id || null,
        ]
    );

    return Number(result.insertId);
}

export async function findRentalMessageById(messageId, conn = null) {
    const [rows] = await db(conn).query(
        `SELECT message_id, chat_id, sender_id, sender_role, message_type, message_text,
                media_url, thumbnail_url, latitude, longitude, status, reply_to_message_id,
                is_deleted, is_edited, created_at, updated_at
         FROM rental_chat_messages
         WHERE message_id = ?
         LIMIT 1`,
        [messageId]
    );

    return rows[0] || null;
}

export async function updateRentalChatAfterMessage(chatId, { lastMessageId, lastMessage, senderRole }, conn = null) {
    const unreadCustomerExpr =
        senderRole === "customer"
            ? "unread_count_customer"
            : "unread_count_customer + 1";
    const unreadOwnerExpr =
        senderRole === "owner"
            ? "unread_count_owner"
            : "CASE WHEN owner_id IS NULL THEN unread_count_owner ELSE unread_count_owner + 1 END";
    const unreadDriverExpr =
        senderRole === "driver"
            ? "unread_count_driver"
            : "CASE WHEN driver_id IS NULL THEN unread_count_driver ELSE unread_count_driver + 1 END";

    await db(conn).query(
        `UPDATE rental_chats
         SET last_message_id = ?,
             last_message = ?,
             last_message_at = NOW(),
             unread_count_customer = ${unreadCustomerExpr},
             unread_count_owner = ${unreadOwnerExpr},
             unread_count_driver = ${unreadDriverExpr},
             updated_at = NOW()
         WHERE chat_id = ?
         LIMIT 1`,
        [lastMessageId, lastMessage, chatId]
    );
}

export async function resetRentalUnreadCountForCustomer(chatId, conn = null) {
    await db(conn).query(
        `UPDATE rental_chats
         SET unread_count_customer = 0,
             updated_at = NOW()
         WHERE chat_id = ?
         LIMIT 1`,
        [chatId]
    );
}
