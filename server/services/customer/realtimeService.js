import AppError from "../../utils/appError.js";
import { publishRealtimeEvent, getRealtimeStats, registerRealtimeSse } from "../../utils/realtime.js";
import {
    findActiveBookingIdsByDriver,
    findBookingDriverLocationForCustomer,
    findBookingStatusForCustomer,
    findUserPushTokenAndRoute,
    insertUserNotification,
} from "../../repositories/customer/realtimeRepository.js";

function assertCustomer(auth) {
    const userId = Number(auth?.userId || 0);
    const isPassengerRole = auth?.role === "passenger";
    if (!userId || (!isPassengerRole && Number(auth?.userType) !== 0)) {
        throw new AppError("Forbidden", 403, "FORBIDDEN");
    }
    return userId;
}

function normalizeEventList(value) {
    if (!value) return null;
    return String(value)
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);
}

export async function streamRealtime(req, res) {
    const userId = assertCustomer(req.auth);
    const eventNames = normalizeEventList(req.query.events);

    registerRealtimeSse({
        userId,
        events: eventNames,
        req,
        res,
    });
}

export async function getBookingStatusFallback(auth, bookingIdInput) {
    const userId = assertCustomer(auth);
    const bookingId = Number(bookingIdInput);

    if (!Number.isInteger(bookingId) || bookingId < 1) {
        throw new AppError("Invalid booking id.", 422, "INVALID_BOOKING_ID");
    }

    const booking = await findBookingStatusForCustomer(bookingId, userId);
    if (!booking) {
        throw new AppError("Booking not found.", 404, "BOOKING_NOT_FOUND");
    }

    return {
        booking: {
            booking_id: Number(booking.id),
            status: Number(booking.status || 0),
            driver_id: booking.driver_id === null ? null : Number(booking.driver_id),
            date_created: booking.date_created,
            date_started: booking.date_started,
            date_completed: booking.date_completed,
        },
        source: "rest_fallback",
    };
}

export async function getDriverLocationFallback(auth, bookingIdInput) {
    const userId = assertCustomer(auth);
    const bookingId = Number(bookingIdInput);

    if (!Number.isInteger(bookingId) || bookingId < 1) {
        throw new AppError("Invalid booking id.", 422, "INVALID_BOOKING_ID");
    }

    const data = await findBookingDriverLocationForCustomer(bookingId, userId);
    if (!data) {
        throw new AppError("Booking not found.", 404, "BOOKING_NOT_FOUND");
    }

    return {
        booking_id: Number(data.booking_id),
        driver_id: data.driver_id === null ? null : Number(data.driver_id),
        location: data.driver_id
            ? {
                  long: data.long === null ? null : Number(data.long),
                  lat: data.lat === null ? null : Number(data.lat),
                  b_angle: data.b_angle === null ? null : Number(data.b_angle),
                  loc_static_status:
                      data.loc_static_status === null ? null : Number(data.loc_static_status),
                  loc_static_duration:
                      data.loc_static_duration === null ? null : Number(data.loc_static_duration),
                  updated_at: data.updated_at,
              }
            : null,
        source: "rest_fallback",
    };
}

export async function emitBookingStatusUpdated({ bookingId, status, userId }) {
    const payload = {
        booking_id: Number(bookingId),
        status: Number(status),
        updated_at: new Date().toISOString(),
    };

    publishRealtimeEvent("booking.status.updated", payload, {
        targetUserIds: userId ? [Number(userId)] : [],
    });

    if (userId) {
        await createNotificationForUser({
            userId: Number(userId),
            content: `Booking #${bookingId} updated to status ${status}`,
            nType: 2,
        });
    }
}

export async function emitDriverLocationUpdated({ bookingId, userId, driverId, location }) {
    const payload = {
        booking_id: Number(bookingId),
        driver_id: Number(driverId),
        location,
        updated_at: new Date().toISOString(),
    };

    publishRealtimeEvent("driver.location.updated", payload, {
        targetUserIds: userId ? [Number(userId)] : [],
    });
}

export async function emitDriverLocationFromDriver({ driverId, location }) {
    const activeBookings = await findActiveBookingIdsByDriver(Number(driverId));

    for (const booking of activeBookings) {
        await emitDriverLocationUpdated({
            bookingId: booking.booking_id,
            userId: booking.user_id,
            driverId: Number(driverId),
            location,
        });
    }
}

export async function emitChatMessageCreated({ bookingId = null, rentalId = null, message, targetUserId = null }) {
    const payload = {
        booking_id: bookingId ? Number(bookingId) : null,
        rental_id: rentalId ? Number(rentalId) : null,
        message,
        created_at: new Date().toISOString(),
    };

    publishRealtimeEvent("chat.message.created", payload, {
        targetUserIds: targetUserId ? [Number(targetUserId)] : [],
    });

    if (targetUserId) {
        await createNotificationForUser({
            userId: Number(targetUserId),
            content: "You received a new chat message",
            rentalId: rentalId ? Number(rentalId) : null,
            nType: 2,
        });
    }
}

export async function emitPaymentUpdated({ paymentId, status, userId }) {
    const payload = {
        payment_id: Number(paymentId),
        status: String(status),
        updated_at: new Date().toISOString(),
    };

    publishRealtimeEvent("payment.updated", payload, {
        targetUserIds: userId ? [Number(userId)] : [],
    });

    if (userId) {
        await createNotificationForUser({
            userId: Number(userId),
            content: `Payment #${paymentId} changed to ${status}`,
            nType: 2,
        });
    }
}

export async function emitWalletUpdated({ walletId, balance, userId }) {
    const payload = {
        wallet_id: Number(walletId),
        balance: Number(balance || 0),
        updated_at: new Date().toISOString(),
    };

    publishRealtimeEvent("wallet.updated", payload, {
        targetUserIds: userId ? [Number(userId)] : [],
    });

    if (userId) {
        await createNotificationForUser({
            userId: Number(userId),
            content: `Wallet balance updated: ${Number(balance || 0).toLocaleString("vi-VN")}`,
            nType: 2,
        });
    }
}

export async function createNotificationForUser({ userId, content, rentalId = null, nType = 2 }) {
    const user = await findUserPushTokenAndRoute(Number(userId));
    if (!user) return null;

    const notificationId = await insertUserNotification({
        userId: Number(user.user_id),
        content,
        routeId: user.route_id ? Number(user.route_id) : null,
        rentalId,
        nType,
    });

    if (user.push_notification_token) {
        // Placeholder push dispatch; replace with provider integration (FCM/APNS) in production.
        console.log(
            `[Push] token=${user.push_notification_token} user=${user.user_id} content=${content}`
        );
    }

    return notificationId;
}

export function getRealtimeHealth() {
    return getRealtimeStats();
}
