import sqldb from "../../config/sqldatabase.js";
import AppError from "../../utils/appError.js";
import {
    countTicketMessages,
    countTicketsForDriver,
    findTicketByIdForDriver,
    findTicketMessageById,
    insertSupportTicket,
    insertTicketMessage,
    listDriverSupportTopics,
    listTicketMessages,
    listTicketsForDriver,
    touchTicket,
} from "../../repositories/driver/supportRepository.js";

// ─── Private helpers ──────────────────────────────────────────────────────────

function assertDriver(auth) {
    const driverId = Number(auth?.userId || 0);
    if (!driverId) throw new AppError("Forbidden", 403, "FORBIDDEN");
    return driverId;
}

function normalizePagination(query = {}) {
    const page  = Math.max(Number(query.page  || 1),  1);
    const limit = Math.min(Math.max(Number(query.limit || 20), 1), 100);
    return { page, limit, offset: (page - 1) * limit };
}

async function runInTransaction(work) {
    const conn = await sqldb.getConnection();
    try {
        await conn.beginTransaction();
        const result = await work(conn);
        await conn.commit();
        return result;
    } catch (error) {
        await conn.rollback();
        throw error;
    } finally {
        conn.release();
    }
}

// ─── Topics ───────────────────────────────────────────────────────────────────

export async function getSupportTopics() {
    const topics = await listDriverSupportTopics();
    return { items: topics };
}

// ─── Ticket CRUD ──────────────────────────────────────────────────────────────

export async function createSupportTicket(auth, payload) {
    const driverId = assertDriver(auth);

    const subject = String(payload.subject || "").trim();
    if (!subject) throw new AppError("subject is required.", 422, "SUBJECT_REQUIRED");

    const message = String(payload.message || "").trim();
    if (!message) throw new AppError("message is required.", 422, "MESSAGE_REQUIRED");

    const catId = Number(payload.cat_id || 0);

    return runInTransaction(async (conn) => {
        const ticketId = await insertSupportTicket({ driverId, catId, subject }, conn);

        const messageId = await insertTicketMessage(
            { ticketId, driverId, adminId: 0, chatMsg: message },
            conn
        );

        const msg = await findTicketMessageById(messageId, conn);
        const ticket = await findTicketByIdForDriver(ticketId, driverId, conn);

        return {
            ticket,
            first_message: msg,
        };
    });
}

export async function listSupportTickets(auth, query = {}) {
    const driverId = assertDriver(auth);
    const { page, limit, offset } = normalizePagination(query);

    const status = query.status || null;

    const [items, total] = await Promise.all([
        listTicketsForDriver(driverId, { status, limit, offset }),
        countTicketsForDriver(driverId, { status }),
    ]);

    return {
        items,
        pagination: {
            page,
            limit,
            total_items: total,
            total_pages: total === 0 ? 0 : Math.ceil(total / limit),
        },
    };
}

export async function getSupportTicketDetail(auth, ticketIdInput) {
    const driverId = assertDriver(auth);
    const ticketId = Number(ticketIdInput);

    if (!Number.isInteger(ticketId) || ticketId < 1) {
        throw new AppError("Invalid ticket id.", 422, "INVALID_TICKET_ID");
    }

    const ticket = await findTicketByIdForDriver(ticketId, driverId);
    if (!ticket) throw new AppError("Ticket not found.", 404, "TICKET_NOT_FOUND");

    const [messages, total] = await Promise.all([
        listTicketMessages(ticketId, { limit: 200, offset: 0 }),
        countTicketMessages(ticketId),
    ]);

    return {
        ticket,
        messages,
        total_messages: total,
    };
}

export async function sendTicketMessage(auth, ticketIdInput, payload) {
    const driverId = assertDriver(auth);
    const ticketId = Number(ticketIdInput);

    if (!Number.isInteger(ticketId) || ticketId < 1) {
        throw new AppError("Invalid ticket id.", 422, "INVALID_TICKET_ID");
    }

    const message = String(payload.message || "").trim();
    if (!message) throw new AppError("message is required.", 422, "MESSAGE_REQUIRED");

    return runInTransaction(async (conn) => {
        const ticket = await findTicketByIdForDriver(ticketId, driverId, conn);
        if (!ticket) throw new AppError("Ticket not found.", 404, "TICKET_NOT_FOUND");
        if (ticket.status === "closed") {
            throw new AppError("This ticket is closed.", 409, "TICKET_CLOSED");
        }

        const messageId = await insertTicketMessage(
            { ticketId, driverId, adminId: 0, chatMsg: message },
            conn
        );

        await touchTicket(ticketId, conn);

        const msg = await findTicketMessageById(messageId, conn);

        return { message: msg };
    });
}
