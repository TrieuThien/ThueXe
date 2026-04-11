import AppError from "../utils/appError.js";
import {
    findBookingParticipants,
    insertBookingChat,
    insertSupportChat,
    listBookingChats,
    listSupportChats,
} from "../repositories/chatRepository.js";

function normalizeMessage(message) {
    const normalized = String(message || "").trim();
    if (!normalized) {
        throw new AppError("chat_msg is required.", 422, "CHAT_MESSAGE_REQUIRED");
    }
    return normalized;
}

function normalizePagination(query = {}) {
    const page = Math.max(Number(query.page) || 1, 1);
    const limit = Math.min(Math.max(Number(query.limit) || 50, 1), 200);
    return { page, limit, offset: (page - 1) * limit };
}

export async function getBookingChatsService({ bookingId, auth, query }) {
    const numericBookingId = Number(bookingId);
    if (!Number.isInteger(numericBookingId) || numericBookingId < 1) {
        throw new AppError("Invalid booking id.", 422, "INVALID_BOOKING_ID");
    }

    const booking = await findBookingParticipants(numericBookingId);
    if (!booking) {
        throw new AppError("Booking not found.", 404, "BOOKING_NOT_FOUND");
    }

    const isAdminStaff = ["admin", "dispatcher"].includes(auth.role);
    const isPassenger = auth.role === "passenger" && Number(auth.userId) === booking.user_id;
    const isDriver = auth.role === "driver" && Number(auth.userId) === booking.driver_id;

    if (!isAdminStaff && !isPassenger && !isDriver) {
        throw new AppError("Forbidden", 403, "FORBIDDEN");
    }

    const { page, limit, offset } = normalizePagination(query);
    const items = await listBookingChats(numericBookingId, { limit, offset });
    return {
        items,
        pagination: { page, limit },
    };
}

export async function sendBookingChatService({ bookingId, auth, payload }) {
    const numericBookingId = Number(bookingId);
    if (!Number.isInteger(numericBookingId) || numericBookingId < 1) {
        throw new AppError("Invalid booking id.", 422, "INVALID_BOOKING_ID");
    }
    const booking = await findBookingParticipants(numericBookingId);
    if (!booking) {
        throw new AppError("Booking not found.", 404, "BOOKING_NOT_FOUND");
    }

    const chatMsg = normalizeMessage(payload.chat_msg);
    let userId = null;
    let driverId = null;

    if (auth.role === "passenger" && Number(auth.userId) === booking.user_id) {
        userId = Number(auth.userId);
    } else if (auth.role === "driver" && Number(auth.userId) === booking.driver_id) {
        driverId = Number(auth.userId);
    } else if (!["admin", "dispatcher"].includes(auth.role)) {
        throw new AppError("Forbidden", 403, "FORBIDDEN");
    } else {
        if (payload.sender_type === "passenger") {
            userId = booking.user_id;
        } else if (payload.sender_type === "driver") {
            driverId = booking.driver_id || null;
        } else {
            throw new AppError("sender_type is required for staff.", 422, "SENDER_TYPE_REQUIRED");
        }
    }

    const chatId = await insertBookingChat({
        bookingId: numericBookingId,
        userId,
        driverId,
        chatMsg,
    });

    const chats = await listBookingChats(numericBookingId, { limit: 1, offset: 0 });
    return {
        chat: chats.find((item) => item.id === chatId) || null,
    };
}

export async function listSupportChatsService({ auth, query }) {
    const { page, limit, offset } = normalizePagination(query);
    let criteria = { limit, offset };

    if (auth.role === "passenger") {
        criteria = { ...criteria, userId: Number(auth.userId) };
    } else if (auth.role === "driver") {
        criteria = { ...criteria, driverId: Number(auth.userId) };
    } else {
        criteria = {
            ...criteria,
            userId: query.user_id === undefined || query.user_id === "" ? undefined : Number(query.user_id),
            driverId: query.driver_id === undefined || query.driver_id === "" ? undefined : Number(query.driver_id),
        };
    }

    const items = await listSupportChats(criteria);
    return { items, pagination: { page, limit } };
}

export async function sendSupportChatService({ auth, payload }) {
    const chatMsg = normalizeMessage(payload.chat_msg);
    const sessionStatus =
        payload.session_status === undefined || payload.session_status === null || payload.session_status === ""
            ? 1
            : Number(payload.session_status);

    let data = {
        session_status: sessionStatus,
        user_id: 0,
        driver_id: 0,
        admin_id: 0,
        rider_recipient_id: 0,
        driver_recipient_id: 0,
        chat_msg: chatMsg,
    };

    if (auth.role === "passenger") {
        data = {
            ...data,
            user_id: Number(auth.userId),
            admin_id: 0,
            rider_recipient_id: Number(payload.rider_recipient_id || 0),
        };
    } else if (auth.role === "driver") {
        data = {
            ...data,
            driver_id: Number(auth.userId),
            admin_id: 0,
            driver_recipient_id: Number(payload.driver_recipient_id || 0),
        };
    } else if (["admin", "dispatcher"].includes(auth.role)) {
        data = {
            ...data,
            admin_id: Number(auth.userId),
            user_id: Number(payload.user_id || 0),
            driver_id: Number(payload.driver_id || 0),
            rider_recipient_id: Number(payload.rider_recipient_id || 0),
            driver_recipient_id: Number(payload.driver_recipient_id || 0),
        };
    } else {
        throw new AppError("Forbidden", 403, "FORBIDDEN");
    }

    const chatId = await insertSupportChat(data);
    const messages = await listSupportChats({ limit: 1, offset: 0 });
    return {
        chat: messages.find((item) => item.id === chatId) || null,
    };
}
