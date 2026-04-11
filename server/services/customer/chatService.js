import sqldb from "../../config/sqldatabase.js";
import AppError from "../../utils/appError.js";
import {
    countRentalMessagesByChatId,
    countRideMessagesByBooking,
    createRentalChat,
    findRentalBookingForCustomer,
    findRentalChatByRentalId,
    findRentalMessageById,
    findRideBookingForCustomer,
    insertRentalMessage,
    insertRideMessage,
    listRentalMessagesByChatId,
    listRideMessagesByBooking,
    resetRentalUnreadCountForCustomer,
    updateRentalChatAfterMessage,
} from "../../repositories/customer/chatRepository.js";
import { emitChatMessageCreated } from "./realtimeService.js";

const RIDE_CHAT_META_PREFIX = "__CHAT_JSON__";

function assertCustomer(auth) {
    const userId = Number(auth?.userId || 0);
    const isPassengerRole = auth?.role === "passenger";
    if (!userId || (!isPassengerRole && Number(auth?.userType) !== 0)) {
        throw new AppError("Forbidden", 403, "FORBIDDEN");
    }
    return userId;
}

function normalizePagination(query = {}) {
    const page = Math.max(Number(query.page || 1), 1);
    const limit = Math.min(Math.max(Number(query.limit || 50), 1), 200);
    return { page, limit, offset: (page - 1) * limit };
}

function normalizeMessagePayload(payload = {}) {
    const messageType = String(payload.message_type || "text").trim().toLowerCase();
    if (!["text", "image", "location", "file"].includes(messageType)) {
        throw new AppError("message_type is invalid.", 422, "INVALID_MESSAGE_TYPE");
    }

    const text = payload.message === undefined || payload.message === null ? "" : String(payload.message).trim();
    const mediaUrl = payload.media_url === undefined || payload.media_url === null ? null : String(payload.media_url).trim();
    const latitude = payload.latitude === undefined || payload.latitude === null || payload.latitude === "" ? null : Number(payload.latitude);
    const longitude = payload.longitude === undefined || payload.longitude === null || payload.longitude === "" ? null : Number(payload.longitude);
    const replyToMessageId = payload.reply_to_message_id === undefined || payload.reply_to_message_id === null || payload.reply_to_message_id === ""
        ? null
        : Number(payload.reply_to_message_id);

    if (messageType === "text" && !text) {
        throw new AppError("message is required for text message.", 422, "MESSAGE_REQUIRED");
    }
    if (["image", "file"].includes(messageType) && !mediaUrl) {
        throw new AppError("media_url is required for image/file message.", 422, "MEDIA_URL_REQUIRED");
    }
    if (messageType === "location") {
        if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90) {
            throw new AppError("latitude is invalid.", 422, "INVALID_LATITUDE");
        }
        if (!Number.isFinite(longitude) || longitude < -180 || longitude > 180) {
            throw new AppError("longitude is invalid.", 422, "INVALID_LONGITUDE");
        }
    }

    return {
        message_type: messageType,
        message: text,
        media_url: mediaUrl,
        latitude,
        longitude,
        reply_to_message_id: Number.isInteger(replyToMessageId) && replyToMessageId > 0 ? replyToMessageId : null,
    };
}

function encodeRideChatMessage(payload) {
    const isSimpleText =
        payload.message_type === "text" &&
        !payload.media_url &&
        payload.latitude === null &&
        payload.longitude === null;

    if (isSimpleText) {
        return payload.message;
    }

    return `${RIDE_CHAT_META_PREFIX}${JSON.stringify(payload)}`;
}

function decodeRideChatMessage(chatMsg) {
    const value = String(chatMsg || "");
    if (!value.startsWith(RIDE_CHAT_META_PREFIX)) {
        return {
            message_type: "text",
            message: value,
            media_url: null,
            latitude: null,
            longitude: null,
            status: "sent",
        };
    }

    try {
        const parsed = JSON.parse(value.slice(RIDE_CHAT_META_PREFIX.length));
        return {
            message_type: parsed.message_type || "text",
            message: parsed.message || "",
            media_url: parsed.media_url || null,
            latitude: parsed.latitude === undefined ? null : Number(parsed.latitude),
            longitude: parsed.longitude === undefined ? null : Number(parsed.longitude),
            status: "sent",
        };
    } catch {
        return {
            message_type: "text",
            message: value,
            media_url: null,
            latitude: null,
            longitude: null,
            status: "sent",
        };
    }
}

function mapRideMessage(row) {
    const content = decodeRideChatMessage(row.chat_msg);
    const senderRole = row.user_id ? "customer" : "driver";

    return {
        message_id: Number(row.id),
        booking_id: Number(row.booking_id),
        sender_id: row.user_id ? Number(row.user_id) : Number(row.driver_id || 0),
        sender_role: senderRole,
        message_type: content.message_type,
        message: content.message,
        media_url: content.media_url,
        latitude: content.latitude,
        longitude: content.longitude,
        status: content.status,
        created_at: row.date_created,
    };
}

function mapRentalMessage(row) {
    return {
        message_id: Number(row.message_id),
        chat_id: Number(row.chat_id),
        sender_id: Number(row.sender_id),
        sender_role: row.sender_role,
        message_type: row.message_type,
        message: row.message_text,
        media_url: row.media_url,
        latitude: row.latitude,
        longitude: row.longitude,
        status: row.status || "sent",
        reply_to_message_id: row.reply_to_message_id,
        created_at: row.created_at,
        updated_at: row.updated_at,
    };
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

export async function getRideChatMessages(auth, bookingIdInput, query = {}) {
    const userId = assertCustomer(auth);
    const bookingId = Number(bookingIdInput);

    if (!Number.isInteger(bookingId) || bookingId < 1) {
        throw new AppError("Invalid booking id.", 422, "INVALID_BOOKING_ID");
    }

    const booking = await findRideBookingForCustomer(bookingId, userId);
    if (!booking) {
        throw new AppError("Booking not found.", 404, "BOOKING_NOT_FOUND");
    }

    const { page, limit, offset } = normalizePagination(query);

    const [rows, totalItems] = await Promise.all([
        listRideMessagesByBooking(bookingId, { limit, offset }),
        countRideMessagesByBooking(bookingId),
    ]);

    const totalPages = totalItems === 0 ? 0 : Math.ceil(totalItems / limit);

    return {
        items: rows.map(mapRideMessage),
        pagination: {
            page,
            limit,
            totalPages,
            hasNextPage: totalPages > 0 && page < totalPages,
            hasPrevPage: page > 1,
        },
        totalItems,
    };
}

export async function sendRideChatMessage(auth, bookingIdInput, payload = {}) {
    const userId = assertCustomer(auth);
    const bookingId = Number(bookingIdInput);

    if (!Number.isInteger(bookingId) || bookingId < 1) {
        throw new AppError("Invalid booking id.", 422, "INVALID_BOOKING_ID");
    }

    const booking = await findRideBookingForCustomer(bookingId, userId);
    if (!booking) {
        throw new AppError("Booking not found.", 404, "BOOKING_NOT_FOUND");
    }

    const normalized = normalizeMessagePayload(payload);
    const stored = encodeRideChatMessage(normalized);

    const messageId = await insertRideMessage({
        bookingId,
        userId,
        driverId: null,
        chatMsg: stored,
    });

    const rows = await listRideMessagesByBooking(bookingId, {
        limit: 1,
        offset: 0,
        afterMessageId: messageId - 1,
    });

    const created = rows.find((item) => Number(item.id) === messageId) || rows[0];

    const message = created ? mapRideMessage(created) : null;

    await emitChatMessageCreated({
        bookingId,
        message,
        targetUserId: userId,
    });

    return {
        message,
        realtime_channel: "chat.message.created",
    };
}

export async function pollRideChatMessages(auth, bookingIdInput, query = {}) {
    const userId = assertCustomer(auth);
    const bookingId = Number(bookingIdInput);

    if (!Number.isInteger(bookingId) || bookingId < 1) {
        throw new AppError("Invalid booking id.", 422, "INVALID_BOOKING_ID");
    }

    const booking = await findRideBookingForCustomer(bookingId, userId);
    if (!booking) {
        throw new AppError("Booking not found.", 404, "BOOKING_NOT_FOUND");
    }

    const afterMessageId =
        query.last_message_id === undefined || query.last_message_id === null || query.last_message_id === ""
            ? 0
            : Number(query.last_message_id);

    if (!Number.isInteger(afterMessageId) || afterMessageId < 0) {
        throw new AppError("last_message_id is invalid.", 422, "INVALID_LAST_MESSAGE_ID");
    }

    const limit = Math.min(Math.max(Number(query.limit || 50), 1), 200);

    const rows = await listRideMessagesByBooking(bookingId, {
        limit,
        offset: 0,
        afterMessageId,
    });

    return {
        items: rows.map(mapRideMessage),
        last_message_id: rows.length ? Number(rows[rows.length - 1].id) : afterMessageId,
    };
}

async function ensureRentalChatForCustomer(rentalId, userId, conn) {
    const rental = await findRentalBookingForCustomer(rentalId, userId, conn);
    if (!rental) throw new AppError("Rental booking not found.", 404, "RENTAL_NOT_FOUND");

    let chat = await findRentalChatByRentalId(rentalId, conn, true);
    if (!chat) {
        const chatId = await createRentalChat(
            {
                rental_id: rentalId,
                booking_code: rental.rental_code,
                customer_id: userId,
                owner_id: rental.owner_id ? Number(rental.owner_id) : null,
                driver_id: rental.driver_id ? Number(rental.driver_id) : null,
                chat_type: "group",
            },
            conn
        );
        chat = await findRentalChatByRentalId(rentalId, conn, true);
        if (!chat || Number(chat.chat_id) !== Number(chatId)) {
            throw new AppError("Failed to initialize rental chat.", 500, "RENTAL_CHAT_INIT_FAILED");
        }
    }

    return { rental, chat };
}

export async function getRentalChatMessages(auth, rentalIdInput, query = {}) {
    const userId = assertCustomer(auth);
    const rentalId = Number(rentalIdInput);

    if (!Number.isInteger(rentalId) || rentalId < 1) {
        throw new AppError("Invalid rental id.", 422, "INVALID_RENTAL_ID");
    }

    return runInTransaction(async (conn) => {
        const { chat } = await ensureRentalChatForCustomer(rentalId, userId, conn);

        const { page, limit, offset } = normalizePagination(query);

        const [rows, totalItems] = await Promise.all([
            listRentalMessagesByChatId(Number(chat.chat_id), { limit, offset }, conn),
            countRentalMessagesByChatId(Number(chat.chat_id), conn),
        ]);

        await resetRentalUnreadCountForCustomer(Number(chat.chat_id), conn);

        const totalPages = totalItems === 0 ? 0 : Math.ceil(totalItems / limit);

        return {
            chat: {
                chat_id: Number(chat.chat_id),
                rental_id: Number(chat.rental_id),
                chat_type: chat.chat_type,
                status: chat.status,
                unread_count_customer: 0,
                unread_count_owner: Number(chat.unread_count_owner || 0),
                unread_count_driver: Number(chat.unread_count_driver || 0),
                last_message_id: chat.last_message_id === null ? null : Number(chat.last_message_id),
                last_message: chat.last_message,
                last_message_at: chat.last_message_at,
            },
            items: rows.map(mapRentalMessage),
            pagination: {
                page,
                limit,
                totalPages,
                hasNextPage: totalPages > 0 && page < totalPages,
                hasPrevPage: page > 1,
            },
            totalItems,
        };
    });
}

export async function sendRentalChatMessage(auth, rentalIdInput, payload = {}) {
    const userId = assertCustomer(auth);
    const rentalId = Number(rentalIdInput);

    if (!Number.isInteger(rentalId) || rentalId < 1) {
        throw new AppError("Invalid rental id.", 422, "INVALID_RENTAL_ID");
    }

    const normalized = normalizeMessagePayload(payload);

    return runInTransaction(async (conn) => {
        const { chat } = await ensureRentalChatForCustomer(rentalId, userId, conn);

        const messageId = await insertRentalMessage(
            {
                chat_id: Number(chat.chat_id),
                sender_id: userId,
                sender_role: "customer",
                message_type: normalized.message_type,
                message_text: normalized.message,
                media_url: normalized.media_url,
                latitude: normalized.latitude,
                longitude: normalized.longitude,
                reply_to_message_id: normalized.reply_to_message_id,
            },
            conn
        );

        const created = await findRentalMessageById(messageId, conn);
        await updateRentalChatAfterMessage(
            Number(chat.chat_id),
            {
                lastMessageId: messageId,
                lastMessage: normalized.message || normalized.media_url || normalized.message_type,
                senderRole: "customer",
            },
            conn
        );

        const message = created ? mapRentalMessage(created) : null;

        await emitChatMessageCreated({
            rentalId,
            message,
            targetUserId: userId,
        });

        return {
            message,
            realtime_channel: "chat.message.created",
        };
    });
}

export async function pollRentalChatMessages(auth, rentalIdInput, query = {}) {
    const userId = assertCustomer(auth);
    const rentalId = Number(rentalIdInput);

    if (!Number.isInteger(rentalId) || rentalId < 1) {
        throw new AppError("Invalid rental id.", 422, "INVALID_RENTAL_ID");
    }

    const afterMessageId =
        query.last_message_id === undefined || query.last_message_id === null || query.last_message_id === ""
            ? 0
            : Number(query.last_message_id);

    if (!Number.isInteger(afterMessageId) || afterMessageId < 0) {
        throw new AppError("last_message_id is invalid.", 422, "INVALID_LAST_MESSAGE_ID");
    }

    const limit = Math.min(Math.max(Number(query.limit || 50), 1), 200);

    return runInTransaction(async (conn) => {
        const { chat } = await ensureRentalChatForCustomer(rentalId, userId, conn);

        const rows = await listRentalMessagesByChatId(
            Number(chat.chat_id),
            {
                limit,
                offset: 0,
                afterMessageId,
            },
            conn
        );

        await resetRentalUnreadCountForCustomer(Number(chat.chat_id), conn);

        return {
            chat_id: Number(chat.chat_id),
            items: rows.map(mapRentalMessage),
            last_message_id: rows.length ? Number(rows[rows.length - 1].message_id) : afterMessageId,
        };
    });
}
