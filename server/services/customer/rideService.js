
import crypto from "crypto";
import sqldb from "../../config/sqldatabase.js";
import AppError from "../../utils/appError.js";
import {
    countBookingHistoryByUser,
    insertBooking as createBookingRecord,
    createDriverAllocation,
    createWalletAccount,
    findBookingByIdForUser,
    findCouponForUser,
    findCurrentBookingByUser,
    findCustomerAccount,
    findDefaultCurrencyId,
    findDriverAllocationForBooking,
    findDriverById,
    findDriverCurrentLocation,
    findRideById,
    findRouteById,
    findTariff,
    findWalletByActorForUpdate,
    incrementCustomerCancelFrequency,
    insertPayment,
    insertWalletLedger,
    listBookingHistoryByUser,
    updateBookingDriver,
    updateBookingPaymentType,
    updateBookingStatus,
    updateDriverAllocationStatusByBooking,
    updateWalletBalance,
    upsertCouponUsage,
} from "../../repositories/customer/rideRepository.js";
import { emitBookingStatusUpdated } from "./realtimeService.js";

const BOOKING_STATUS = {
    PENDING: 0,
    ONRIDE: 1,
    CANCELLED_BY_USER: 2,
    COMPLETED: 3,
    CANCELLED_BY_DRIVER: 4,
    CANCELLED_BY_ADMIN: 5,
    ARRIVED: 6,
};

const TERMINAL_STATUSES = new Set([2, 3, 4, 5]);

function toDateTimeString(date) {
    return date.toISOString().slice(0, 19).replace("T", " ");
}

function normalizePagination(query = {}) {
    const page = Math.max(Number(query.page || 1), 1);
    const limit = Math.min(Math.max(Number(query.limit || 20), 1), 100);
    return { page, limit, offset: (page - 1) * limit };
}

function generateBookingUuid() {
    return crypto.randomBytes(16).toString("hex");
}

function generatePaymentCode(prefix = "PAY") {
    return `${prefix}-${Date.now()}-${crypto.randomBytes(4).toString("hex").toUpperCase()}`;
}

function assertCustomer(auth) {
    const userId = Number(auth?.userId || 0);
    if (!userId || Number(auth?.userType) !== 0) {
        throw new AppError("Forbidden", 403, "FORBIDDEN");
    }
    return userId;
}

function toRad(value) {
    return (Number(value) * Math.PI) / 180;
}

function haversineDistanceKm(a, b) {
    const earthRadiusKm = 6371;
    const dLat = toRad(b.lat - a.lat);
    const dLng = toRad(b.lng - a.lng);
    const lat1 = toRad(a.lat);
    const lat2 = toRad(b.lat);
    const x =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.sin(dLng / 2) * Math.sin(dLng / 2) * Math.cos(lat1) * Math.cos(lat2);
    return earthRadiusKm * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}

function encodePolyline(points) {
    let lastLat = 0;
    let lastLng = 0;
    const encode = (num) => {
        let value = num < 0 ? ~(num << 1) : num << 1;
        let encoded = "";
        while (value >= 0x20) {
            encoded += String.fromCharCode((0x20 | (value & 0x1f)) + 63);
            value >>= 5;
        }
        encoded += String.fromCharCode(value + 63);
        return encoded;
    };
    return points
        .map((point) => {
            const lat = Math.round(point.lat * 1e5);
            const lng = Math.round(point.lng * 1e5);
            const latDelta = lat - lastLat;
            const lngDelta = lng - lastLng;
            lastLat = lat;
            lastLng = lng;
            return `${encode(latDelta)}${encode(lngDelta)}`;
        })
        .join("");
}

function normalizeWaypointList(waypoints = []) {
    if (!Array.isArray(waypoints)) return [];
    return waypoints
        .map((item) => ({
            lat: Number(item?.lat),
            lng: Number(item?.lng),
            address: item?.address ? String(item.address).trim() : null,
        }))
        .filter(
            (item) =>
                Number.isFinite(item.lat) &&
                Number.isFinite(item.lng) &&
                item.lat >= -90 &&
                item.lat <= 90 &&
                item.lng >= -180 &&
                item.lng <= 180
        )
        .slice(0, 2);
}

function normalizePoint(name, point) {
    const lat = Number(point?.lat);
    const lng = Number(point?.lng);
    if (!Number.isFinite(lat) || lat < -90 || lat > 90) {
        throw new AppError(`${name}.lat is invalid.`, 422, "INVALID_COORDINATE");
    }
    if (!Number.isFinite(lng) || lng < -180 || lng > 180) {
        throw new AppError(`${name}.lng is invalid.`, 422, "INVALID_COORDINATE");
    }
    return { lat, lng, address: point?.address ? String(point.address).trim() : null };
}

async function estimateByGoogleMaps(points) {
    const apiKey = process.env.GOOGLE_MAPS_API_KEY;
    if (!apiKey) return null;

    const origin = `${points[0].lat},${points[0].lng}`;
    const destination = `${points[points.length - 1].lat},${points[points.length - 1].lng}`;
    const innerStops = points.slice(1, points.length - 1);
    const params = new URLSearchParams({
        origin,
        destination,
        mode: "driving",
        key: apiKey,
    });

    if (innerStops.length > 0) {
        params.set("waypoints", innerStops.map((stop) => `${stop.lat},${stop.lng}`).join("|"));
    }

    const response = await fetch(
        `https://maps.googleapis.com/maps/api/directions/json?${params.toString()}`
    );
    if (!response.ok) return null;

    const payload = await response.json();
    const route = payload?.routes?.[0];
    if (!route?.legs?.length) return null;

    const summary = route.legs.reduce(
        (acc, leg) => {
            acc.distanceMeters += Number(leg?.distance?.value || 0);
            acc.durationSeconds += Number(leg?.duration?.value || 0);
            return acc;
        },
        { distanceMeters: 0, durationSeconds: 0 }
    );

    return {
        distance_km: Number((summary.distanceMeters / 1000).toFixed(2)),
        duration_min: Number((summary.durationSeconds / 60).toFixed(1)),
        polyline: route.overview_polyline?.points || encodePolyline(points),
        provider: "google_maps",
    };
}

function estimateByFallback(points) {
    let totalDistance = 0;
    for (let i = 0; i < points.length - 1; i += 1) {
        totalDistance += haversineDistanceKm(points[i], points[i + 1]);
    }

    const distance_km = Number((totalDistance * 1.22).toFixed(2));
    const duration_min = Number(((distance_km / 28) * 60).toFixed(1));

    return {
        distance_km: Math.max(distance_km, 0.2),
        duration_min: Math.max(duration_min, 1),
        polyline: encodePolyline(points),
        provider: "server_fallback",
    };
}

function computeFareBreakdown({ distanceKm, durationMin, tariff, coupon = null, scheduledAt = null }) {
    const hour = scheduledAt ? new Date(scheduledAt).getHours() : new Date().getHours();
    const isNight = hour >= 22 || hour < 5;
    const baseFare = isNight ? tariff.npickup_cost || tariff.pickup_cost : tariff.pickup_cost;
    const perKm = isNight ? tariff.ncost_per_km || tariff.cost_per_km : tariff.cost_per_km;
    const perMin = isNight ? tariff.ncost_per_minute || tariff.cost_per_minute : tariff.cost_per_minute;
    const billableDistance = Math.max(distanceKm - Number(tariff.init_distance || 0), 0);
    const distanceFare = billableDistance * perKm;
    const timeFare = durationMin * perMin;
    const surcharge = 0;
    const subtotal = baseFare + distanceFare + timeFare + surcharge;

    let discount = 0;
    if (coupon) {
        if (coupon.discount_type === 0) {
            discount = (subtotal * Number(coupon.discount_value || 0)) / 100;
            if (Number(coupon.max_discount_amount || 0) > 0) {
                discount = Math.min(discount, Number(coupon.max_discount_amount || 0));
            }
        } else {
            discount = Number(coupon.discount_value || 0);
        }
        discount = Math.min(discount, subtotal);
    }

    const total = Math.max(subtotal - discount, 0);
    return {
        base_fare: Number(baseFare.toFixed(2)),
        distance_fare: Number(distanceFare.toFixed(2)),
        time_fare: Number(timeFare.toFixed(2)),
        surcharge: Number(surcharge.toFixed(2)),
        discount: Number(discount.toFixed(2)),
        total: Number(total.toFixed(2)),
        meta: {
            per_km: Number(perKm.toFixed(2)),
            per_min: Number(perMin.toFixed(2)),
            billable_distance: Number(billableDistance.toFixed(2)),
            is_night: isNight,
        },
    };
}

function validateCoupon(coupon, { rideId, subtotal }) {
    if (!coupon) throw new AppError("Coupon not found.", 404, "COUPON_NOT_FOUND");
    if (coupon.status !== 1 || coupon.visibility !== 1) {
        throw new AppError("Coupon is not available.", 409, "COUPON_UNAVAILABLE");
    }

    const now = Date.now();
    const activeAt = new Date(coupon.active_date).getTime();
    const expireAt = new Date(coupon.expiry_date).getTime();
    if (Number.isNaN(activeAt) || Number.isNaN(expireAt) || now < activeAt || now > expireAt) {
        throw new AppError("Coupon is expired or not active.", 409, "COUPON_EXPIRED");
    }

    if (coupon.vehicle_ids.length > 0 && !coupon.vehicle_ids.includes(Number(rideId))) {
        throw new AppError("Coupon is not valid for this ride type.", 409, "COUPON_INVALID_RIDE");
    }
    if (Number(subtotal) < Number(coupon.min_fare || 0)) {
        throw new AppError("Order value does not meet coupon minimum fare.", 409, "COUPON_MIN_FARE");
    }
    if (Number(coupon.limit_count) > 0 && Number(coupon.total_used || 0) >= Number(coupon.limit_count)) {
        throw new AppError("Coupon usage limit reached.", 409, "COUPON_USAGE_LIMIT");
    }
    if (Number(coupon.user_limit_count) > 0 && Number(coupon.user_used || 0) >= Number(coupon.user_limit_count)) {
        throw new AppError("You have reached coupon usage limit.", 409, "COUPON_USER_LIMIT");
    }
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

async function ensureCustomerReady(userId, conn = null) {
    const customer = await findCustomerAccount(userId, conn);
    if (!customer) throw new AppError("Customer not found.", 404, "CUSTOMER_NOT_FOUND");
    if (customer.account_deleted === 1 || customer.account_active !== 1 || customer.is_activated !== 1) {
        throw new AppError("Customer account is inactive.", 403, "ACCOUNT_INACTIVE");
    }
    return customer;
}
function mapBookingRow(booking, { location = null, allocation = null } = {}) {
    if (!booking) return null;
    return {
        id: Number(booking.id),
        booking_code: booking.b_uuid,
        status: Number(booking.status || 0),
        user_id: Number(booking.user_id),
        route_id: Number(booking.route_id || 0),
        route_name: booking.route_name,
        ride_id: Number(booking.ride_id || 0),
        ride_type: booking.ride_type,
        payment_type: booking.payment_type === null ? null : Number(booking.payment_type),
        scheduled: Number(booking.scheduled || 0),
        service_type: Number(booking.service_type || 0),
        pickup_datetime: booking.pickup_datetime,
        pickup_address: booking.pickup_address,
        pickup: {
            lat: booking.pickup_lat === null ? null : Number(booking.pickup_lat),
            lng: booking.pickup_long === null ? null : Number(booking.pickup_long),
        },
        dropoff_datetime: booking.dropoff_datetime,
        dropoff_address: booking.dropoff_address,
        dropoff: {
            lat: booking.dropoff_lat === null ? null : Number(booking.dropoff_lat),
            lng: booking.dropoff_long === null ? null : Number(booking.dropoff_long),
        },
        waypoints: [
            booking.waypoint1_lat !== null || booking.waypoint1_long !== null
                ? {
                      address: booking.waypoint1_address,
                      lat: booking.waypoint1_lat === null ? null : Number(booking.waypoint1_lat),
                      lng: booking.waypoint1_long === null ? null : Number(booking.waypoint1_long),
                  }
                : null,
            booking.waypoint2_lat !== null || booking.waypoint2_long !== null
                ? {
                      address: booking.waypoint2_address,
                      lat: booking.waypoint2_lat === null ? null : Number(booking.waypoint2_lat),
                      lng: booking.waypoint2_long === null ? null : Number(booking.waypoint2_long),
                  }
                : null,
        ].filter(Boolean),
        est_distance: Number(booking.est_distance || 0),
        est_duration: Number(booking.est_duration || 0),
        distance_travelled: booking.distance_travelled === null ? null : Number(booking.distance_travelled),
        estimated_cost: Number(booking.estimated_cost || 0),
        actual_cost: Number(booking.actual_cost || 0),
        cancel_amount: Number(booking.cancel_amount || 0),
        haspaid: Number(booking.haspaid || 0),
        paid_amount: Number(booking.paid_amount || 0),
        cancel_comment: booking.cancel_comment,
        coupon: booking.coupon_code
            ? {
                  coupon_code: booking.coupon_code,
                  discount_type: Number(booking.coupon_discount_type || 0),
                  discount_value: Number(booking.coupon_discount_value || 0),
                  min_fare: Number(booking.coupon_min_fare || 0),
                  max_discount: Number(booking.coupon_max_discount || 0),
              }
            : null,
        driver: booking.driver_id
            ? {
                  driver_id: Number(booking.driver_id),
                  firstname: booking.driver_firstname,
                  lastname: booking.driver_lastname,
                  phone: booking.driver_phone,
                  account_active: Number(booking.driver_account_active || 0),
                  available: Number(booking.driver_available || 0),
                  operation_status: Number(booking.driver_operation_status || 0),
              }
            : null,
        driver_location: location
            ? {
                  long: Number(location.long || 0),
                  lat: Number(location.lat || 0),
                  angle: Number(location.b_angle || 0),
                  updated_at: location.updated_at,
              }
            : null,
        allocation: allocation
            ? {
                  id: Number(allocation.id),
                  booking_id: Number(allocation.booking_id),
                  driver_id: Number(allocation.driver_id || 0),
                  status: Number(allocation.status || 0),
                  date_allocated: allocation.date_allocated,
              }
            : null,
        currency: {
            symbol: booking.cur_symbol,
            code: booking.cur_code,
        },
        date_created: booking.date_created,
        date_started: booking.date_started,
        date_completed: booking.date_completed,
    };
}

export async function estimateRoute(auth, payload) {
    const userId = assertCustomer(auth);
    const customer = await ensureCustomerReady(userId);
    const pickup = normalizePoint("pickup", payload.pickup);
    const dropoff = normalizePoint("dropoff", payload.dropoff);
    const waypoints = normalizeWaypointList(payload.waypoints || []);
    const points = [pickup, ...waypoints, dropoff];
    const fromGoogle = await estimateByGoogleMaps(points).catch(() => null);
    const estimate = fromGoogle || estimateByFallback(points);
    return {
        ...estimate,
        route_id: customer.route_id ? Number(customer.route_id) : null,
        distance_unit: "km",
        duration_unit: "min",
    };
}

export async function estimateFare(auth, payload) {
    const userId = assertCustomer(auth);
    return runInTransaction(async (conn) => {
        await ensureCustomerReady(userId, conn);
        const route = await findRouteById(Number(payload.route_id), conn);
        if (!route) throw new AppError("Route not found.", 404, "ROUTE_NOT_FOUND");
        const ride = await findRideById(Number(payload.ride_id), conn);
        if (!ride || ride.avail !== 1) throw new AppError("Ride type not found or unavailable.", 404, "RIDE_NOT_FOUND");

        const serviceType = Number(payload.service_type || 0);
        const tariff = await findTariff({ routeId: Number(payload.route_id), rideId: Number(payload.ride_id), serviceType }, conn);
        if (!tariff) throw new AppError("Tariff not found for route and ride.", 404, "TARIFF_NOT_FOUND");

        const distanceKm = Number(payload.map_estimate.distance_km);
        const durationMin = Number(payload.map_estimate.duration_min);

        let coupon = null;
        if (payload.coupon_code) {
            coupon = await findCouponForUser(
                {
                    couponCode: String(payload.coupon_code).trim().toUpperCase(),
                    routeId: Number(payload.route_id),
                    userId,
                },
                conn,
                true
            );
        }

        const subtotalBreakdown = computeFareBreakdown({
            distanceKm,
            durationMin,
            tariff,
            coupon: null,
            scheduledAt: payload.scheduled_at || null,
        });

        if (coupon) {
            validateCoupon(coupon, { rideId: Number(payload.ride_id), subtotal: subtotalBreakdown.total });
        }

        const breakdown = computeFareBreakdown({
            distanceKm,
            durationMin,
            tariff,
            coupon,
            scheduledAt: payload.scheduled_at || null,
        });

        return {
            route_id: Number(payload.route_id),
            ride_id: Number(payload.ride_id),
            service_type: serviceType,
            map_estimate: {
                distance_km: Number(distanceKm.toFixed(2)),
                duration_min: Number(durationMin.toFixed(1)),
            },
            currency: { symbol: route.cur_symbol, code: route.cur_code, dist_unit: route.dist_unit },
            coupon: coupon
                ? {
                      coupon_code: coupon.coupon_code,
                      discount_type: coupon.discount_type,
                      discount_value: coupon.discount_value,
                      min_fare: coupon.min_fare,
                      max_discount_amount: coupon.max_discount_amount,
                  }
                : null,
            breakdown,
        };
    });
}

export async function createBooking(auth, payload) {
    const userId = assertCustomer(auth);

    return runInTransaction(async (conn) => {
        const customer = await ensureCustomerReady(userId, conn);
        const existingCurrentBookingId = await findCurrentBookingByUser(userId, conn);
        if (existingCurrentBookingId) {
            throw new AppError("You already have an active booking.", 409, "ACTIVE_BOOKING_EXISTS");
        }

        const route = await findRouteById(Number(payload.route_id), conn);
        if (!route) throw new AppError("Route not found.", 404, "ROUTE_NOT_FOUND");

        const ride = await findRideById(Number(payload.ride_id), conn);
        if (!ride || ride.avail !== 1) {
            throw new AppError("Ride type not found or unavailable.", 404, "RIDE_NOT_FOUND");
        }

        const serviceType = Number(payload.service_type || 0);
        const tariff = await findTariff(
            {
                routeId: Number(payload.route_id),
                rideId: Number(payload.ride_id),
                serviceType,
            },
            conn
        );
        if (!tariff) throw new AppError("Tariff not found for route and ride.", 404, "TARIFF_NOT_FOUND");

        const distanceKm = Number(payload.map_estimate.distance_km);
        const durationMin = Number(payload.map_estimate.duration_min);
        const preCouponBreakdown = computeFareBreakdown({
            distanceKm,
            durationMin,
            tariff,
            coupon: null,
            scheduledAt: payload.scheduled_at || null,
        });

        let coupon = null;
        if (payload.coupon_code) {
            coupon = await findCouponForUser(
                {
                    couponCode: String(payload.coupon_code).trim().toUpperCase(),
                    routeId: Number(payload.route_id),
                    userId,
                },
                conn,
                true
            );
            if (!coupon) throw new AppError("Coupon not found.", 404, "COUPON_NOT_FOUND");
            validateCoupon(coupon, { rideId: Number(payload.ride_id), subtotal: preCouponBreakdown.total });
            await upsertCouponUsage({ couponId: coupon.id, userId }, conn);
        }

        const fare = {
            route_id: Number(payload.route_id),
            ride_id: Number(payload.ride_id),
            service_type: serviceType,
            map_estimate: {
                distance_km: Number(distanceKm.toFixed(2)),
                duration_min: Number(durationMin.toFixed(1)),
            },
            currency: {
                symbol: route.cur_symbol,
                code: route.cur_code,
                dist_unit: route.dist_unit,
            },
            breakdown: computeFareBreakdown({
                distanceKm,
                durationMin,
                tariff,
                coupon,
                scheduledAt: payload.scheduled_at || null,
            }),
        };

        const pickup = normalizePoint("pickup", payload.pickup);
        const dropoff = normalizePoint("dropoff", payload.dropoff);
        const waypoints = normalizeWaypointList(payload.waypoints || []);
        const scheduledAt = payload.scheduled_at ? new Date(payload.scheduled_at) : null;
        if (scheduledAt && Number.isNaN(scheduledAt.getTime())) throw new AppError("scheduled_at is invalid.", 422, "INVALID_SCHEDULED_AT");

        const now = new Date();
        const defaultPickupTime = new Date(now.getTime() + 5 * 60 * 1000);

        const bookingId = await createBookingRecord(
            {
                user_id: userId,
                user_firstname: customer.firstname,
                user_lastname: customer.lastname,
                user_phone: customer.phone,
                pickup_datetime: toDateTimeString(scheduledAt || defaultPickupTime),
                pickup_address: String(payload.pickup_address).trim(),
                pickup_long: pickup.lng,
                pickup_lat: pickup.lat,
                dropoff_address: String(payload.dropoff_address).trim(),
                dropoff_long: dropoff.lng,
                dropoff_lat: dropoff.lat,
                waypoint1_address: waypoints[0]?.address || null,
                waypoint1_long: waypoints[0]?.lng || null,
                waypoint1_lat: waypoints[0]?.lat || null,
                waypoint2_address: waypoints[1]?.address || null,
                waypoint2_long: waypoints[1]?.lng || null,
                waypoint2_lat: waypoints[1]?.lat || null,
                est_distance: fare.map_estimate.distance_km,
                est_duration: fare.map_estimate.duration_min,
                estimated_cost: fare.breakdown.total,
                actual_cost: 0,
                cur_symbol: fare.currency.symbol,
                cur_code: fare.currency.code,
                route_id: Number(payload.route_id),
                ride_id: Number(payload.ride_id),
                payment_type: Number(payload.payment_type || 1),
                scheduled: scheduledAt ? 1 : 0,
                scheduled_driver: 0,
                dispatch_mode: 0,
                num_seats: Number(payload.num_seats || 1),
                status: BOOKING_STATUS.PENDING,
                b_uuid: generateBookingUuid(),
                service_type: serviceType,
                coupon_code: coupon?.coupon_code || null,
                coupon_discount_type: coupon?.discount_type || 0,
                coupon_discount_value: coupon?.discount_value || 0,
                coupon_min_fare: coupon?.min_fare || 0,
                coupon_max_discount: coupon?.max_discount_amount || 0,
            },
            conn
        );

        const booking = await findBookingByIdForUser(bookingId, userId, conn);

        return {
            booking: mapBookingRow(booking),
            fare: fare.breakdown,
            dispatch: {
                status: "pending",
                message: "Booking is pending driver assignment.",
            },
        };
    });
}
export async function getCurrentBooking(auth) {
    const userId = assertCustomer(auth);
    await ensureCustomerReady(userId);

    const bookingId = await findCurrentBookingByUser(userId);
    if (!bookingId) return { booking: null };

    const booking = await findBookingByIdForUser(bookingId, userId);
    const [location, allocation] = await Promise.all([
        booking?.driver_id ? findDriverCurrentLocation(Number(booking.driver_id)) : Promise.resolve(null),
        findDriverAllocationForBooking(bookingId),
    ]);

    return { booking: mapBookingRow(booking, { location, allocation }) };
}

export async function getBookingDetail(auth, bookingIdInput) {
    const userId = assertCustomer(auth);
    await ensureCustomerReady(userId);

    const bookingId = Number(bookingIdInput);
    const booking = await findBookingByIdForUser(bookingId, userId);
    if (!booking) throw new AppError("Booking not found.", 404, "BOOKING_NOT_FOUND");

    const [location, allocation] = await Promise.all([
        booking.driver_id ? findDriverCurrentLocation(Number(booking.driver_id)) : Promise.resolve(null),
        findDriverAllocationForBooking(bookingId),
    ]);

    return { booking: mapBookingRow(booking, { location, allocation }) };
}

export async function getBookingHistory(auth, query = {}) {
    const userId = assertCustomer(auth);
    await ensureCustomerReady(userId);

    const { page, limit, offset } = normalizePagination(query);
    const status = query.status === undefined || query.status === null || query.status === "" ? null : Number(query.status);

    const [ids, totalItems] = await Promise.all([
        listBookingHistoryByUser(userId, { status, limit, offset }),
        countBookingHistoryByUser(userId, { status }),
    ]);

    const detailItems = await Promise.all(ids.map((id) => findBookingByIdForUser(id, userId)));
    const items = detailItems.filter(Boolean).map((item) => mapBookingRow(item));
    const totalPages = totalItems === 0 ? 0 : Math.ceil(totalItems / limit);

    return {
        items,
        pagination: {
            page,
            limit,
            totalPages,
            hasNextPage: totalPages > 0 && page < totalPages,
            hasPrevPage: page > 1,
        },
        totalItems,
        filters: { status },
    };
}

export async function cancelBooking(auth, bookingIdInput, payload = {}) {
    const userId = assertCustomer(auth);

    return runInTransaction(async (conn) => {
        const customer = await ensureCustomerReady(userId, conn);
        const cancelLimit = Number(process.env.BOOKING_CANCEL_FREQ_LIMIT || 5);

        if (customer.booking_cancel_freq >= cancelLimit) {
            throw new AppError("You have reached the cancellation limit.", 403, "BOOKING_CANCEL_LIMIT_REACHED");
        }

        const bookingId = Number(bookingIdInput);
        const booking = await findBookingByIdForUser(bookingId, userId, conn, true);

        if (!booking) throw new AppError("Booking not found.", 404, "BOOKING_NOT_FOUND");
        if (TERMINAL_STATUSES.has(Number(booking.status || 0))) {
            throw new AppError("Booking is already finalized.", 409, "BOOKING_FINALIZED");
        }
        if (Number(booking.status) === BOOKING_STATUS.ONRIDE) {
            throw new AppError("Cannot cancel booking after trip has started.", 409, "BOOKING_ALREADY_STARTED");
        }

        if (booking.pickup_datetime) {
            const pickupAt = new Date(booking.pickup_datetime).getTime();
            if (Number.isFinite(pickupAt)) {
                const lateCancelWindowMs = Number(process.env.BOOKING_LATE_CANCEL_WINDOW_MS || 10 * 60 * 1000);
                if (Date.now() > pickupAt + lateCancelWindowMs) {
                    throw new AppError("Cancellation window has passed for this booking.", 409, "BOOKING_LATE_CANCEL");
                }
            }
        }

        const tariff = await findTariff(
            {
                routeId: Number(booking.route_id),
                rideId: Number(booking.ride_id),
                serviceType: Number(booking.service_type || 0),
            },
            conn
        );

        const nowHour = new Date().getHours();
        const isNight = nowHour >= 22 || nowHour < 5;
        const cancelAmount = Number((isNight ? tariff?.ncancel_cost || tariff?.cancel_cost || 0 : tariff?.cancel_cost || 0).toFixed(2));

        if (cancelAmount > 0 && Number(booking.payment_type) === 2) {
            let wallet = await findWalletByActorForUpdate({ actorType: 0, actorId: userId }, conn);

            if (!wallet) {
                const currencyId = await findDefaultCurrencyId(conn);
                await createWalletAccount({ actorType: 0, actorId: userId, currencyId }, conn);
                wallet = await findWalletByActorForUpdate({ actorType: 0, actorId: userId }, conn);
            }

            if (!wallet || Number(wallet.status) !== 1) {
                throw new AppError("Wallet is not available for cancellation charge.", 409, "WALLET_UNAVAILABLE");
            }

            if (Number(wallet.balance || 0) < cancelAmount) {
                throw new AppError("Insufficient wallet balance for cancellation fee.", 409, "INSUFFICIENT_WALLET_BALANCE");
            }

            const nextBalance = Number((Number(wallet.balance) - cancelAmount).toFixed(2));

            const paymentId = await insertPayment(
                {
                    payment_code: generatePaymentCode("CXL"),
                    payer_wallet_id: Number(wallet.wallet_id),
                    actor_type: 0,
                    actor_id: userId,
                    service_domain: 0,
                    booking_id: Number(booking.id),
                    amount: cancelAmount,
                    currency_id: Number(wallet.currency_id || 1),
                    status: "paid",
                    description: `Cancellation fee for booking #${booking.id}`,
                },
                conn
            );

            await updateWalletBalance(Number(wallet.wallet_id), nextBalance, conn);

            await insertWalletLedger(
                {
                    wallet_id: Number(wallet.wallet_id),
                    payment_id: paymentId,
                    amount: cancelAmount,
                    balance_after: nextBalance,
                    direction: "debit",
                    entry_type: "ride_cancel_fee",
                    source_type: "ride_booking",
                    source_id: Number(booking.id),
                    description: `Cancellation fee for booking #${booking.id}`,
                },
                conn
            );
        }

        await updateBookingStatus(Number(booking.id), BOOKING_STATUS.CANCELLED_BY_USER, conn, {
            cancel_comment: payload.reason ? String(payload.reason).trim() : "Cancelled by customer",
            cancel_amount: cancelAmount,
        });

        await updateDriverAllocationStatusByBooking(Number(booking.id), 4, conn);
        await incrementCustomerCancelFrequency(userId, conn);

        const updated = await findBookingByIdForUser(Number(booking.id), userId, conn);
        await emitBookingStatusUpdated({
            bookingId: Number(booking.id),
            status: BOOKING_STATUS.CANCELLED_BY_USER,
            userId,
        });
        return { booking: mapBookingRow(updated), cancel_fee: cancelAmount };
    });
}

export async function changePaymentMethod(auth, bookingIdInput, payload) {
    const userId = assertCustomer(auth);

    return runInTransaction(async (conn) => {
        await ensureCustomerReady(userId, conn);

        const bookingId = Number(bookingIdInput);
        const booking = await findBookingByIdForUser(bookingId, userId, conn, true);

        if (!booking) throw new AppError("Booking not found.", 404, "BOOKING_NOT_FOUND");
        if (TERMINAL_STATUSES.has(Number(booking.status || 0)) || Number(booking.status) === BOOKING_STATUS.ONRIDE) {
            throw new AppError("Payment method can only be changed before trip starts.", 409, "BOOKING_LOCKED");
        }

        await updateBookingPaymentType(bookingId, Number(payload.payment_type), conn);
        const updated = await findBookingByIdForUser(bookingId, userId, conn);
        return { booking: mapBookingRow(updated) };
    });
}
export async function getBookingStatusSnapshot(auth, bookingIdInput) {
    const userId = assertCustomer(auth);
    await ensureCustomerReady(userId);

    const bookingId = Number(bookingIdInput);
    const booking = await findBookingByIdForUser(bookingId, userId);
    if (!booking) throw new AppError("Booking not found.", 404, "BOOKING_NOT_FOUND");

    const [location, allocation] = await Promise.all([
        booking.driver_id ? findDriverCurrentLocation(Number(booking.driver_id)) : Promise.resolve(null),
        findDriverAllocationForBooking(bookingId),
    ]);

    return { booking: mapBookingRow(booking, { location, allocation }) };
}

export async function assignDriverToBooking({ bookingId, driverId, userId }) {
    return runInTransaction(async (conn) => {
        const booking = await findBookingByIdForUser(Number(bookingId), Number(userId), conn, true);
        if (!booking) throw new AppError("Booking not found.", 404, "BOOKING_NOT_FOUND");
        if (TERMINAL_STATUSES.has(Number(booking.status || 0))) {
            throw new AppError("Cannot assign driver to finalized booking.", 409, "BOOKING_FINALIZED");
        }

        const driver = await findDriverById(Number(driverId), conn);
        if (!driver) throw new AppError("Driver not found.", 404, "DRIVER_NOT_FOUND");
        if (Number(driver.account_deleted || 0) === 1 || Number(driver.account_active || 0) !== 1 || Number(driver.is_activated || 0) !== 1) {
            throw new AppError("Driver is not eligible.", 409, "DRIVER_NOT_ELIGIBLE");
        }

        await updateDriverAllocationStatusByBooking(Number(booking.id), 4, conn);
        await updateBookingDriver(Number(booking.id), driver, conn);
        await createDriverAllocation(
            {
                bookingId: Number(booking.id),
                driverId: Number(driver.driver_id),
                status: 0,
            },
            conn
        );

        return {
            assigned: true,
            bookingId: Number(booking.id),
            driverId: Number(driver.driver_id),
        };
    });
}

export async function updateBookingAsCompleted({ bookingId, actualCost, distanceTravelled }) {
    return runInTransaction(async (conn) => {
        const [rows] = await conn.query(
            `SELECT id, status
             FROM bookings
             WHERE id = ?
             LIMIT 1
             FOR UPDATE`,
            [bookingId]
        );

        const booking = rows[0];
        if (!booking) throw new AppError("Booking not found.", 404, "BOOKING_NOT_FOUND");

        await updateBookingStatus(Number(booking.id), BOOKING_STATUS.COMPLETED, conn, {
            actual_cost: Number(actualCost || 0),
            distance_travelled: Number(distanceTravelled || 0),
        });

        const [bookingRows] = await conn.query(
            `SELECT user_id FROM bookings WHERE id = ? LIMIT 1`,
            [bookingId]
        );
        const targetUserId = Number(bookingRows?.[0]?.user_id || 0);
        if (targetUserId > 0) {
            await emitBookingStatusUpdated({
                bookingId: Number(booking.id),
                status: BOOKING_STATUS.COMPLETED,
                userId: targetUserId,
            });
        }

        return {
            bookingId: Number(booking.id),
            status: BOOKING_STATUS.COMPLETED,
        };
    });
}

