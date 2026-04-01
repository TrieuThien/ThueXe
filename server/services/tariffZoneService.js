import sqldb from "../config/sqldatabase.js";
import AppError from "../utils/appError.js";
import {
    cityRouteExists,
    countTariffRoutes,
    countZones,
    currencyExists,
    findActiveRides,
    findCityRoutes,
    findCurrencies,
    findRouteById,
    findTariffRoutes,
    findTariffsByRouteId,
    findZoneById,
    findZoneList,
    insertRideTariff,
    insertRoute,
    insertZone,
    rideExists,
    routeTitleExists,
    updateRideTariffById,
    updateRoute,
    updateZone,
} from "../repositories/tariffZoneRepository.js";

const TARIFF_NUMERIC_FIELDS = [
    "cost_per_km",
    "cost_per_minute",
    "wait_time",
    "wait_cost_per_minute",
    "pickup_cost",
    "drop_off_cost",
    "cancel_cost",
    "init_distance",
    "init_distance_n",
    "ncost_per_km",
    "ncost_per_minute",
    "nwait_time",
    "nwait_cost_per_minute",
    "npickup_cost",
    "ndrop_off_cost",
    "ncancel_cost",
    "hr_cph",
    "hr_dist",
    "nhr_cph",
    "nhr_dist",
    "pp_charge_value",
];

function assertAdmin(auth) {
    if (!auth || auth.role !== "admin") {
        throw new AppError("You are not authorized to perform this action.", 403, "FORBIDDEN");
    }
}

function normalizeText(value, { maxLength = null, fallback = null } = {}) {
    if (value === undefined || value === null) return fallback;
    const text = String(value).trim();
    if (!text) return fallback;
    if (maxLength && text.length > maxLength) return text.slice(0, maxLength);
    return text;
}

function normalizeInt(value, { fallback = null } = {}) {
    if (value === undefined || value === null || value === "") return fallback;
    const num = Number(value);
    if (!Number.isInteger(num)) return fallback;
    return num;
}

function normalizeNonNegativeNumber(value, { fallback = 0 } = {}) {
    if (value === undefined || value === null || value === "") return fallback;
    const num = Number(value);
    if (!Number.isFinite(num) || num < 0) {
        throw new AppError("Invalid number.", 422, "INVALID_NUMBER");
    }
    return num;
}

function normalizeBooleanFlag(value, defaultValue = 0) {
    if (value === undefined || value === null || value === "") return defaultValue;
    if (typeof value === "boolean") return value ? 1 : 0;
    const normalized = String(value).trim().toLowerCase();
    if (["1", "true", "yes", "on"].includes(normalized)) return 1;
    if (["0", "false", "no", "off"].includes(normalized)) return 0;
    return defaultValue;
}

function isValidLatLng(lat, lng) {
    const latNum = Number(lat);
    const lngNum = Number(lng);
    return Number.isFinite(latNum) && Number.isFinite(lngNum) && latNum >= -90 && latNum <= 90 && lngNum >= -180 && lngNum <= 180;
}

function normalizePolygon(rawValue, fieldName) {
    if (rawValue === undefined || rawValue === null || rawValue === "") {
        return null;
    }

    let payload = rawValue;
    if (typeof rawValue === "string") {
        try {
            payload = JSON.parse(rawValue);
        } catch {
            throw new AppError(`${fieldName} is not valid JSON.`, 422, "INVALID_POLYGON_JSON");
        }
    }
    const coords = Array.isArray(payload?.coords) ? payload.coords : null;

    if (!coords || coords.length < 3) {
        throw new AppError(`${fieldName} is not valid. A polygon requires at least 3 points.`, 422, "INVALID_POLYGON");
    }

    const normalizedCoords = coords.map((point) => {
        const lat = Number(point?.lat);
        const lng = Number(point?.lng);

        if (!isValidLatLng(lat, lng)) {
            throw new AppError(`${fieldName} contains invalid coordinates.`, 422, "INVALID_COORDINATE");
        }

        return { lat, lng };
    });

    const centerLat = Number(payload?.center?.lat);
    const centerLng = Number(payload?.center?.lng);
    const hasCenter = Number.isFinite(centerLat) && Number.isFinite(centerLng);
    const radiusNum = Number(payload?.radius);

    const sanitized = {
        coords: normalizedCoords,
        center: hasCenter
            ? {
                lat: centerLat,
                lng: centerLng,
            }
            : undefined,
        radius: Number.isFinite(radiusNum) && radiusNum >= 0 ? radiusNum : undefined,
    };

    return JSON.stringify(sanitized);
}

function toRad(value) {
    return (value * Math.PI) / 180;
}

function haversineDistanceKm(pointA, pointB) {
    const earthRadiusKm = 6371;
    const dLat = toRad(pointB.lat - pointA.lat);
    const dLng = toRad(pointB.lng - pointA.lng);
    const lat1 = toRad(pointA.lat);
    const lat2 = toRad(pointB.lat);

    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.sin(dLng / 2) * Math.sin(dLng / 2) * Math.cos(lat1) * Math.cos(lat2);

    return earthRadiusKm * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function estimateRadiusKmFromPolygon(polygonJson) {
    if (!polygonJson) return 0;

    const parsed = JSON.parse(polygonJson);
    const coords = parsed?.coords;
    const center = parsed?.center;

    if (!Array.isArray(coords) || coords.length === 0) return 0;

    const fallbackCenter = coords.reduce(
        (acc, point) => ({ lat: acc.lat + Number(point.lat), lng: acc.lng + Number(point.lng) }),
        { lat: 0, lng: 0 }
    );

    const centerPoint = center && isValidLatLng(center.lat, center.lng)
        ? { lat: Number(center.lat), lng: Number(center.lng) }
        : { lat: fallbackCenter.lat / coords.length, lng: fallbackCenter.lng / coords.length };

    const maxDistanceKm = coords.reduce((maxDistance, point) => {
        const distanceKm = haversineDistanceKm(centerPoint, {
            lat: Number(point.lat),
            lng: Number(point.lng),
        });

        return Math.max(maxDistance, distanceKm);
    }, 0);

    return Number(maxDistanceKm.toFixed(1));
}

function normalizeRoutePayload(rawRoute, { isUpdate = false } = {}) {
    const rTitle = normalizeText(rawRoute?.r_title, { maxLength: 255 });
    if (!rTitle) {
        throw new AppError("Service area title is required.", 422, "ROUTE_TITLE_REQUIRED");
    }

    const rScope = normalizeInt(rawRoute?.r_scope, { fallback: 0 });
    if (![0, 1].includes(rScope)) {
        throw new AppError("Invalid route scope.", 422, "INVALID_ROUTE_SCOPE");
    }

    const distUnit = normalizeInt(rawRoute?.dist_unit, { fallback: 0 });
    if (![0, 1].includes(distUnit)) {
        throw new AppError("Invalid distance unit.", 422, "INVALID_DIST_UNIT");
    }

    const cityCurrencyId = normalizeInt(rawRoute?.city_currency_id, { fallback: null });
    if (!cityCurrencyId || cityCurrencyId < 1) {
        throw new AppError("Currency is required.", 422, "CURRENCY_REQUIRED");
    }

    const payload = {
        r_title: rTitle,
        c_name: normalizeText(rawRoute?.c_name, { maxLength: 255, fallback: "" }),
        pickup_city_id: normalizeInt(rawRoute?.pickup_city_id, { fallback: 0 }),
        pick_name: normalizeText(rawRoute?.pick_name, { maxLength: 255, fallback: "" }),
        drop_name: normalizeText(rawRoute?.drop_name, { maxLength: 255, fallback: "" }),
        r_scope: rScope,
        lng: normalizeText(rawRoute?.lng, { maxLength: 30, fallback: "" }),
        lat: normalizeText(rawRoute?.lat, { maxLength: 30, fallback: "" }),
        pick_lng: normalizeText(rawRoute?.pick_lng, { maxLength: 30, fallback: "" }),
        pick_lat: normalizeText(rawRoute?.pick_lat, { maxLength: 30, fallback: "" }),
        drop_lng: normalizeText(rawRoute?.drop_lng, { maxLength: 30, fallback: "" }),
        drop_lat: normalizeText(rawRoute?.drop_lat, { maxLength: 30, fallback: "" }),
        city_bound_coords: null,
        dist_unit: distUnit,
        city_radius: 0,
        city_currency_id: cityCurrencyId,
    };

    if (rScope === 0) {
        if (!payload.c_name) {
            throw new AppError("City name is required for intra-city routes.", 422, "CITY_NAME_REQUIRED");
        }

        if (!isValidLatLng(payload.lat, payload.lng)) {
            throw new AppError("Invalid city center coordinates.", 422, "INVALID_CITY_CENTER");
        }

        payload.city_bound_coords = normalizePolygon(rawRoute?.city_bound_coords, "City boundary coordinates");

        if (!payload.city_bound_coords) {
            throw new AppError("You should draw a polygon for the city boundary.", 422, "CITY_POLYGON_REQUIRED");
        }

        payload.city_radius = estimateRadiusKmFromPolygon(payload.city_bound_coords);
        payload.pickup_city_id = 0;
        payload.pick_name = "";
        payload.drop_name = "";
        payload.pick_lng = "";
        payload.pick_lat = "";
        payload.drop_lng = "";
        payload.drop_lat = "";
    } else {
        if (!payload.pick_name || !payload.drop_name) {
            throw new AppError("Pickup and drop-off points are required for inter-city routes.", 422, "STATE_POINTS_REQUIRED");
        }

        if (!payload.pickup_city_id || payload.pickup_city_id < 1) {
            throw new AppError("Pickup city is required for inter-city routes.", 422, "PICKUP_CITY_REQUIRED");
        }

        if (!isValidLatLng(payload.pick_lat, payload.pick_lng) || !isValidLatLng(payload.drop_lat, payload.drop_lng)) {
            throw new AppError("Invalid pickup or drop-off coordinates.", 422, "INVALID_PICK_DROP_COORDS");
        }

        payload.city_bound_coords = null;
        payload.city_radius = normalizeNonNegativeNumber(rawRoute?.city_radius, { fallback: 0 });
    }

    if (isUpdate && rawRoute?.id !== undefined) {
        payload.id = normalizeInt(rawRoute.id, { fallback: null });
    }

    return payload;
}

function normalizeTariffItem(rawItem, routeId = null) {
    const rideId = normalizeInt(rawItem?.ride_id, { fallback: null });
    if (!rideId || rideId < 1) {
        throw new AppError("Invalid ride in tariff.", 422, "INVALID_RIDE_ID");
    }

    const ppStartRaw = rawItem?.pp_start;
    const ppEndRaw = rawItem?.pp_end;
    const ppStart = ppStartRaw === null || ppStartRaw === "" || ppStartRaw === undefined
        ? null
        : normalizeInt(ppStartRaw, { fallback: null });
    const ppEnd = ppEndRaw === null || ppEndRaw === "" || ppEndRaw === undefined
        ? null
        : normalizeInt(ppEndRaw, { fallback: null });

    if (ppStart !== null && (ppStart < 0 || ppStart > 23)) {
        throw new AppError("Invalid start time for peak hours.", 422, "INVALID_PP_START");
    }

    if (ppEnd !== null && (ppEnd < 0 || ppEnd > 23)) {
        throw new AppError("Invalid end time for peak hours.", 422, "INVALID_PP_END");
    }

    const waitTime = normalizeInt(rawItem?.wait_time, { fallback: 0 });
    const nwaitTime = normalizeInt(rawItem?.nwait_time, { fallback: 0 });

    if (waitTime < 0 || nwaitTime < 0) {
        throw new AppError("Invalid wait time.", 422, "INVALID_WAIT_TIME");
    }

    const ppChargeType = normalizeInt(rawItem?.pp_charge_type, { fallback: 0 });
    if (![0, 1].includes(ppChargeType)) {
        throw new AppError("Invalid peak hour charge type.", 422, "INVALID_PP_CHARGE_TYPE");
    }

    const normalized = {
        id: normalizeInt(rawItem?.id, { fallback: null }),
        ride_id: rideId,
        routes_id: routeId,
        wait_time: waitTime,
        nwait_time: nwaitTime,
        cfare_enabled: normalizeBooleanFlag(rawItem?.cfare_enabled, 0),
        rshare_enabled: normalizeBooleanFlag(rawItem?.rshare_enabled, 0),
        hr_enabled: normalizeBooleanFlag(rawItem?.hr_enabled, 0),
        pp_enabled: normalizeBooleanFlag(rawItem?.pp_enabled, 0),
        pp_start: ppStart,
        pp_end: ppEnd,
        pp_charge_type: ppChargeType,
        pp_active_days: normalizeText(rawItem?.pp_active_days, { maxLength: 50, fallback: "" }) || "",
        alt_cars: normalizeText(rawItem?.alt_cars, { maxLength: 50, fallback: null }),
    };

    for (const field of TARIFF_NUMERIC_FIELDS) {
        normalized[field] = normalizeNonNegativeNumber(rawItem?.[field], { fallback: 0 });
    }

    return normalized;
}

function normalizeTariffPayload(rawTariffs, routeId = null) {
    if (!Array.isArray(rawTariffs) || rawTariffs.length === 0) {
        throw new AppError("You must configure at least 1 ride type for the tariff.", 422, "TARIFFS_REQUIRED");
    }

    const normalized = rawTariffs.map((item) => normalizeTariffItem(item, routeId));

    const rideIds = normalized.map((item) => item.ride_id);
    if (new Set(rideIds).size !== rideIds.length) {
        throw new AppError("Each ride type can only be configured once in the same route.", 422, "DUPLICATE_RIDE_TARIFF");
    }

    return normalized;
}

function normalizePagination(query = {}) {
    const page = Math.max(normalizeInt(query.page, { fallback: 1 }) || 1, 1);
    const limit = Math.min(Math.max(normalizeInt(query.limit, { fallback: 10 }) || 10, 1), 100);

    return {
        page,
        limit,
        search: normalizeText(query.search, { maxLength: 100, fallback: "" }) || "",
    };
}

async function validateRouteAndTariffs(routePayload, tariffs, { excludeRouteId = null } = {}) {
    const [titleExists, hasCurrency, rideChecks] = await Promise.all([
        routeTitleExists(routePayload.r_title, excludeRouteId),
        currencyExists(routePayload.city_currency_id),
        Promise.all(tariffs.map((item) => rideExists(item.ride_id))),
    ]);

    if (titleExists) {
        throw new AppError("Service area name already exists.", 409, "ROUTE_TITLE_EXISTS");
    }

    if (!hasCurrency) {
        throw new AppError("Selected currency does not exist.", 422, "CURRENCY_NOT_FOUND");
    }

    const invalidRideIndex = rideChecks.findIndex((found) => !found);
    if (invalidRideIndex !== -1) {
        throw new AppError("Invalid ride type in tariff.", 422, "RIDE_NOT_FOUND");
    }

    if (routePayload.r_scope === 1) {
        const pickupCityFound = await cityRouteExists(routePayload.pickup_city_id);
        if (!pickupCityFound) {
            throw new AppError("Invalid pickup city.", 422, "PICKUP_CITY_NOT_FOUND");
        }
    }
}

export async function getTariffMetaByAdmin(auth) {
    assertAdmin(auth);

    const [rides, currencies, cityRoutes] = await Promise.all([
        findActiveRides(),
        findCurrencies(),
        findCityRoutes(),
    ]);

    return { rides, currencies, cityRoutes };
}

export async function getTariffListByAdmin(query, auth) {
    assertAdmin(auth);

    const filters = normalizePagination(query);
    const [items, totalItems] = await Promise.all([
        findTariffRoutes(filters),
        countTariffRoutes(filters),
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
        totalItems,
        filters,
    };
}

export async function getTariffDetailByAdmin(routeIdInput, auth) {
    assertAdmin(auth);

    const routeId = normalizeInt(routeIdInput, { fallback: null });
    if (!routeId || routeId < 1) {
        throw new AppError("Invalid route ID.", 422, "INVALID_ROUTE_ID");
    }

    const [route, tariffs, rides] = await Promise.all([
        findRouteById(routeId),
        findTariffsByRouteId(routeId),
        findActiveRides(),
    ]);

    if (!route) {
        throw new AppError("Route not found.", 404, "ROUTE_NOT_FOUND");
    }

    return { route, tariffs, rides };
}

export async function createTariffByAdmin(payload, auth) {
    assertAdmin(auth);

    const routePayload = normalizeRoutePayload(payload?.route || {});
    const tariffsPayload = normalizeTariffPayload(payload?.tariffs || []);

    await validateRouteAndTariffs(routePayload, tariffsPayload);

    const connection = await sqldb.getConnection();

    try {
        await connection.beginTransaction();

        const routeId = await insertRoute(routePayload, connection);

        for (const item of tariffsPayload) {
            await insertRideTariff(
                {
                    ...item,
                    routes_id: routeId,
                },
                connection
            );
        }

        await connection.commit();

        return getTariffDetailByAdmin(routeId, { role: "admin" });
    } catch (error) {
        await connection.rollback();
        throw error;
    } finally {
        connection.release();
    }
}

export async function updateTariffByAdmin(routeIdInput, payload, auth) {
    assertAdmin(auth);

    const routeId = normalizeInt(routeIdInput, { fallback: null });
    if (!routeId || routeId < 1) {
        throw new AppError("Invalid route ID.", 422, "INVALID_ROUTE_ID");
    }

    const existingRoute = await findRouteById(routeId);
    if (!existingRoute) {
        throw new AppError("Route not found.", 404, "ROUTE_NOT_FOUND");
    }

    const routePayload = normalizeRoutePayload(payload?.route || {}, { isUpdate: true });
    const tariffsPayload = normalizeTariffPayload(payload?.tariffs || [], routeId);

    await validateRouteAndTariffs(routePayload, tariffsPayload, { excludeRouteId: routeId });

    const existingTariffs = await findTariffsByRouteId(routeId);
    const existingTariffMap = new Map(existingTariffs.map((item) => [item.id, item]));

    const connection = await sqldb.getConnection();

    try {
        await connection.beginTransaction();

        await updateRoute(routeId, routePayload, connection);

        for (const item of tariffsPayload) {
            if (item.id && existingTariffMap.has(item.id)) {
                await updateRideTariffById(item.id, item, connection);
            } else {
                await insertRideTariff(
                    {
                        ...item,
                        routes_id: routeId,
                    },
                    connection
                );
            }
        }

        await connection.commit();

        return getTariffDetailByAdmin(routeId, { role: "admin" });
    } catch (error) {
        await connection.rollback();
        throw error;
    } finally {
        connection.release();
    }
}

function normalizeZonePayload(rawZone) {
    const title = normalizeText(rawZone?.title, { maxLength: 255 });
    if (!title) {
        throw new AppError("Zone name is required.", 422, "ZONE_TITLE_REQUIRED");
    }

    const cityId = normalizeInt(rawZone?.city_id, { fallback: null });
    if (!cityId || cityId < 1) {
        throw new AppError("Invalid city ID to apply zones.", 422, "INVALID_CITY_ID");
    }

    const zoneFareType = normalizeInt(rawZone?.zone_fare_type, { fallback: null });
    if (![1, 2].includes(zoneFareType)) {
        throw new AppError("Invalid zone fare type. Only 1 or 2 are allowed.", 422, "INVALID_ZONE_FARE_TYPE");
    }

    const zoneFareValue = normalizeNonNegativeNumber(rawZone?.zone_fare_value, { fallback: 0 });

    const zoneBoundCoords = normalizePolygon(rawZone?.zone_bound_coords, "Polygon zone");
    if (!zoneBoundCoords) {
        throw new AppError("You should draw a polygon for the zone.", 422, "ZONE_POLYGON_REQUIRED");
    }

    return {
        title,
        city_id: cityId,
        zone_fare_type: zoneFareType,
        zone_fare_value: zoneFareValue,
        zone_bound_coords: zoneBoundCoords,
    };
}

export async function getZoneMetaByAdmin(auth) {
    assertAdmin(auth);
    const cityRoutes = await findCityRoutes();
    return { cityRoutes };
}

export async function getZoneListByAdmin(query, auth) {
    assertAdmin(auth);

    const filters = normalizePagination(query);
    const [items, totalItems] = await Promise.all([
        findZoneList(filters),
        countZones(filters),
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
        totalItems,
        filters,
    };
}

export async function getZoneDetailByAdmin(zoneIdInput, auth) {
    assertAdmin(auth);

    const zoneId = normalizeInt(zoneIdInput, { fallback: null });
    if (!zoneId || zoneId < 1) {
        throw new AppError("Invalid zone ID.", 422, "INVALID_ZONE_ID");
    }

    const zone = await findZoneById(zoneId);
    if (!zone) {
        throw new AppError("Zone not found.", 404, "ZONE_NOT_FOUND");
    }

    return { zone };
}

export async function createZoneByAdmin(payload, auth) {
    assertAdmin(auth);

    const zonePayload = normalizeZonePayload(payload);
    const cityExists = await cityRouteExists(zonePayload.city_id);

    if (!cityExists) {
        throw new AppError("Invalid city ID to apply zones or city not found.", 422, "CITY_ROUTE_NOT_FOUND");
    }

    const connection = await sqldb.getConnection();

    try {
        await connection.beginTransaction();

        const zoneId = await insertZone(zonePayload, connection);

        await connection.commit();

        return getZoneDetailByAdmin(zoneId, { role: "admin" });
    } catch (error) {
        await connection.rollback();
        throw error;
    } finally {
        connection.release();
    }
}

export async function updateZoneByAdmin(zoneIdInput, payload, auth) {
    assertAdmin(auth);

    const zoneId = normalizeInt(zoneIdInput, { fallback: null });
    if (!zoneId || zoneId < 1) {
        throw new AppError("Invalid zone ID.", 422, "INVALID_ZONE_ID");
    }

    const existingZone = await findZoneById(zoneId);
    if (!existingZone) {
        throw new AppError("Zone not found.", 404, "ZONE_NOT_FOUND");
    }

    const zonePayload = normalizeZonePayload(payload);
    const cityExists = await cityRouteExists(zonePayload.city_id);

    if (!cityExists) {
        throw new AppError("Invalid city ID to apply zones or city not found.", 422, "CITY_ROUTE_NOT_FOUND");
    }

    const connection = await sqldb.getConnection();

    try {
        await connection.beginTransaction();

        await updateZone(zoneId, zonePayload, connection);

        await connection.commit();

        return getZoneDetailByAdmin(zoneId, { role: "admin" });
    } catch (error) {
        await connection.rollback();
        throw error;
    } finally {
        connection.release();
    }
}

