import AppError from "../../utils/appError.js";
import {
    countDriverNotifications,
    countUnreadDriverNotifications,
    findNotificationByIdForDriver,
    listDriverNotifications,
    markAllNotificationsRead,
    markNotificationRead,
} from "../../repositories/driver/notificationRepository.js";

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

// ─── Services ─────────────────────────────────────────────────────────────────

export async function getDriverNotifications(auth, query = {}) {
    const driverId = assertDriver(auth);
    const { page, limit, offset } = normalizePagination(query);

    // n_type filter — only apply when explicitly provided
    const nType =
        query.n_type === undefined || query.n_type === null || query.n_type === ""
            ? undefined
            : Number(query.n_type);

    const [items, total] = await Promise.all([
        listDriverNotifications(driverId, { nType, limit, offset }),
        countDriverNotifications(driverId, { nType }),
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

export async function getUnreadCount(auth) {
    const driverId = assertDriver(auth);
    const count = await countUnreadDriverNotifications(driverId);
    return { unread_count: count };
}

export async function markOneRead(auth, notificationIdInput) {
    const driverId       = assertDriver(auth);
    const notificationId = Number(notificationIdInput);

    if (!Number.isInteger(notificationId) || notificationId < 1) {
        throw new AppError("Invalid notification id.", 422, "INVALID_NOTIFICATION_ID");
    }

    const notification = await findNotificationByIdForDriver(notificationId, driverId);
    if (!notification) {
        throw new AppError("Notification not found.", 404, "NOTIFICATION_NOT_FOUND");
    }

    await markNotificationRead(notificationId, driverId);

    return {
        id:      notificationId,
        is_read: 1,
    };
}

export async function markAllRead(auth) {
    const driverId = assertDriver(auth);
    const updated  = await markAllNotificationsRead(driverId);
    return { updated };
}
