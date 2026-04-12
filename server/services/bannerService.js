import sqldb from "../config/sqldatabase.js";
import {
    countAdminBanners,
    findAdminBanners,
    findBannerAdminMeta,
    findBannerById,
    insertBanner,
    routeExists,
    updateBanner,
    updateBannerStatus,
} from "../repositories/bannerRepository.js";
import AppError from "../utils/appError.js";

const BANNER_VISIBILITY_VALUES = [0, 1, 2];
const BANNER_STATUS_VALUES = [0, 1];

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

    if (status !== null && !BANNER_STATUS_VALUES.includes(status)) {
        throw new AppError("Invalid status filter.", 422, "INVALID_STATUS_FILTER");
    }

    if (visibility !== null && !BANNER_VISIBILITY_VALUES.includes(visibility)) {
        throw new AppError("Invalid visibility filter.", 422, "INVALID_VISIBILITY_FILTER");
    }

    if (city !== null && city < 0) {
        throw new AppError("Invalid city filter.", 422, "INVALID_CITY_FILTER");
    }

    return {
        page,
        limit,
        search: normalizeText(query.search, { maxLength: 100, fallback: "" }) || "",
        status,
        visibility,
        city,
    };
}

function normalizeCreatePayload(payload = {}) {
    const title = normalizeText(payload.title, { maxLength: 255, fallback: null });
    const excerpt = normalizeText(payload.excerpt, { maxLength: 255, fallback: null });
    const content = normalizeText(payload.content, { fallback: null });
    const city = normalizeInt(payload.city, { fallback: 0 });
    const feature_img = normalizeText(payload.feature_img, { maxLength: 30, fallback: "" }) || "";
    const visibility = normalizeInt(payload.visibility, { fallback: 1 });
    const status = normalizeInt(payload.status, { fallback: 1 });

    if (!title) {
        throw new AppError("Banner title is required.", 422, "BANNER_TITLE_REQUIRED");
    }

    if (!excerpt) {
        throw new AppError("Banner excerpt is required.", 422, "BANNER_EXCERPT_REQUIRED");
    }

    if (!content) {
        throw new AppError("Banner content is required.", 422, "BANNER_CONTENT_REQUIRED");
    }

    if (!Number.isInteger(city) || city < 0) {
        throw new AppError("Invalid city.", 422, "INVALID_CITY");
    }

    if (!BANNER_VISIBILITY_VALUES.includes(visibility)) {
        throw new AppError("Invalid visibility.", 422, "INVALID_VISIBILITY");
    }

    if (!BANNER_STATUS_VALUES.includes(status)) {
        throw new AppError("Invalid status.", 422, "INVALID_STATUS");
    }

    return {
        title,
        excerpt,
        content,
        city,
        feature_img,
        visibility,
        status,
    };
}

function normalizeUpdatePayload(payload = {}, currentBanner) {
    return normalizeCreatePayload({
        title: payload.title ?? currentBanner.title,
        excerpt: payload.excerpt ?? currentBanner.excerpt,
        content: payload.content ?? currentBanner.content,
        city: payload.city ?? currentBanner.city,
        feature_img: payload.feature_img ?? currentBanner.feature_img,
        visibility: payload.visibility ?? currentBanner.visibility,
        status: payload.status ?? currentBanner.status,
    });
}

async function ensureRouteExists(cityId) {
    if (Number(cityId) === 0) return;
    const exists = await routeExists(cityId);
    if (!exists) {
        throw new AppError("City not found.", 422, "CITY_NOT_FOUND");
    }
}

function normalizeBannerId(bannerIdInput) {
    const bannerId = normalizeInt(bannerIdInput, { fallback: null });
    if (!bannerId || bannerId < 1) {
        throw new AppError("Invalid banner ID.", 422, "INVALID_BANNER_ID");
    }

    return bannerId;
}

export async function getBannerMetaByAdmin(auth) {
    assertAdmin(auth);
    return findBannerAdminMeta();
}

export async function getBannerListByAdmin(query, auth) {
    assertAdmin(auth);
    const filters = normalizeListFilters(query);

    const [items, totalItems] = await Promise.all([
        findAdminBanners(filters),
        countAdminBanners(filters),
    ]);

    const totalPages = totalItems === 0 ? 0 : Math.ceil(totalItems / filters.limit);

    return {
        items,
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

export async function getBannerDetailByAdmin(bannerIdInput, auth) {
    assertAdmin(auth);

    const bannerId = normalizeBannerId(bannerIdInput);
    const banner = await findBannerById(bannerId);
    if (!banner) {
        throw new AppError("Banner not found.", 404, "BANNER_NOT_FOUND");
    }

    return { banner };
}

export async function createBannerByAdmin(payload, auth) {
    assertAdmin(auth);

    const normalized = normalizeCreatePayload(payload);
    await ensureRouteExists(normalized.city);

    const connection = await sqldb.getConnection();
    try {
        await connection.beginTransaction();
        const bannerId = await insertBanner(normalized, connection);
        await connection.commit();
        return getBannerDetailByAdmin(bannerId, { accountType: 3 });
    } catch (error) {
        await connection.rollback();
        throw error;
    } finally {
        connection.release();
    }
}

export async function updateBannerByAdmin(bannerIdInput, payload, auth) {
    assertAdmin(auth);

    const bannerId = normalizeBannerId(bannerIdInput);
    const currentBanner = await findBannerById(bannerId);
    if (!currentBanner) {
        throw new AppError("Banner not found.", 404, "BANNER_NOT_FOUND");
    }

    const normalized = normalizeUpdatePayload(payload, currentBanner);
    await ensureRouteExists(normalized.city);

    const connection = await sqldb.getConnection();
    try {
        await connection.beginTransaction();
        await updateBanner(bannerId, normalized, connection);
        await connection.commit();
        return getBannerDetailByAdmin(bannerId, { accountType: 3 });
    } catch (error) {
        await connection.rollback();
        throw error;
    } finally {
        connection.release();
    }
}

export async function toggleBannerStatusByAdmin(bannerIdInput, payload, auth) {
    assertAdmin(auth);

    const bannerId = normalizeBannerId(bannerIdInput);
    const status = normalizeInt(payload?.status, { fallback: null });
    if (!BANNER_STATUS_VALUES.includes(status)) {
        throw new AppError("Status must be 0 or 1.", 422, "INVALID_STATUS");
    }

    const currentBanner = await findBannerById(bannerId);
    if (!currentBanner) {
        throw new AppError("Banner not found.", 404, "BANNER_NOT_FOUND");
    }

    await updateBannerStatus(bannerId, status);
    return getBannerDetailByAdmin(bannerId, { accountType: 3 });
}
