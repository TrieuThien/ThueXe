import {
    getDriverNotifications,
    getUnreadCount,
    markAllRead,
    markOneRead,
} from "../../services/driver/notificationService.js";
import { successResponse } from "../../utils/apiResponse.js";

export async function listNotificationsHandler(req, res, next) {
    try {
        const result = await getDriverNotifications(req.auth, req.query);
        return successResponse(res, result, "Notifications fetched");
    } catch (error) {
        return next(error);
    }
}

export async function unreadCountHandler(req, res, next) {
    try {
        const result = await getUnreadCount(req.auth);
        return successResponse(res, result, "Unread count fetched");
    } catch (error) {
        return next(error);
    }
}

export async function markOneReadHandler(req, res, next) {
    try {
        const result = await markOneRead(req.auth, req.params.id);
        return successResponse(res, result, "Notification marked as read");
    } catch (error) {
        return next(error);
    }
}

export async function markAllReadHandler(req, res, next) {
    try {
        const result = await markAllRead(req.auth);
        return successResponse(res, result, "All notifications marked as read");
    } catch (error) {
        return next(error);
    }
}
