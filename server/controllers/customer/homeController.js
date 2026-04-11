import {
    getAvailableCoupons,
    getBanners,
    getCustomerHome,
    getNotifications,
    getNotificationUnreadCount,
    getRides,
    getRoutes,
} from "../../services/customer/homeService.js";
import { successResponse } from "../../utils/apiResponse.js";

export async function getHomeHandler(req, res, next) {
    try {
        const result = await getCustomerHome(req.auth, req.query);
        return successResponse(res, result, "Home data fetched successfully.");
    } catch (error) {
        return next(error);
    }
}

export async function getBannersHandler(req, res, next) {
    try {
        const result = await getBanners(req.auth);
        return successResponse(res, result, "Banners fetched successfully.");
    } catch (error) {
        return next(error);
    }
}

export async function getRoutesHandler(req, res, next) {
    try {
        const result = await getRoutes(req.auth);
        return successResponse(res, result, "Routes fetched successfully.");
    } catch (error) {
        return next(error);
    }
}

export async function getRidesHandler(req, res, next) {
    try {
        const result = await getRides(req.auth, req.query);
        return successResponse(res, result, "Rides fetched successfully.");
    } catch (error) {
        return next(error);
    }
}

export async function getAvailableCouponsHandler(req, res, next) {
    try {
        const result = await getAvailableCoupons(req.auth, req.query);
        return successResponse(res, result, "Available coupons fetched successfully.");
    } catch (error) {
        return next(error);
    }
}

export async function getNotificationsHandler(req, res, next) {
    try {
        const result = await getNotifications(req.auth, req.query);
        return successResponse(res, result, "Notifications fetched successfully.");
    } catch (error) {
        return next(error);
    }
}

export async function getNotificationUnreadCountHandler(req, res, next) {
    try {
        const result = await getNotificationUnreadCount(req.auth);
        return successResponse(res, result, "Unread notification count fetched successfully.");
    } catch (error) {
        return next(error);
    }
}
