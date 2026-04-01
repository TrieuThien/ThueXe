import sqldb from "../config/sqldatabase.js";
import {
    countAdminCoupons,
    couponCodeExistsInCity,
    findActiveRideIds,
    findAdminCoupons,
    findAvailableCouponsForUser,
    findCouponAdminMeta,
    findCouponByCodeAndCity,
    findCouponByCodeAndCityForUpdate,
    findCouponById,
    getCouponTotalUsage,
    getUserCouponUsage,
    insertCoupon,
    routeExists,
    updateCoupon,
    updateCouponStatus,
    upsertCouponUsage,
} from "../repositories/couponRepository.js";
import AppError from "../utils/appError.js";

function assertAdmin(auth) {
    if (!auth || Number(auth.accountType) !== 3) {
        throw new AppError("You are not have permission to perform this action.", 403, "FORBIDDEN");
    }
}

function normalizeText(value, { maxLength = null, fallback = null } = {}) {
    if (value === undefined || value === null) return fallback;
    const text = String(value).trim();
    if (!text) return fallback;
    if (maxLength && text.length > maxLength) {
        return text.slice(0, maxLength);
    }
    return text;
}

function normalizeInt(value, { fallback = null } = {}) {
    if (value === undefined || value === null || value === "") return fallback;
    const parsed = Number(value);
    if (!Number.isInteger(parsed)) return fallback;
    return parsed;
}

function normalizeNumber(value, { fallback = 0, min = null } = {}) {
    if (value === undefined || value === null || value === "") return fallback;
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) {
        throw new AppError("Invalid number.", 422, "INVALID_NUMBER");
    }
    if (min !== null && parsed < min) {
        throw new AppError("Invalid number.", 422, "INVALID_NUMBER");
    }
    return parsed;
}

function normalizeCouponCode(value) {
    const text = normalizeText(value, { maxLength: 15 });
    if (!text) {
        throw new AppError("Coupon code is required.", 422, "COUPON_CODE_REQUIRED");
    }

    const normalized = text.toUpperCase();

    if (!/^[A-Z0-9_-]{3,15}$/.test(normalized)) {
        throw new AppError(
            "Coupon code can only contain uppercase letters, numbers, underscores, or hyphens (3-15 characters).",
            422,
            "INVALID_COUPON_CODE"
        );
    }

    return normalized;
}

function normalizeDateTime(value, fieldName) {
    const text = normalizeText(value);
    if (!text) {
        throw new AppError(`${fieldName} is required.`, 422, "DATE_REQUIRED");
    }

    const normalized = text.includes("T") ? text.replace("T", " ") : text;
    const mysqlDateTime = normalized.length === 10 ? `${normalized} 00:00:00` : normalized.slice(0, 19);
    const dateCheck = new Date(mysqlDateTime.replace(" ", "T"));

    if (Number.isNaN(dateCheck.getTime())) {
        throw new AppError(`${fieldName} is invalid.`, 422, "INVALID_DATE");
    }

    return mysqlDateTime;
}

function parseVehicleIds(vehiclesRaw) {
    if (vehiclesRaw === undefined || vehiclesRaw === null || vehiclesRaw === "") {
        return [];
    }

    const values = Array.isArray(vehiclesRaw)
        ? vehiclesRaw
        : String(vehiclesRaw)
            .split(",")
            .map((item) => item.trim())
            .filter(Boolean);

    const vehicleIds = values.map((item) => Number(item)).filter((item) => Number.isInteger(item) && item > 0);

    return [...new Set(vehicleIds)];
}

function serializeVehicleIds(vehicleIds) {
    if (!vehicleIds.length) return null;
    return vehicleIds.join(",");
}

function parseCouponVehicles(couponVehiclesText) {
    if (!couponVehiclesText) return [];

    return String(couponVehiclesText)
        .split(",")
        .map((item) => Number(item.trim()))
        .filter((item) => Number.isInteger(item) && item > 0);
}

function toDate(value) {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
}

function resolveVehicleId(rideId, vehicleId) {
    const ride = normalizeInt(rideId, { fallback: null });
    const vehicle = normalizeInt(vehicleId, { fallback: null });
    return ride || vehicle || null;
}

function normalizeListFilters(query = {}) {
    const page = Math.max(normalizeInt(query.page, { fallback: 1 }) || 1, 1);
    const limit = Math.min(Math.max(normalizeInt(query.limit, { fallback: 10 }) || 10, 1), 100);

    const status = query.status === undefined || query.status === null || query.status === ""
        ? null
        : normalizeInt(query.status, { fallback: null });
    const visibility = query.visibility === undefined || query.visibility === null || query.visibility === ""
        ? null
        : normalizeInt(query.visibility, { fallback: null });
    const city = query.city === undefined || query.city === null || query.city === ""
        ? null
        : normalizeInt(query.city, { fallback: null });

    if (status !== null && ![0, 1].includes(status)) {
        throw new AppError("Invalid status filter.", 422, "INVALID_STATUS_FILTER");
    }

    if (visibility !== null && ![0, 1].includes(visibility)) {
        throw new AppError("Invalid visibility filter.", 422, "INVALID_VISIBILITY_FILTER");
    }

    if (city !== null && city < 1) {
        throw new AppError("Invalid city filter.", 422, "INVALID_CITY_FILTER");
    }

    const activeFrom = query.activeFrom ? normalizeDateTime(query.activeFrom, "activeFrom") : null;
    const activeTo = query.activeTo ? normalizeDateTime(query.activeTo, "activeTo") : null;

    if (activeFrom && activeTo) {
        const fromDate = new Date(activeFrom.replace(" ", "T"));
        const toDate = new Date(activeTo.replace(" ", "T"));
        if (fromDate.getTime() > toDate.getTime()) {
            throw new AppError("Invalid date range.", 422, "INVALID_DATE_RANGE");
        }
    }

    return {
        page,
        limit,
        search: normalizeText(query.search, { maxLength: 100, fallback: "" }) || "",
        status,
        visibility,
        city,
        activeFrom,
        activeTo,
    };
}

function normalizeCreatePayload(payload = {}) {
    const coupon_code = normalizeCouponCode(payload.coupon_code);
    const coupon_title = normalizeText(payload.coupon_title, { maxLength: 255, fallback: null });
    const city = normalizeInt(payload.city, { fallback: null });
    const visibility = normalizeInt(payload.visibility, { fallback: 0 });
    const discount_type = normalizeInt(payload.discount_type, { fallback: 0 });
    const discount_value = normalizeNumber(payload.discount_value, { fallback: 0, min: 0 });
    const min_fare = normalizeNumber(payload.min_fare, { fallback: 0, min: 0 });
    const max_discount_amount = normalizeNumber(payload.max_discount_amount, { fallback: 0, min: 0 });
    const limit_count = normalizeInt(payload.limit_count, { fallback: 0 });
    const user_limit_count = normalizeInt(payload.user_limit_count, { fallback: 1 });
    const status = normalizeInt(payload.status, { fallback: 1 });
    const active_date = normalizeDateTime(payload.active_date, "Ngày bắt đầu");
    const expiry_date = normalizeDateTime(payload.expiry_date, "Ngày hết hạn");
    const vehicles = parseVehicleIds(payload.vehicles);

    if (!city || city < 1) {
        throw new AppError("Invalid city.", 422, "INVALID_CITY");
    }

    if (![0, 1].includes(visibility)) {
        throw new AppError("Invalid visibility.", 422, "INVALID_VISIBILITY");
    }

    if (![0, 1].includes(discount_type)) {
        throw new AppError("Invalid discount type.", 422, "INVALID_DISCOUNT_TYPE");
    }

    if (discount_value < 0) {
        throw new AppError("Invalid discount value.", 422, "INVALID_DISCOUNT_VALUE");
    }

    if (min_fare < 0) {
        throw new AppError("Invalid minimum fare.", 422, "INVALID_MIN_FARE");
    }

    if (max_discount_amount < 0) {
        throw new AppError("Invalid maximum discount amount.", 422, "INVALID_MAX_DISCOUNT");
    }

    if (!Number.isInteger(limit_count) || limit_count < 0) {
        throw new AppError("Invalid limit count.", 422, "INVALID_LIMIT_COUNT");
    }

    if (!Number.isInteger(user_limit_count) || user_limit_count < 0) {
        throw new AppError("Invalid user limit count.", 422, "INVALID_USER_LIMIT_COUNT");
    }

    if (![0, 1].includes(status)) {
        throw new AppError("Invalid status.", 422, "INVALID_STATUS");
    }

    const activeDateObj = new Date(active_date.replace(" ", "T"));
    const expiryDateObj = new Date(expiry_date.replace(" ", "T"));
    if (expiryDateObj.getTime() < activeDateObj.getTime()) {
        throw new AppError("Invalid date range.", 422, "INVALID_DATE_RANGE");
    }

    return {
        coupon_code,
        coupon_title,
        city,
        vehicles: serializeVehicleIds(vehicles),
        visibility,
        discount_type,
        discount_value,
        min_fare,
        max_discount_amount,
        limit_count,
        user_limit_count,
        status,
        active_date,
        expiry_date,
        vehicle_ids: vehicles,
    };
}

function normalizeUpdatePayload(payload = {}, currentCoupon) {
    const merged = {
        coupon_code: payload.coupon_code ?? currentCoupon.coupon_code,
        coupon_title: payload.coupon_title ?? currentCoupon.coupon_title,
        city: payload.city ?? currentCoupon.city,
        vehicles: payload.vehicles ?? currentCoupon.vehicles,
        visibility: payload.visibility ?? currentCoupon.visibility,
        discount_type: payload.discount_type ?? currentCoupon.discount_type,
        discount_value: payload.discount_value ?? currentCoupon.discount_value,
        min_fare: payload.min_fare ?? currentCoupon.min_fare,
        max_discount_amount: payload.max_discount_amount ?? currentCoupon.max_discount_amount,
        limit_count: payload.limit_count ?? currentCoupon.limit_count,
        user_limit_count: payload.user_limit_count ?? currentCoupon.user_limit_count,
        status: payload.status ?? currentCoupon.status,
        active_date: payload.active_date ?? currentCoupon.active_date,
        expiry_date: payload.expiry_date ?? currentCoupon.expiry_date,
    };

    return normalizeCreatePayload(merged);
}

function calculateDiscountAmount(coupon, fare) {
    const fareValue = Number(fare);
    let discountAmount = 0;

    if (Number(coupon.discount_type) === 0) {
        discountAmount = (fareValue * Number(coupon.discount_value || 0)) / 100;
        const maxDiscount = Number(coupon.max_discount_amount || 0);
        if (maxDiscount > 0) {
            discountAmount = Math.min(discountAmount, maxDiscount);
        }
    } else {
        discountAmount = Number(coupon.discount_value || 0);
    }

    discountAmount = Math.max(0, discountAmount);
    discountAmount = Math.min(discountAmount, fareValue);

    return Number(discountAmount.toFixed(2));
}

function buildBookingCouponPayload(coupon) {
    return {
        coupon_code: coupon.coupon_code,
        coupon_discount_type: Number(coupon.discount_type),
        coupon_discount_value: Number(coupon.discount_value),
        coupon_min_fare: Number(coupon.min_fare),
        coupon_max_discount: Number(coupon.max_discount_amount),
    };
}

function validateCouponEligibility(coupon, { fare, cityId, vehicleId }) {
    if (!coupon) {
        return { valid: false, message: "Coupon not found." };
    }

    if (Number(coupon.status) !== 1) {
        return { valid: false, message: "Coupon is currently disabled." };
    }

    const now = new Date();
    const activeDate = toDate(coupon.active_date);
    const expiryDate = toDate(coupon.expiry_date);

    if (!activeDate || !expiryDate) {
        return { valid: false, message: "Coupon has an invalid validity period." };
    }

    if (now.getTime() < activeDate.getTime()) {
        return { valid: false, message: "Coupon is not yet valid." };
    }

    if (now.getTime() > expiryDate.getTime()) {
        return { valid: false, message: "Coupon has expired." };
    }

    if (Number(coupon.city) !== Number(cityId)) {
        return { valid: false, message: "Coupon is not applicable for this area." };
    }

    const couponVehicles = parseCouponVehicles(coupon.vehicles);
    if (couponVehicles.length && (!vehicleId || !couponVehicles.includes(Number(vehicleId)))) {
        return { valid: false, message: "Coupon is not applicable for the selected vehicle type." };
    }

    if (Number(fare) < Number(coupon.min_fare || 0)) {
        return {
            valid: false,
            message: `Booking fare must be at least ${Number(coupon.min_fare || 0).toLocaleString("vi-VN")} to use this coupon.`,
        };
    }

    if (Number(coupon.limit_count) > 0 && Number(coupon.total_used || 0) >= Number(coupon.limit_count)) {
        return { valid: false, message: "Coupon has reached its usage limit." };
    }

    if (
        Number(coupon.user_limit_count) > 0 &&
        Number(coupon.user_used || 0) >= Number(coupon.user_limit_count)
    ) {
        return { valid: false, message: "You have used all available uses for this coupon." };
    }

    const discountAmount = calculateDiscountAmount(coupon, fare);
    const finalFare = Number((Number(fare) - discountAmount).toFixed(2));

    return {
        valid: true,
        message: "Coupon applied successfully.",
        discountAmount,
        finalFare,
        bookingCouponPayload: buildBookingCouponPayload(coupon),
    };
}

async function ensureRouteExists(cityId) {
    const exists = await routeExists(cityId);
    if (!exists) {
        throw new AppError("City not found.", 422, "CITY_NOT_FOUND");
    }
}

async function ensureVehicleIdsValid(vehicleIds) {
    if (!vehicleIds.length) return;
    const activeRideIds = await findActiveRideIds();
    const invalidId = vehicleIds.find((id) => !activeRideIds.has(id));
    if (invalidId) {
        throw new AppError(`Invalid vehicle ID: #${invalidId}.`, 422, "INVALID_VEHICLE_ID");
    }
}

export async function getCouponMetaByAdmin(auth) {
    assertAdmin(auth);
    return findCouponAdminMeta();
}

export async function getCouponListByAdmin(query, auth) {
    assertAdmin(auth);
    const filters = normalizeListFilters(query);

    const [items, totalItems] = await Promise.all([
        findAdminCoupons(filters),
        countAdminCoupons(filters),
    ]);

    const totalPages = totalItems === 0 ? 0 : Math.ceil(totalItems / filters.limit);

    return {
        items: items.map((item) => ({
            ...item,
            vehicle_ids: parseCouponVehicles(item.vehicles),
        })),
        pagination: {
            page: filters.page,
            limit: filters.limit,
            totalPages,
            hasNextPage: totalPages > 0 && filters.page < totalPages,
            hasPrevPage: filters.page > 1,
        },
        filters,
        totalItems,
    };
}

export async function getCouponDetailByAdmin(couponIdInput, auth) {
    assertAdmin(auth);

    const couponId = normalizeInt(couponIdInput, { fallback: null });
    if (!couponId || couponId < 1) {
        throw new AppError("Invalid coupon ID.", 422, "INVALID_COUPON_ID");
    }

    const coupon = await findCouponById(couponId);
    if (!coupon) {
        throw new AppError("Coupon not found.", 404, "COUPON_NOT_FOUND");
    }

    return {
        coupon: {
            ...coupon,
            vehicle_ids: parseCouponVehicles(coupon.vehicles),
        },
    };
}

export async function createCouponByAdmin(payload, auth) {
    assertAdmin(auth);

    const normalized = normalizeCreatePayload(payload);
    await ensureRouteExists(normalized.city);
    await ensureVehicleIdsValid(normalized.vehicle_ids);

    const isDuplicate = await couponCodeExistsInCity(normalized.coupon_code, normalized.city);
    if (isDuplicate) {
        throw new AppError("Coupon code already exists in this city.", 409, "COUPON_CODE_DUPLICATE");
    }

    const connection = await sqldb.getConnection();

    try {
        await connection.beginTransaction();
        const couponId = await insertCoupon(normalized, connection);
        await connection.commit();
        return getCouponDetailByAdmin(couponId, { accountType: 3 });
    } catch (error) {
        await connection.rollback();
        throw error;
    } finally {
        connection.release();
    }
}

export async function updateCouponByAdmin(couponIdInput, payload, auth) {
    assertAdmin(auth);

    const couponId = normalizeInt(couponIdInput, { fallback: null });
    if (!couponId || couponId < 1) {
        throw new AppError("Invalid coupon ID.", 422, "INVALID_COUPON_ID");
    }

    const currentCoupon = await findCouponById(couponId);
    if (!currentCoupon) {
        throw new AppError("Coupon not found.", 404, "COUPON_NOT_FOUND");
    }

    const normalized = normalizeUpdatePayload(payload, currentCoupon);
    await ensureRouteExists(normalized.city);
    await ensureVehicleIdsValid(normalized.vehicle_ids);

    const isDuplicate = await couponCodeExistsInCity(normalized.coupon_code, normalized.city, couponId);
    if (isDuplicate) {
        throw new AppError("Coupon code already exists in this city.", 409, "COUPON_CODE_DUPLICATE");
    }

    const connection = await sqldb.getConnection();

    try {
        await connection.beginTransaction();
        await updateCoupon(couponId, normalized, connection);
        await connection.commit();
        return getCouponDetailByAdmin(couponId, { accountType: 3 });
    } catch (error) {
        await connection.rollback();
        throw error;
    } finally {
        connection.release();
    }
}

export async function toggleCouponStatusByAdmin(couponIdInput, payload, auth) {
    assertAdmin(auth);

    const couponId = normalizeInt(couponIdInput, { fallback: null });
    if (!couponId || couponId < 1) {
        throw new AppError("Invalid coupon ID.", 422, "INVALID_COUPON_ID");
    }

    const status = normalizeInt(payload?.status, { fallback: null });
    if (![0, 1].includes(status)) {
        throw new AppError("Status must be 0 or 1.", 422, "INVALID_STATUS");
    }

    const currentCoupon = await findCouponById(couponId);
    if (!currentCoupon) {
        throw new AppError("Coupon not found.", 404, "COUPON_NOT_FOUND");
    }

    await updateCouponStatus(couponId, status);
    return getCouponDetailByAdmin(couponId, { accountType: 3 });
}

export async function getAvailableCouponsForUser(query, auth) {
    if (!auth?.userId) {
        throw new AppError("Account is not logged in.", 401, "UNAUTHORIZED");
    }

    const cityId = normalizeInt(query.cityId, { fallback: null });
    const fare = normalizeNumber(query.fare, { fallback: null, min: 0 });
    const vehicleId = resolveVehicleId(query.rideId, query.vehicleId);

    if (!cityId || cityId < 1) {
        throw new AppError("Invalid city ID.", 422, "INVALID_CITY_ID");
    }

    if (fare === null) {
        throw new AppError("Invalid fare.", 422, "INVALID_FARE");
    }

    if (!vehicleId) {
        throw new AppError("Invalid ride ID or vehicle ID.", 422, "INVALID_VEHICLE_ID");
    }

    const coupons = await findAvailableCouponsForUser({
        cityId,
        userId: Number(auth.userId),
    });

    const validCoupons = coupons
        .map((coupon) => {
            const evaluation = validateCouponEligibility(coupon, {
                fare,
                cityId,
                vehicleId,
            });

            if (!evaluation.valid) return null;

            return {
                ...coupon,
                vehicle_ids: parseCouponVehicles(coupon.vehicles),
                discount_amount: evaluation.discountAmount,
                final_fare: evaluation.finalFare,
                rule_text: `Minimum order ${Number(coupon.min_fare).toLocaleString("vi-VN")} • ${Number(coupon.discount_type) === 0
                    ? `Save ${Number(coupon.discount_value)}%${Number(coupon.max_discount_amount) > 0
                        ? ` (maximum ${Number(coupon.max_discount_amount).toLocaleString("vi-VN")})`
                        : ""
                    }`
                    : `Save ${Number(coupon.discount_value).toLocaleString("vi-VN")}`
                    }`,
            };
        })
        .filter(Boolean);

    return {
        items: validCoupons,
        totalItems: validCoupons.length,
        context: {
            cityId,
            vehicleId,
            fare: Number(fare),
        },
    };
}

export async function validateCouponForUser(payload, auth) {
    if (!auth?.userId) {
        throw new AppError("Bạn chưa đăng nhập.", 401, "UNAUTHORIZED");
    }

    const couponCode = normalizeCouponCode(payload.couponCode);
    const cityId = normalizeInt(payload.cityId, { fallback: null });
    const fare = normalizeNumber(payload.fare, { fallback: null, min: 0 });
    const vehicleId = resolveVehicleId(payload.rideId, payload.vehicleId);

    if (!cityId || cityId < 1) {
        throw new AppError("Invalid city ID.", 422, "INVALID_CITY_ID");
    }
    if (fare === null) {
        throw new AppError("Invalid fare.", 422, "INVALID_FARE");
    }
    if (!vehicleId) {
        throw new AppError("Invalid ride ID or vehicle ID.", 422, "INVALID_VEHICLE_ID");
    }

    const coupon = await findCouponByCodeAndCity(couponCode, cityId, Number(auth.userId));
    const evaluation = validateCouponEligibility(coupon, {
        fare,
        cityId,
        vehicleId,
    });

    if (!evaluation.valid) {
        return {
            valid: false,
            message: evaluation.message,
            discountAmount: 0,
            finalFare: Number(fare),
            coupon: coupon
                ? {
                    id: coupon.id,
                    coupon_code: coupon.coupon_code,
                    coupon_title: coupon.coupon_title,
                    city: coupon.city,
                    vehicle_ids: parseCouponVehicles(coupon.vehicles),
                }
                : null,
        };
    }

    return {
        valid: true,
        message: evaluation.message,
        discountAmount: evaluation.discountAmount,
        finalFare: evaluation.finalFare,
        coupon: {
            id: coupon.id,
            coupon_code: coupon.coupon_code,
            coupon_title: coupon.coupon_title,
            city: coupon.city,
            visibility: coupon.visibility,
            discount_type: coupon.discount_type,
            discount_value: coupon.discount_value,
            min_fare: coupon.min_fare,
            max_discount_amount: coupon.max_discount_amount,
            vehicle_ids: parseCouponVehicles(coupon.vehicles),
            active_date: coupon.active_date,
            expiry_date: coupon.expiry_date,
        },
        bookingCouponPayload: evaluation.bookingCouponPayload,
    };
}

export async function applyCouponForUser(payload, auth) {
    if (!auth?.userId) {
        throw new AppError("Account is not logged in.", 401, "UNAUTHORIZED");
    }

    const couponCode = normalizeCouponCode(payload.couponCode);
    const cityId = normalizeInt(payload.cityId, { fallback: null });
    const fare = normalizeNumber(payload.fare, { fallback: null, min: 0 });
    const vehicleId = resolveVehicleId(payload.rideId, payload.vehicleId);

    if (!cityId || cityId < 1) {
        throw new AppError("Invalid city ID.", 422, "INVALID_CITY_ID");
    }
    if (fare === null) {
        throw new AppError("Invalid fare.", 422, "INVALID_FARE");
    }
    if (!vehicleId) {
        throw new AppError("Invalid ride ID or vehicle ID.", 422, "INVALID_VEHICLE_ID");
    }

    const connection = await sqldb.getConnection();
    const userId = Number(auth.userId);

    try {
        await connection.beginTransaction();

        const coupon = await findCouponByCodeAndCityForUpdate(couponCode, cityId, connection);
        if (!coupon) {
            throw new AppError("Coupon not found.", 404, "COUPON_NOT_FOUND");
        }

        coupon.total_used = await getCouponTotalUsage(coupon.id, connection);
        coupon.user_used = await getUserCouponUsage(coupon.id, userId, connection);

        const evaluation = validateCouponEligibility(coupon, {
            fare,
            cityId,
            vehicleId,
        });

        if (!evaluation.valid) {
            throw new AppError(evaluation.message, 422, "COUPON_NOT_APPLICABLE");
        }

        const usage = await upsertCouponUsage(coupon.id, userId, connection);
        await connection.commit();

        return {
            applied: true,
            message: "Coupon applied successfully.",
            discountAmount: evaluation.discountAmount,
            finalFare: evaluation.finalFare,
            coupon: {
                id: coupon.id,
                coupon_code: coupon.coupon_code,
                coupon_title: coupon.coupon_title,
                city: coupon.city,
                discount_type: coupon.discount_type,
                discount_value: coupon.discount_value,
                min_fare: coupon.min_fare,
                max_discount_amount: coupon.max_discount_amount,
                vehicle_ids: parseCouponVehicles(coupon.vehicles),
            },
            bookingCouponPayload: evaluation.bookingCouponPayload,
            usage: {
                user_id: userId,
                coupon_id: coupon.id,
                times_used: usage.times_used,
            },
        };
    } catch (error) {
        await connection.rollback();
        throw error;
    } finally {
        connection.release();
    }
}

