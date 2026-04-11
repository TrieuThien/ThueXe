import {
    countAvailableCouponsForCustomer,
    countUnreadNotifications,
    findAvailableCouponsForCustomer,
    findCustomerContext,
    findNotificationsByUser,
    listActiveBanners,
    listQuickDestinationCandidatesByUser,
    listRecentRoutesByUser,
    listRidesWithTariffs,
    listRoutes,
} from "../../repositories/customer/homeRepository.js";
import AppError from "../../utils/appError.js";
import { USER_TYPE } from "../../utils/authRole.js";

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;
const CACHE_TTL_MS = Number(process.env.CUSTOMER_HOME_CACHE_TTL_MS || 60_000);
const HOME_RECENT_ROUTES_LIMIT = 4;
const HOME_POPULAR_SERVICES_LIMIT = 3;
const HOME_FEATURED_COUPONS_LIMIT = 3;
const HOME_QUICK_DESTINATIONS_LIMIT = 8;

const memoryCache = new Map();

function buildCacheKey(scope, payload = {}) {
    return `${scope}:${JSON.stringify(payload)}`;
}

function getCachedValue(key) {
    const hit = memoryCache.get(key);
    if (!hit) return null;

    if (Date.now() > hit.expiresAt) {
        memoryCache.delete(key);
        return null;
    }

    return hit.value;
}

function setCachedValue(key, value, ttl = CACHE_TTL_MS) {
    memoryCache.set(key, {
        value,
        expiresAt: Date.now() + ttl,
    });

    return value;
}

function normalizePagination(query = {}) {
    const page = Math.max(Number(query.page || DEFAULT_PAGE), 1);
    const limit = Math.min(Math.max(Number(query.limit || DEFAULT_LIMIT), 1), MAX_LIMIT);
    const offset = (page - 1) * limit;

    return { page, limit, offset };
}

function toIsoDate(value) {
    if (!value) return new Date().toISOString();
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return new Date().toISOString();
    return parsed.toISOString();
}

function mapServiceTypeToRideType(serviceType) {
    const normalized = Number(serviceType || 0);
    if (normalized === 1) return "RENTAL_CAR";
    if (normalized === 2 || normalized === 3) return "RENTAL_DRIVER";
    return "CALL_RIDE";
}

function mapRideTextToRideType(rideText = "") {
    const normalized = String(rideText).trim().toUpperCase();
    if (!normalized) return "CALL_RIDE";
    if (normalized.includes("DRIVER") || normalized.includes("TAI XE")) return "RENTAL_DRIVER";
    if (normalized.includes("RENTAL") || normalized.includes("THUE")) return "RENTAL_CAR";
    return "CALL_RIDE";
}

function mapBannerRideType(banner = {}) {
    const combinedText = `${banner?.title || ""} ${banner?.excerpt || ""} ${banner?.content || ""}`;
    return mapRideTextToRideType(combinedText);
}

function mapBannerItem(item) {
    return {
        id: String(item.id || ""),
        title: item.title || "",
        description: item.excerpt || item.content || "",
        imageUrl: item.feature_img || "",
        actionType: "BOOKING",
        rideType: mapBannerRideType(item),
    };
}

function mapPopularService(item) {
    const estimatedFromPrice = Math.max(
        Number(item.base_fare ?? item.minimum_fare ?? 0),
        0
    );

    return {
        id: String(item.id || ""),
        rideType: mapRideTextToRideType(item.ride_type),
        title: item.ride_type || "",
        description: item.ride_desc || "",
        estimatedFromPrice,
    };
}

function buildDiscountText(coupon) {
    const discountType = Number(coupon.discount_type || 0);
    const discountValue = Number(coupon.discount_value || 0);
    if (discountType === 0) {
        return `-${discountValue}%`;
    }

    const formatted = Number.isFinite(discountValue)
        ? discountValue.toLocaleString("vi-VN")
        : "0";
    return `-${formatted}đ`;
}

function mapFeaturedCoupon(item) {
    return {
        id: String(item.id || ""),
        code: item.coupon_code || "",
        title: item.coupon_title || "",
        description: `Áp dụng cho chuyến đi tại khu vực của bạn.`,
        discountText: buildDiscountText(item),
        expiresAt: toIsoDate(item.expiry_date),
    };
}

function assertCustomerAuth(auth) {
    if (!auth || Number(auth.userType) !== USER_TYPE.USER) {
        throw new AppError("Forbidden", 403, "FORBIDDEN");
    }
}

async function resolveCustomerContext(auth) {
    assertCustomerAuth(auth);

    const userId = Number(auth.userId);
    const context = await findCustomerContext(userId);

    if (!context) {
        throw new AppError("Customer account not found.", 404, "CUSTOMER_NOT_FOUND");
    }

    if (context.accountDeleted === 1 || context.accountActive !== 1) {
        throw new AppError("Customer account is inactive.", 403, "ACCOUNT_INACTIVE");
    }

    return context;
}

async function getCachedBanners(routeId) {
    const cacheKey = buildCacheKey("customer:banners", { routeId });
    const cached = getCachedValue(cacheKey);
    if (cached) return cached;

    const banners = await listActiveBanners(routeId);
    return setCachedValue(cacheKey, banners);
}

async function getCachedRoutes() {
    const cacheKey = buildCacheKey("customer:routes");
    const cached = getCachedValue(cacheKey);
    if (cached) return cached;

    const routes = await listRoutes();
    return setCachedValue(cacheKey, routes);
}

async function getCachedRides(routeId) {
    const cacheKey = buildCacheKey("customer:rides", { routeId });
    const cached = getCachedValue(cacheKey);
    if (cached) return cached;

    const rides = await listRidesWithTariffs(routeId);
    return setCachedValue(cacheKey, rides);
}

export function createCustomerHomeService(overrides = {}) {
    const resolveContextFn = overrides.resolveCustomerContext || resolveCustomerContext;
    const getCachedBannersFn = overrides.getCachedBanners || getCachedBanners;
    const getCachedRidesFn = overrides.getCachedRides || getCachedRides;
    const listQuickDestinationsFn =
        overrides.listQuickDestinationCandidatesByUser || listQuickDestinationCandidatesByUser;
    const listRecentRoutesFn = overrides.listRecentRoutesByUser || listRecentRoutesByUser;
    const findAvailableCouponsFn = overrides.findAvailableCouponsForCustomer || findAvailableCouponsForCustomer;

    return {
        getCustomerHome: async (auth, query = {}) => {
            const context = await resolveContextFn(auth);
            const routeId = Number(query.routeId || context.routeId || 0) || null;

            const [banners, rides, quickDestinationsRaw, recentRoutesRaw] = await Promise.all([
                getCachedBannersFn(routeId),
                getCachedRidesFn(routeId),
                listQuickDestinationsFn(context.userId, HOME_QUICK_DESTINATIONS_LIMIT),
                listRecentRoutesFn(context.userId, HOME_RECENT_ROUTES_LIMIT),
            ]);

            const coupons = await findAvailableCouponsFn({
                userId: context.userId,
                routeId,
                page: 1,
                limit: HOME_FEATURED_COUPONS_LIMIT,
                search: "",
                rideId: null,
            });

            const mappedBanners = Array.isArray(banners) ? banners.map(mapBannerItem) : [];

            const popularServices = Array.isArray(rides)
                ? rides.slice(0, HOME_POPULAR_SERVICES_LIMIT).map(mapPopularService)
                : [];

            const quickDestinations = Array.isArray(quickDestinationsRaw)
                ? quickDestinationsRaw.map((item, index) => ({
                      id: `quick_${index + 1}`,
                      label: `Địa điểm ${index + 1}`,
                      address: item.address || "",
                  }))
                : [];

            const recentRoutes = Array.isArray(recentRoutesRaw)
                ? recentRoutesRaw.slice(0, HOME_RECENT_ROUTES_LIMIT).map((item) => ({
                      id: String(item.id || ""),
                      pickupAddress: item.pickup_address || "",
                      destinationAddress: item.destination_address || "",
                      usedAt: toIsoDate(item.used_at),
                      rideType:
                          item.source_type === "rental"
                              ? mapServiceTypeToRideType(item.service_type)
                              : "CALL_RIDE",
                  }))
                : [];

            const featuredCoupons = Array.isArray(coupons.items)
                ? coupons.items.slice(0, HOME_FEATURED_COUPONS_LIMIT).map(mapFeaturedCoupon)
                : [];

            return {
                currentAddress: context.address || "",
                banners: mappedBanners,
                quickDestinations,
                recentRoutes,
                popularServices,
                featuredCoupons,
            };
        },
    };
}

const customerHomeService = createCustomerHomeService();

export async function getCustomerHome(auth, query = {}) {
    return customerHomeService.getCustomerHome(auth, query);
}

export async function getBanners(auth) {
    const context = await resolveCustomerContext(auth);
    const banners = await getCachedBanners(context.routeId);

    return {
        items: banners,
        totalItems: banners.length,
    };
}

export async function getRoutes(auth) {
    await resolveCustomerContext(auth);
    const routes = await getCachedRoutes();

    return {
        items: routes,
        totalItems: routes.length,
    };
}

export async function getRides(auth, query = {}) {
    const context = await resolveCustomerContext(auth);
    const routeId = Number(query.routeId || context.routeId || 0) || null;
    const rides = await getCachedRides(routeId);

    return {
        items: rides,
        totalItems: rides.length,
        routeId,
    };
}

export async function getAvailableCoupons(auth, query = {}) {
    const context = await resolveCustomerContext(auth);
    const { page, limit } = normalizePagination(query);
    const routeId = Number(query.routeId || context.routeId || 0) || null;

    const result = await findAvailableCouponsForCustomer({
        userId: context.userId,
        routeId,
        page,
        limit,
        search: String(query.search || "").trim(),
        rideId: query.rideId ? Number(query.rideId) : null,
    });

    const totalItems = await countAvailableCouponsForCustomer({
        userId: context.userId,
        routeId,
        search: String(query.search || "").trim(),
        rideId: query.rideId ? Number(query.rideId) : null,
    });

    const totalPages = totalItems === 0 ? 0 : Math.ceil(totalItems / limit);

    return {
        items: result.items,
        totalItems,
        pagination: {
            page,
            limit,
            totalPages,
            hasNextPage: totalPages > 0 && page < totalPages,
            hasPrevPage: page > 1,
        },
        filters: {
            routeId,
            rideId: query.rideId ? Number(query.rideId) : null,
            search: String(query.search || "").trim() || null,
        },
    };
}

export async function getNotifications(auth, query = {}) {
    const context = await resolveCustomerContext(auth);
    const { page, limit } = normalizePagination(query);

    const [items, totalItems] = await Promise.all([
        findNotificationsByUser(context.userId, { page, limit }),
        countUnreadNotifications(context.userId, { mode: "all" }),
    ]);

    const totalPages = totalItems === 0 ? 0 : Math.ceil(totalItems / limit);

    return {
        items,
        totalItems,
        pagination: {
            page,
            limit,
            totalPages,
            hasNextPage: totalPages > 0 && page < totalPages,
            hasPrevPage: page > 1,
        },
    };
}

export async function getNotificationUnreadCount(auth) {
    const context = await resolveCustomerContext(auth);
    const unreadCount = await countUnreadNotifications(context.userId, { mode: "unread" });

    return {
        unreadCount,
    };
}
