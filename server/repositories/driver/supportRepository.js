import sqldb from "../../config/sqldatabase.js";

function db(conn = null) {
    return conn || sqldb;
}

// ─── Help topics ──────────────────────────────────────────────────────────────

/**
 * List help categories visible on the driver app.
 * Each category includes its help-topic items from appinfo_pages.
 */
export async function listDriverSupportTopics(conn = null) {
    // Categories
    const [cats] = await db(conn).query(
        `SELECT id, title, \`desc\`
         FROM help_cat
         WHERE show_driver = 1
         ORDER BY id ASC`
    );

    if (cats.length === 0) return [];

    const catIds = cats.map((c) => c.id);

    // Help topics belonging to those categories
    const [topics] = await db(conn).query(
        `SELECT id, title, excerpt, cat_id
         FROM appinfo_pages
         WHERE type = 1
           AND show_driver = 1
           AND cat_id IN (?)
         ORDER BY cat_id ASC, id ASC`,
        [catIds]
    );

    // Group topics under their category
    const topicsByCat = {};
    for (const t of topics) {
        const cid = Number(t.cat_id);
        if (!topicsByCat[cid]) topicsByCat[cid] = [];
        topicsByCat[cid].push({
            topic_id: Number(t.id),
            title:    t.title,
            excerpt:  t.excerpt,
        });
    }

    return cats.map((c) => ({
        cat_id:  Number(c.id),
        title:   c.title,
        desc:    c.desc,
        topics:  topicsByCat[Number(c.id)] || [],
    }));
}

// ─── Support tickets ──────────────────────────────────────────────────────────

export async function insertSupportTicket(
    { driverId, catId, subject },
    conn = null
) {
    const [result] = await db(conn).query(
        `INSERT INTO support_tickets (driver_id, cat_id, subject, status)
         VALUES (?, ?, ?, 'open')`,
        [driverId, catId || 0, subject || ""]
    );
    return Number(result.insertId);
}

export async function findTicketByIdForDriver(ticketId, driverId, conn = null) {
    const [rows] = await db(conn).query(
        `SELECT ticket_id, driver_id, cat_id, subject, status, created_at, updated_at
         FROM support_tickets
         WHERE ticket_id = ? AND driver_id = ?
         LIMIT 1`,
        [ticketId, driverId]
    );
    return rows[0] ? mapTicketRow(rows[0]) : null;
}

export async function listTicketsForDriver(
    driverId,
    { status, limit, offset } = {},
    conn = null
) {
    const clauses = ["t.driver_id = ?"];
    const params  = [driverId];

    if (status) {
        clauses.push("t.status = ?");
        params.push(status);
    }

    params.push(limit, offset);

    const [rows] = await db(conn).query(
        `SELECT t.ticket_id, t.driver_id, t.cat_id, t.subject, t.status,
                t.created_at, t.updated_at,
                hc.title AS cat_title,
                last_msg.chat_msg  AS last_message,
                last_msg.date_created AS last_message_at,
                last_msg.admin_id AS last_sender_admin_id
         FROM support_tickets t
         LEFT JOIN help_cat hc ON hc.id = t.cat_id
         LEFT JOIN LATERAL (
             SELECT chat_msg, date_created, admin_id
             FROM chatsupport
             WHERE ticket_id = t.ticket_id
             ORDER BY id DESC
             LIMIT 1
         ) last_msg ON TRUE
         WHERE ${clauses.join(" AND ")}
         ORDER BY t.updated_at DESC, t.ticket_id DESC
         LIMIT ? OFFSET ?`,
        params
    );

    return rows.map(mapTicketListRow);
}

export async function countTicketsForDriver(
    driverId,
    { status } = {},
    conn = null
) {
    const clauses = ["driver_id = ?"];
    const params  = [driverId];

    if (status) {
        clauses.push("status = ?");
        params.push(status);
    }

    const [rows] = await db(conn).query(
        `SELECT COUNT(*) AS cnt FROM support_tickets WHERE ${clauses.join(" AND ")}`,
        params
    );
    return Number(rows[0]?.cnt || 0);
}

export async function touchTicket(ticketId, conn = null) {
    await db(conn).query(
        `UPDATE support_tickets SET updated_at = NOW() WHERE ticket_id = ? LIMIT 1`,
        [ticketId]
    );
}

// ─── Support messages (chatsupport scoped to ticket) ─────────────────────────

/**
 * Insert a message into chatsupport linked to a ticket.
 * sender: 'driver' | 'admin'
 */
export async function insertTicketMessage(
    { ticketId, driverId, adminId, chatMsg },
    conn = null
) {
    const [result] = await db(conn).query(
        `INSERT INTO chatsupport
         (ticket_id, session_status, driver_id, user_id, admin_id,
          rider_recipient_id, driver_recipient_id, chat_msg)
         VALUES (?, 1, ?, 0, ?, 0, 0, ?)`,
        [ticketId, driverId || 0, adminId || 0, chatMsg]
    );
    return Number(result.insertId);
}

export async function listTicketMessages(
    ticketId,
    { limit = 50, offset = 0 } = {},
    conn = null
) {
    const [rows] = await db(conn).query(
        `SELECT id, ticket_id, driver_id, admin_id, chat_msg, date_created
         FROM chatsupport
         WHERE ticket_id = ?
         ORDER BY id ASC
         LIMIT ? OFFSET ?`,
        [ticketId, limit, offset]
    );
    return rows.map(mapMessageRow);
}

export async function countTicketMessages(ticketId, conn = null) {
    const [rows] = await db(conn).query(
        `SELECT COUNT(*) AS cnt FROM chatsupport WHERE ticket_id = ?`,
        [ticketId]
    );
    return Number(rows[0]?.cnt || 0);
}

export async function findTicketMessageById(messageId, conn = null) {
    const [rows] = await db(conn).query(
        `SELECT id, ticket_id, driver_id, admin_id, chat_msg, date_created
         FROM chatsupport
         WHERE id = ?
         LIMIT 1`,
        [messageId]
    );
    return rows[0] ? mapMessageRow(rows[0]) : null;
}

// ─── Row mappers ──────────────────────────────────────────────────────────────

function mapTicketRow(row) {
    return {
        ticket_id:  Number(row.ticket_id),
        driver_id:  Number(row.driver_id),
        cat_id:     Number(row.cat_id || 0),
        subject:    row.subject || "",
        status:     row.status,
        created_at: row.created_at,
        updated_at: row.updated_at,
    };
}

function mapTicketListRow(row) {
    return {
        ticket_id:       Number(row.ticket_id),
        driver_id:       Number(row.driver_id),
        cat_id:          Number(row.cat_id || 0),
        cat_title:       row.cat_title || null,
        subject:         row.subject || "",
        status:          row.status,
        last_message:    row.last_message || null,
        last_message_at: row.last_message_at || null,
        last_sender:     row.last_sender_admin_id ? "admin" : "driver",
        created_at:      row.created_at,
        updated_at:      row.updated_at,
    };
}

function mapMessageRow(row) {
    return {
        message_id:  Number(row.id),
        ticket_id:   row.ticket_id === null ? null : Number(row.ticket_id),
        sender_role: Number(row.admin_id || 0) > 0 ? "admin" : "driver",
        sender_id:   Number(row.admin_id || 0) > 0 ? Number(row.admin_id) : Number(row.driver_id || 0),
        message:     row.chat_msg,
        created_at:  row.date_created,
    };
}
