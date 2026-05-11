import crypto from "crypto";
import sqldb from "../config/sqldatabase.js";
import AppError from "../utils/appError.js";
import {
    countBookings as repoCountBookings,
    countBookingsByScheduleType as repoCountBookingsByScheduleType,
    createDriverAllocation as repoCreateDriverAllocation,
    finalizeNonAcceptedAllocations as repoFinalizeNonAcceptedAllocations,
    findBookingAllocations as repoFindBookingAllocations,
    findBookingByIdForUpdate as repoFindBookingByIdForUpdate,
    findBookingByUuidForUser as repoFindBookingByUuidForUser,
    findBookingDetailById as repoFindBookingDetailById,
    findDriverById as repoFindDriverById,
    findLatestDriverLocation as repoFindLatestDriverLocation,
    findPassengerById as repoFindPassengerById,
    findRideById as repoFindRideById,
    findRouteById as repoFindRouteById,
    findTariffByRouteAndRide as repoFindTariffByRouteAndRide,
    findUserActiveBookingForUpdate as repoFindUserActiveBookingForUpdate,
    insertBooking as repoInsertBooking,
    insertNotification as repoInsertNotification,
    listAssignableDrivers as repoListAssignableDrivers,
    listBookingMetaRides as repoListBookingMetaRides,
    listBookingMetaRoutes as repoListBookingMetaRoutes,
    listBookings as repoListBookings,
    listLocationSuggestions as repoListLocationSuggestions,
    updateBookingDriverAssignment as repoUpdateBookingDriverAssignment,
    updateBookingStatus as repoUpdateBookingStatus,
} from "../repositories/bookingRepository.js";
import { writeBookingAuditLog } from "../utils/bookingAuditLogger.js";
import { withUserMutex } from "../utils/userMutex.js";
import {
    clearInflightPromise,
    consumeCachedResponse,
    getInflightPromise,
    rememberIdempotentResponse,
    rememberInflightPromise,
} from "../utils/idempotencyCache.js";
import { emitBookingStatusUpdated } from "./customer/realtimeService.js";
import { startRideDispatch } from "./rideDispatchService.js";
import { publishRealtimeEvent } from "../utils/realtime.js";
import {
    findWalletByActor,
    findWalletByIdForUpdate,
    updateWalletBalance,
    insertWalletLedger,
    updatePaymentStatusById,
    insertPayment,
    markBookingPaidByWallet,
} from "../repositories/walletRepository.js";

const BOOKING_STATUS = {
    PENDING: 0,
    ONRIDE: 1,
    CANCELLED_BY_RIDER: 2,
    COMPLETED: 3,
    CANCELLED_BY_DRIVER: 4,
    CANCELLED_BY_ADMIN: 5,
    ARRIVED: 6,
};

const DRIVER_ALLOCATE_STATUS = {
    PENDING_RESPONSE: 0,
    ACCEPTED: 1,
    REJECTED: 2,
    TIMEOUT: 3,
    FINALIZED: 4,
};

const STATUS_LABELS = {
    [BOOKING_STATUS.PENDING]: "pending",
    [BOOKING_STATUS.ONRIDE]: "onride",
    [BOOKING_STATUS.CANCELLED_BY_RIDER]: "cancelled_by_rider",
    [BOOKING_STATUS.COMPLETED]: "completed",
    [BOOKING_STATUS.CANCELLED_BY_DRIVER]: "cancelled_by_driver",
    [BOOKING_STATUS.CANCELLED_BY_ADMIN]: "cancelled_by_admin",
    [BOOKING_STATUS.ARRIVED]: "arrived",
};

const PAYMENT_TYPE_LABELS = { 1: "cash", 2: "wallet", 3: "card", 4: "pos" };

const ALLOWED_TRANSITIONS = {
    [BOOKING_STATUS.PENDING]: new Set([1, 6, 2, 4, 5]),
    [BOOKING_STATUS.ARRIVED]: new Set([1, 2, 4, 5]),
    [BOOKING_STATUS.ONRIDE]: new Set([3, 4, 5]),
    [BOOKING_STATUS.CANCELLED_BY_RIDER]: new Set([]),
    [BOOKING_STATUS.CANCELLED_BY_DRIVER]: new Set([]),
    [BOOKING_STATUS.CANCELLED_BY_ADMIN]: new Set([]),
    [BOOKING_STATUS.COMPLETED]: new Set([]),
};

const TERMINAL_STATUSES = new Set([2, 3, 4, 5]);

const toNullableString = (value) => {
    if (value === undefined || value === null) return null;
    const normalized = String(value).trim();
    return normalized.length ? normalized : null;
};

const toOptionalInteger = (value) => {
    if (value === undefined || value === null || value === "") return undefined;
    return Number(value);
};

const toOptionalNumber = (value, fallback = 0) => {
    if (value === undefined || value === null || value === "") return fallback;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
};

function parseBooleanFlag(value, defaultValue = 0) {
    if (value === undefined || value === null || value === "") return defaultValue;
    if (typeof value === "boolean") return value ? 1 : 0;
    const normalized = String(value).trim().toLowerCase();
    if (["1", "true", "yes", "on"].includes(normalized)) return 1;
    if (["0", "false", "no", "off"].includes(normalized)) return 0;
    return defaultValue;
}

function toDateValue(input, fieldName) {
    const value = toNullableString(input);
    if (!value) return null;
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
        throw new AppError(`${fieldName} must be a valid datetime.`, 422, "INVALID_DATETIME");
    }
    return date;
}

function toPaymentTypeLabel(paymentType) {
    if (paymentType === null || paymentType === undefined) return "unknown";
    return PAYMENT_TYPE_LABELS[paymentType] || "unknown";
}

function toBookingStatusLabel(status) {
    return STATUS_LABELS[status] || "unknown";
}

function serializeBooking(booking) {
    return {
        ...booking,
        status_label: toBookingStatusLabel(booking.status),
        payment_type_label: toPaymentTypeLabel(booking.payment_type),
    };
}

function toRad(value) {
    return (Number(value) * Math.PI) / 180;
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

function isValidLatLng(lat, lng) {
    const latNum = Number(lat);
    const lngNum = Number(lng);
    return Number.isFinite(latNum) && Number.isFinite(lngNum) && latNum >= -90 && latNum <= 90 && lngNum >= -180 && lngNum <= 180;
}

function normalizeCreatePayload(payload, auth) {
    const role = auth.role;
    const bodyUserId = toOptionalInteger(payload.user_id);
    const base = {
        pickup_datetime: toDateValue(payload.pickup_datetime, "pickup_datetime"),
        pickup_address: toNullableString(payload.pickup_address),
        pickup_long: toNullableString(payload.pickup_long),
        pickup_lat: toNullableString(payload.pickup_lat),
        dropoff_address: toNullableString(payload.dropoff_address),
        dropoff_long: toNullableString(payload.dropoff_long),
        dropoff_lat: toNullableString(payload.dropoff_lat),
        waypoint1_address: toNullableString(payload.waypoint1_address),
        waypoint1_long: toNullableString(payload.waypoint1_long),
        waypoint1_lat: toNullableString(payload.waypoint1_lat),
        waypoint2_address: toNullableString(payload.waypoint2_address),
        waypoint2_long: toNullableString(payload.waypoint2_long),
        waypoint2_lat: toNullableString(payload.waypoint2_lat),
        est_distance: toOptionalNumber(payload.est_distance),
        est_duration: toOptionalNumber(payload.est_duration),
        estimated_cost: toOptionalNumber(payload.estimated_cost),
        actual_cost: toOptionalNumber(payload.actual_cost),
        route_id: toOptionalInteger(payload.route_id),
        ride_id: toOptionalInteger(payload.ride_id),
        payment_type: toOptionalInteger(payload.payment_type) || 1,
        scheduled: parseBooleanFlag(payload.scheduled, 0),
        scheduled_driver: toOptionalInteger(payload.scheduled_driver) || 0,
        auto_dispatch: parseBooleanFlag(payload.auto_dispatch, 0),
        num_seats: toOptionalInteger(payload.num_seats) || 1,
        cur_symbol: toNullableString(payload.cur_symbol) || "?",
        cur_code: toNullableString(payload.cur_code) || "VND",
    };

    if (role === "passenger") {
        return {
            ...base,
            user_id: auth.userId,
            dispatch_mode: 0,
        };
    }

    if (!["admin", "dispatcher"].includes(role)) {
        throw new AppError("Forbidden", 403, "FORBIDDEN");
    }

    if (!Number.isInteger(bodyUserId) || bodyUserId < 1) {
        throw new AppError("user_id is required for admin/dispatcher booking.", 422, "INVALID_USER_ID");
    }

    return {
        ...base,
        user_id: bodyUserId,
        dispatch_mode: 1,
    };
}

function validateCreatePayload(payload) {
    if (!payload.pickup_address) throw new AppError("pickup_address is required.", 422, "INVALID_PICKUP_ADDRESS");
    if (!payload.dropoff_address) throw new AppError("dropoff_address is required.", 422, "INVALID_DROPOFF_ADDRESS");
    if (!Number.isInteger(payload.route_id) || payload.route_id < 1) throw new AppError("route_id must be a positive integer.", 422, "INVALID_ROUTE_ID");
    if (!Number.isInteger(payload.ride_id) || payload.ride_id < 1) throw new AppError("ride_id must be a positive integer.", 422, "INVALID_RIDE_ID");
    if (![1, 2, 3, 4].includes(payload.payment_type)) throw new AppError("payment_type must be one of 1,2,3,4.", 422, "INVALID_PAYMENT_TYPE");
    if (payload.num_seats < 1 || payload.num_seats > 10) throw new AppError("num_seats must be between 1 and 10.", 422, "INVALID_NUM_SEATS");
    if (payload.estimated_cost < 0 || payload.actual_cost < 0) throw new AppError("estimated_cost and actual_cost must be positive values.", 422, "INVALID_COST");

    if (payload.scheduled === 1) {
        if (!payload.pickup_datetime) throw new AppError("pickup_datetime is required for scheduled booking.", 422, "INVALID_SCHEDULED_TIME");
        const minScheduleDate = new Date(Date.now() + 10 * 60 * 1000);
        if (payload.pickup_datetime.getTime() < minScheduleDate.getTime()) {
            throw new AppError("scheduled pickup_datetime must be at least 10 minutes in the future.", 422, "INVALID_SCHEDULED_TIME");
        }
    }
}

function normalizeListFilters(query = {}) {
    return {
        page: Math.max(Number(query.page) || 1, 1),
        limit: Math.min(Math.max(Number(query.limit) || 15, 1), 100),
        status: query.status === undefined || query.status === null || query.status === "" ? undefined : Number(query.status),
        userId: query.user_id === undefined || query.user_id === null || query.user_id === "" ? undefined : Number(query.user_id),
        bookingType: query.booking_type === undefined || query.booking_type === null || query.booking_type === "" ? undefined : Number(query.booking_type),
        paymentType: query.payment_type === undefined || query.payment_type === null || query.payment_type === "" ? undefined : Number(query.payment_type),
        bookingCode: toNullableString(query.booking_code),
        customerName: toNullableString(query.customer_name),
        customerPhone: toNullableString(query.customer_phone),
        driverKeyword: toNullableString(query.driver_keyword),
        bookingDate: toNullableString(query.booking_date),
        search: toNullableString(query.search),
        scheduledOnly: parseBooleanFlag(query.scheduled_only, 0) === 1,
        processingOnly: parseBooleanFlag(query.processing_only, 0) === 1,
        sort_by: toNullableString(query.sort_by) || "date_created",
        sort_order: String(query.sort_order || "DESC").toUpperCase() === "ASC" ? "ASC" : "DESC",
    };
}

function normalizeRouteEstimateInput(payload = {}) {
    const pickupLat = toOptionalNumber(payload.pickup_lat, NaN);
    const pickupLng = toOptionalNumber(payload.pickup_lng, NaN);
    const dropoffLat = toOptionalNumber(payload.dropoff_lat, NaN);
    const dropoffLng = toOptionalNumber(payload.dropoff_lng, NaN);

    if (!isValidLatLng(pickupLat, pickupLng) || !isValidLatLng(dropoffLat, dropoffLng)) {
        throw new AppError("pickup/dropoff coordinates are invalid.", 422, "INVALID_COORDINATES");
    }

    const routeScope = Number(payload.route_scope || 0) === 1 ? 1 : 0;
    const directDistanceKm = haversineDistanceKm({ lat: pickupLat, lng: pickupLng }, { lat: dropoffLat, lng: dropoffLng });
    const roadFactor = routeScope === 1 ? 1.28 : 1.18;
    const speedKmPerHour = routeScope === 1 ? 42 : 28;
    const distanceKm = Number((directDistanceKm * roadFactor).toFixed(2));
    const durationMinutes = Number(((distanceKm / speedKmPerHour) * 60).toFixed(1));

    return {
        routeScope,
        distanceKm: Math.max(distanceKm, 0.2),
        durationMinutes: Math.max(durationMinutes, 1),
    };
}

function computeBookingQuote({ distanceKm, durationMinutes, tariff, pickupDate = null }) {
    const hour = pickupDate ? pickupDate.getHours() : new Date().getHours();
    const isNight = hour >= 22 || hour < 5;
    const costPerKm = isNight ? tariff.ncost_per_km || tariff.cost_per_km : tariff.cost_per_km;
    const costPerMinute = isNight ? tariff.ncost_per_minute || tariff.cost_per_minute : tariff.cost_per_minute;
    const pickupCost = isNight ? tariff.npickup_cost || tariff.pickup_cost : tariff.pickup_cost;
    const dropoffCost = isNight ? tariff.ndrop_off_cost || tariff.drop_off_cost : tariff.drop_off_cost;

    const billableDistance = Math.max(distanceKm - Number(tariff.init_distance || 0), 0);
    const distanceCost = billableDistance * costPerKm;
    const durationCost = durationMinutes * costPerMinute;
    const estimatedCost = Math.round(distanceCost + durationCost + pickupCost + dropoffCost);

    return {
        distance_km: Number(distanceKm.toFixed(2)),
        duration_min: Number(durationMinutes.toFixed(1)),
        is_night_rate: isNight,
        breakdown: {
            billable_distance_km: Number(billableDistance.toFixed(2)),
            cost_per_km: Number(costPerKm || 0),
            cost_per_minute: Number(costPerMinute || 0),
            pickup_cost: Number(pickupCost || 0),
            dropoff_cost: Number(dropoffCost || 0),
            distance_cost: Math.round(distanceCost),
            duration_cost: Math.round(durationCost),
        },
        estimated_cost: Math.max(estimatedCost, 0),
        cur_symbol: tariff.cur_symbol || "?",
        cur_code: tariff.cur_code || "VND",
    };
}

function validateStateTransition(currentStatus, targetStatus) {
    if (currentStatus === targetStatus) {
        throw new AppError("Booking is already in the requested status.", 409, "NO_STATUS_CHANGE");
    }

    const nextStatuses = ALLOWED_TRANSITIONS[currentStatus] || new Set();
    if (!nextStatuses.has(targetStatus)) {
        throw new AppError(`Invalid status transition from ${toBookingStatusLabel(currentStatus)} to ${toBookingStatusLabel(targetStatus)}.`, 409, "INVALID_STATUS_TRANSITION");
    }
}

function buildBookingUuidFromIdempotency(idempotencyKey) {
    return crypto.createHash("md5").update(String(idempotencyKey)).digest("hex");
}

async function runInTransaction(work) {
    const connection = await sqldb.getConnection();
    try {
        await connection.beginTransaction();
        const result = await work(connection);
        await connection.commit();
        return result;
    } catch (error) {
        await connection.rollback();
        throw error;
    } finally {
        connection.release();
    }
}

async function assertPassengerEligible(userId, conn, { findPassengerById }) {
    const passenger = await findPassengerById(userId, conn);
    if (!passenger) throw new AppError("Passenger does not exist.", 404, "PASSENGER_NOT_FOUND");

    if (passenger.account_deleted === 1 || passenger.account_active !== 1 || passenger.is_activated !== 1) {
        throw new AppError("Passenger account is not eligible for booking.", 403, "PASSENGER_NOT_ELIGIBLE");
    }

    return passenger;
}

async function assertRouteAndRide(payload, conn, { findRouteById, findRideById }) {
    const [route, ride] = await Promise.all([findRouteById(payload.route_id, conn), findRideById(payload.ride_id, conn)]);

    if (!route) throw new AppError("Route not found.", 404, "ROUTE_NOT_FOUND");
    if (!ride) throw new AppError("Ride type not found.", 404, "RIDE_NOT_FOUND");
    if (ride.avail !== 1) throw new AppError("Ride type is not available.", 409, "RIDE_UNAVAILABLE");

    return { route, ride };
}

async function resolveBookingDetailOrThrow(bookingId, auth, { findBookingDetailById }) {
    const detail = await findBookingDetailById(bookingId);
    if (!detail) throw new AppError("Booking not found.", 404, "BOOKING_NOT_FOUND");
    if (auth.role === "passenger" && Number(detail.booking.user_id) !== Number(auth.userId)) {
        throw new AppError("Forbidden", 403, "FORBIDDEN");
    }
    return detail;
}

export function createBookingService(overrides = {}) {
    const executeInTransaction = overrides.runInTransaction || runInTransaction;
    const countBookings = overrides.countBookings || repoCountBookings;
    const countBookingsByScheduleType = overrides.countBookingsByScheduleType || repoCountBookingsByScheduleType;
    const createDriverAllocation = overrides.createDriverAllocation || repoCreateDriverAllocation;
    const finalizeNonAcceptedAllocations = overrides.finalizeNonAcceptedAllocations || repoFinalizeNonAcceptedAllocations;
    const findBookingAllocations = overrides.findBookingAllocations || repoFindBookingAllocations;
    const findBookingByIdForUpdate = overrides.findBookingByIdForUpdate || repoFindBookingByIdForUpdate;
    const findBookingByUuidForUser = overrides.findBookingByUuidForUser || repoFindBookingByUuidForUser;
    const findBookingDetailById = overrides.findBookingDetailById || repoFindBookingDetailById;
    const findDriverById = overrides.findDriverById || repoFindDriverById;
    const findLatestDriverLocation = overrides.findLatestDriverLocation || repoFindLatestDriverLocation;
    const findPassengerById = overrides.findPassengerById || repoFindPassengerById;
    const findRideById = overrides.findRideById || repoFindRideById;
    const findRouteById = overrides.findRouteById || repoFindRouteById;
    const findTariffByRouteAndRide = overrides.findTariffByRouteAndRide || repoFindTariffByRouteAndRide;
    const findUserActiveBookingForUpdate = overrides.findUserActiveBookingForUpdate || repoFindUserActiveBookingForUpdate;
    const insertBooking = overrides.insertBooking || repoInsertBooking;
    const insertNotification = overrides.insertNotification || repoInsertNotification;
    const listAssignableDrivers = overrides.listAssignableDrivers || repoListAssignableDrivers;
    const listBookingMetaRides = overrides.listBookingMetaRides || repoListBookingMetaRides;
    const listBookingMetaRoutes = overrides.listBookingMetaRoutes || repoListBookingMetaRoutes;
    const listBookings = overrides.listBookings || repoListBookings;
    const listLocationSuggestions = overrides.listLocationSuggestions || repoListLocationSuggestions;
    const updateBookingDriverAssignment = overrides.updateBookingDriverAssignment || repoUpdateBookingDriverAssignment;
    const updateBookingStatus = overrides.updateBookingStatus || repoUpdateBookingStatus;

    async function buildPriceQuote({ routeId, rideId, distanceKm, durationMinutes, pickupDatetime }) {
        const tariff = await findTariffByRouteAndRide(routeId, rideId);
        if (!tariff) throw new AppError("Tariff not found for selected route and ride.", 404, "TARIFF_NOT_FOUND");

        return computeBookingQuote({
            distanceKm,
            durationMinutes,
            tariff,
            pickupDate: pickupDatetime || null,
        });
    }

    async function tryAutoDispatch({ conn, bookingId, routeId, rideId, scheduled }) {
        const candidates = await listAssignableDrivers({ routeId, rideId, limit: 10 });
        const selected = (candidates || []).find((driver) => driver.available === 1) || candidates?.[0] || null;
        if (!selected) return { assigned: false, reason: "no_driver_available" };

        const driver = await findDriverById(selected.driver_id, conn);
        if (!driver) return { assigned: false, reason: "driver_not_found" };
        if (driver.account_deleted === 1 || driver.account_active !== 1 || driver.is_activated !== 1) {
            return { assigned: false, reason: "driver_not_eligible" };
        }

        await updateBookingDriverAssignment(
            {
                bookingId,
                driverId: driver.driver_id,
                driverFirstname: driver.firstname,
                driverLastname: driver.lastname,
                driverPhone: driver.phone,
                franchiseId: driver.franchise_id,
                dispatchMode: 1,
                scheduledDriver: scheduled === 1 ? driver.driver_id : 0,
            },
            conn
        );

        await createDriverAllocation(
            {
                bookingId,
                driverId: driver.driver_id,
                status: DRIVER_ALLOCATE_STATUS.PENDING_RESPONSE,
            },
            conn
        );

        await insertNotification(
            {
                personId: driver.driver_id,
                userType: 1,
                content: `Bạn có yêu cầu chuyến xe mới #${bookingId}`,
                nType: 2,
            },
            conn
        );

        return { assigned: true, driver_id: driver.driver_id };
    }

    return {
        async createBooking({ payload, auth, idempotencyKey, ipAddress }) {
            const normalizedPayload = normalizeCreatePayload(payload, auth);
            validateCreatePayload(normalizedPayload);

            const effectiveIdempotencyKey = toNullableString(idempotencyKey);
            if (!effectiveIdempotencyKey) {
                throw new AppError("Idempotency key is required.", 422, "MISSING_IDEMPOTENCY_KEY");
            }

            const cachedResponse = consumeCachedResponse(auth.userId, effectiveIdempotencyKey);
            if (cachedResponse) return cachedResponse;

            const inflightPromise = getInflightPromise(auth.userId, effectiveIdempotencyKey);
            if (inflightPromise) return inflightPromise;

            const operation = withUserMutex(auth.userId, async () =>
                executeInTransaction(async (conn) => {
                    const bookingUuid = buildBookingUuidFromIdempotency(effectiveIdempotencyKey);
                    const existingBookingId = await findBookingByUuidForUser(
                        { userId: normalizedPayload.user_id, bookingUuid },
                        conn
                    );

                    if (existingBookingId) {
                        const existing = await findBookingDetailById(existingBookingId);
                        if (!existing) throw new AppError("Idempotent booking lookup failed.", 500, "BOOKING_LOOKUP_FAILED");
                        return { booking: serializeBooking(existing.booking), idempotent_replay: true };
                    }

                    const passenger = await assertPassengerEligible(normalizedPayload.user_id, conn, { findPassengerById });
                    const { route } = await assertRouteAndRide(normalizedPayload, conn, { findRouteById, findRideById });

                    const activeBooking = await findUserActiveBookingForUpdate(normalizedPayload.user_id, conn);
                    if (activeBooking) {
                        throw new AppError("Passenger already has an active booking.", 409, "ACTIVE_BOOKING_EXISTS");
                    }

                    if (normalizedPayload.estimated_cost <= 0 && normalizedPayload.est_distance > 0 && normalizedPayload.est_duration > 0) {
                        const quote = await buildPriceQuote({
                            routeId: normalizedPayload.route_id,
                            rideId: normalizedPayload.ride_id,
                            distanceKm: normalizedPayload.est_distance,
                            durationMinutes: normalizedPayload.est_duration,
                            pickupDatetime: normalizedPayload.pickup_datetime,
                        });
                        normalizedPayload.estimated_cost = quote.estimated_cost;
                        normalizedPayload.cur_symbol = quote.cur_symbol;
                        normalizedPayload.cur_code = quote.cur_code;
                    }

                    const bookingId = await insertBooking(
                        {
                            ...normalizedPayload,
                            bookingUuid,
                            user_firstname: passenger.firstname,
                            user_lastname: passenger.lastname,
                            user_phone: passenger.phone,
                            pickup_datetime: normalizedPayload.pickup_datetime?.toISOString().slice(0, 19).replace("T", " ") || null,
                            status: BOOKING_STATUS.PENDING,
                        },
                        conn
                    );

                    // ── Wallet payment: lock, verify balance, charge atomically ─────────
                    // This must happen inside the same transaction so that a failed
                    // balance check rolls back the booking insert as well.
                    if (normalizedPayload.payment_type === 2) {
                        const chargeAmount = normalizedPayload.estimated_cost;
                        if (!(chargeAmount > 0)) {
                            throw new AppError(
                                "estimated_cost must be positive for wallet payment.",
                                422,
                                "INVALID_ESTIMATED_COST"
                            );
                        }

                        const customerWallet = await findWalletByActor(
                            { actorType: 0, actorId: normalizedPayload.user_id },
                            conn
                        );
                        if (!customerWallet || Number(customerWallet.status) !== 1) {
                            throw new AppError(
                                "Insufficient wallet balance. Please top up your wallet before booking.",
                                402,
                                "INSUFFICIENT_WALLET_BALANCE"
                            );
                        }

                        // Pessimistic lock — prevents concurrent deductions from the same wallet.
                        const lockedWallet = await findWalletByIdForUpdate(customerWallet.wallet_id, conn);
                        if (Number(lockedWallet.balance) < chargeAmount) {
                            throw new AppError(
                                "Insufficient wallet balance. Please top up your wallet before booking.",
                                402,
                                "INSUFFICIENT_WALLET_BALANCE"
                            );
                        }

                        const walletPaymentId = await insertPayment({
                            payment_code:             `RIDE-${Date.now()}-${crypto.createHash("md5").update(String(bookingId)).digest("hex").slice(0, 8).toUpperCase()}`,
                            payer_wallet_id:          lockedWallet.wallet_id,
                            actor_type:               0,
                            actor_id:                 normalizedPayload.user_id,
                            service_domain:           0,
                            booking_id:               bookingId,
                            amount:                   chargeAmount,
                            currency_id:              lockedWallet.currency_id,
                            status:                   "paid",
                            gateway_name:             null,
                            gateway_transaction_ref:  null,
                            description:              `Wallet payment for booking #${bookingId}`,
                        }, conn);

                        const nextBalance = Math.round((Number(lockedWallet.balance) - chargeAmount) * 100) / 100;
                        await updateWalletBalance(lockedWallet.wallet_id, nextBalance, conn);
                        await insertWalletLedger({
                            wallet_id:     lockedWallet.wallet_id,
                            payment_id:    walletPaymentId,
                            amount:        chargeAmount,
                            balance_after: nextBalance,
                            direction:     "debit",
                            entry_type:    "ride_payment",    // ✅ valid enum value
                            source_type:   "ride_booking",    // ✅ valid enum value
                            source_id:     bookingId,
                            description:   `Wallet payment for booking #${bookingId}`,
                        }, conn);

                        await markBookingPaidByWallet({ bookingId, paymentId: walletPaymentId, amount: chargeAmount }, conn);
                    }

                    await insertNotification(
                        {
                            personId: normalizedPayload.user_id,
                            userType: 0,
                            content: `Booking #${bookingId} created successfully`,
                            title: `Yêu cầu chuyến xe mới`,
                            body: `Bạn có yêu cầu chuyến xe mới #${bookingId}`,
                            nType: 2,
                        },
                        conn
                    );

                    let autoDispatchResult = null;
                    if (normalizedPayload.auto_dispatch === 1) {
                        if (normalizedPayload.scheduled === 1) {
                            autoDispatchResult = await tryAutoDispatch({
                                conn,
                                bookingId,
                                routeId: normalizedPayload.route_id,
                                rideId: normalizedPayload.ride_id,
                                scheduled: normalizedPayload.scheduled,
                            });
                        } else {
                            autoDispatchResult = { assigned: false, reason: "gps_dispatch_queued" };
                        }
                    }

                    const detail = await findBookingDetailById(bookingId);
                    if (!detail) throw new AppError("Created booking could not be loaded.", 500, "BOOKING_READ_FAILED");

                    await writeBookingAuditLog({
                        actor: auth,
                        action: "BOOKING_CREATED",
                        bookingId,
                        metadata: {
                            idempotency_key_hash: buildBookingUuidFromIdempotency(effectiveIdempotencyKey),
                            scheduled: normalizedPayload.scheduled,
                            payment_type: normalizedPayload.payment_type,
                            route_id: normalizedPayload.route_id,
                            route_scope: route.r_scope,
                            ride_id: normalizedPayload.ride_id,
                            auto_dispatch: normalizedPayload.auto_dispatch,
                            auto_dispatch_result: autoDispatchResult,
                            source_ip: ipAddress,
                        },
                    });

                    return {
                        booking: serializeBooking(detail.booking),
                        idempotent_replay: false,
                        auto_dispatch: autoDispatchResult,
                    };
                })
            );

            rememberInflightPromise(auth.userId, effectiveIdempotencyKey, operation);
            try {
                const result = await operation;
                rememberIdempotentResponse(auth.userId, effectiveIdempotencyKey, result);

                if (normalizedPayload.auto_dispatch === 1 && normalizedPayload.scheduled !== 1) {
                    const pickupLat = Number(normalizedPayload.pickup_lat);
                    const pickupLng = Number(normalizedPayload.pickup_long);
                    if (Number.isFinite(pickupLat) && Number.isFinite(pickupLng)) {
                        startRideDispatch(result.booking.id, pickupLat, pickupLng);
                    }
                }

                return result;
            } finally {
                clearInflightPromise(auth.userId, effectiveIdempotencyKey);
            }
        },

        async getBookingList({ query, auth }) {
            const filters = normalizeListFilters(query);
            if (auth.role === "passenger") {
                filters.userId = auth.userId;
            }

            const [items, totalItems, summary] = await Promise.all([
                listBookings(filters, auth),
                countBookings(filters, auth),
                countBookingsByScheduleType(filters, auth),
            ]);

            const totalPages = totalItems === 0 ? 0 : Math.ceil(totalItems / filters.limit);

            return {
                items: items.map(serializeBooking),
                pagination: {
                    page: filters.page,
                    limit: filters.limit,
                    totalPages,
                    hasNextPage: totalPages > 0 && filters.page < totalPages,
                    hasPrevPage: filters.page > 1,
                },
                summary,
                totalItems,
                filters,
            };
        },

        async getProcessingBookingList({ query, auth }) {
            return this.getBookingList({ query: { ...query, processing_only: 1 }, auth });
        },

        async getScheduledBookingList({ query, auth }) {
            return this.getBookingList({ query: { ...query, scheduled_only: 1 }, auth });
        },

        async getBookingDetail({ bookingId, auth }) {
            const detail = await resolveBookingDetailOrThrow(bookingId, auth, { findBookingDetailById });
            const [allocations, location] = await Promise.all([
                findBookingAllocations(bookingId),
                detail.booking.driver_id > 0 ? findLatestDriverLocation(detail.booking.driver_id) : Promise.resolve(null),
            ]);

            return {
                booking: serializeBooking(detail.booking),
                user: detail.user,
                driver: detail.driver,
                driver_location: location,
                allocations,
            };
        },

        async assignDriver({ bookingId, driverId, auth }) {
            if (!["admin", "dispatcher"].includes(auth.role)) throw new AppError("Forbidden", 403, "FORBIDDEN");

            const numericBookingId = Number(bookingId);
            const numericDriverId = Number(driverId);
            if (!Number.isInteger(numericBookingId) || numericBookingId < 1) throw new AppError("Invalid booking id.", 422, "INVALID_BOOKING_ID");
            if (!Number.isInteger(numericDriverId) || numericDriverId < 1) throw new AppError("Invalid driver id.", 422, "INVALID_DRIVER_ID");

            const result = await executeInTransaction(async (conn) => {
                const booking = await findBookingByIdForUpdate(numericBookingId, conn);
                if (!booking) throw new AppError("Booking not found.", 404, "BOOKING_NOT_FOUND");
                if (TERMINAL_STATUSES.has(booking.status)) throw new AppError("Cannot assign driver to finalized booking.", 409, "BOOKING_FINALIZED");

                const driver = await findDriverById(numericDriverId, conn);
                if (!driver) throw new AppError("Driver not found.", 404, "DRIVER_NOT_FOUND");
                if (driver.account_deleted === 1 || driver.account_active !== 1 || driver.is_activated !== 1) {
                    throw new AppError("Driver is not eligible for dispatch.", 409, "DRIVER_NOT_ELIGIBLE");
                }

                await finalizeNonAcceptedAllocations(numericBookingId, conn);

                await updateBookingDriverAssignment(
                    {
                        bookingId: numericBookingId,
                        driverId: driver.driver_id,
                        driverFirstname: driver.firstname,
                        driverLastname: driver.lastname,
                        driverPhone: driver.phone,
                        franchiseId: driver.franchise_id,
                        dispatchMode: 1,
                        scheduledDriver: booking.scheduled === 1 ? driver.driver_id : 0,
                    },
                    conn
                );

                const allocationId = await createDriverAllocation(
                    { bookingId: numericBookingId, driverId: driver.driver_id, status: DRIVER_ALLOCATE_STATUS.PENDING_RESPONSE },
                    conn
                );

                await insertNotification(
                    { personId: driver.driver_id, userType: 1, content: `Bạn có yêu cầu chuyến xe mới #${numericBookingId}`, nType: 2 },
                    conn
                );

                const detail = await findBookingDetailById(numericBookingId);
                if (!detail) throw new AppError("Booking read failed after assigning driver.", 500, "BOOKING_READ_FAILED");

                await writeBookingAuditLog({
                    actor: auth,
                    action: "BOOKING_DRIVER_ASSIGNED",
                    bookingId: numericBookingId,
                    metadata: { old_driver_id: booking.driver_id, new_driver_id: driver.driver_id },
                });

                return { ...detail, manualAllocationId: allocationId };
            });

            // Emit SSE immediately to the assigned driver so they see the request modal
            publishRealtimeEvent(
                "NEW_RIDE_REQUEST",
                {
                    allocation_id:   result.manualAllocationId,
                    booking_id:      numericBookingId,
                    expires_at:      new Date(Date.now() + 60_000).toISOString(),
                    timeout_sec:     60,
                    pickup_address:  result.booking?.pickup_address  ?? null,
                    dropoff_address: result.booking?.dropoff_address ?? null,
                    estimated_cost:  result.booking?.estimated_cost  ?? null,
                    pickup: {
                        lat:         result.booking?.pickup_lat  ?? null,
                        lng:         result.booking?.pickup_long ?? null,
                        distance_km: null,
                    },
                },
                { targetUserIds: [numericDriverId] }
            );

            return { booking: serializeBooking(result.booking) };
        },

        async updateBookingStatus({ bookingId, status, cancelComment, auth }) {
            const numericBookingId = Number(bookingId);
            const numericStatus = Number(status);
            if (!Number.isInteger(numericBookingId) || numericBookingId < 1) throw new AppError("Invalid booking id.", 422, "INVALID_BOOKING_ID");
            if (!Number.isInteger(numericStatus) || numericStatus < 0 || numericStatus > 6) throw new AppError("Invalid target status.", 422, "INVALID_BOOKING_STATUS");

            const isPassengerAction = auth.role === "passenger";
            if (!isPassengerAction && !["admin", "dispatcher"].includes(auth.role)) {
                throw new AppError("Forbidden", 403, "FORBIDDEN");
            }

            const detail = await executeInTransaction(async (conn) => {
                const booking = await findBookingByIdForUpdate(numericBookingId, conn);
                if (!booking) throw new AppError("Booking not found.", 404, "BOOKING_NOT_FOUND");

                if (isPassengerAction) {
                    if (booking.user_id !== auth.userId) throw new AppError("Forbidden", 403, "FORBIDDEN");
                    if (numericStatus !== BOOKING_STATUS.CANCELLED_BY_RIDER) throw new AppError("Passenger can only cancel booking.", 403, "FORBIDDEN_STATUS_CHANGE");
                }

                validateStateTransition(booking.status, numericStatus);
                await updateBookingStatus({ bookingId: numericBookingId, status: numericStatus, cancelComment: toNullableString(cancelComment) }, conn);

                if (TERMINAL_STATUSES.has(numericStatus)) {
                    await finalizeNonAcceptedAllocations(numericBookingId, conn);
                }

                if (numericStatus === BOOKING_STATUS.CANCELLED_BY_RIDER) {
                    const haspaid      = Number(booking.haspaid || 0);
                    const paymentType  = Number(booking.payment_type);
                    const refundAmount = Number(booking.paid_amount || 0);
                    const paymentId    = booking.transaction_id ?? null;

                    if (haspaid === 1 && paymentType === 2 && refundAmount > 0) {
                        const customerWallet = await findWalletByActor(
                            { actorType: 0, actorId: Number(booking.user_id) }, conn
                        );
                        if (customerWallet) {
                            const locked     = await findWalletByIdForUpdate(customerWallet.wallet_id, conn);
                            const newBalance = Math.round((Number(locked.balance) + refundAmount) * 100) / 100;
                            await updateWalletBalance(customerWallet.wallet_id, newBalance, conn);
                            await insertWalletLedger({
                                wallet_id:     customerWallet.wallet_id,
                                payment_id:    paymentId,
                                amount:        refundAmount,
                                balance_after: newBalance,
                                direction:     'credit',
                                entry_type:    'refund',
                                source_type:   'ride_booking',
                                source_id:     numericBookingId,
                                description:   `Refund for customer-cancelled ride #${numericBookingId}`,
                            }, conn);
                            if (paymentId) {
                                await updatePaymentStatusById(paymentId, 'refunded', conn);
                            }
                        }
                    }
                }

                const detailAfterUpdate = await findBookingDetailById(numericBookingId);
                if (!detailAfterUpdate) throw new AppError("Booking read failed after status update.", 500, "BOOKING_READ_FAILED");

                await writeBookingAuditLog({
                    actor: auth,
                    action: "BOOKING_STATUS_UPDATED",
                    bookingId: numericBookingId,
                    metadata: {
                        from_status: booking.status,
                        to_status: numericStatus,
                        cancel_comment: toNullableString(cancelComment),
                    },
                });

                return detailAfterUpdate;
            });

            await emitBookingStatusUpdated({
                bookingId: numericBookingId,
                status: numericStatus,
                userId: Number(detail.booking.user_id),
            });

            return { booking: serializeBooking(detail.booking) };
        },

        async listAssignableDrivers({ query, auth }) {
            if (!["admin", "dispatcher"].includes(auth.role)) throw new AppError("Forbidden", 403, "FORBIDDEN");

            const routeId = toOptionalInteger(query.route_id);
            const rideId = toOptionalInteger(query.ride_id);
            const limit = Math.min(Math.max(toOptionalInteger(query.limit) || 30, 1), 100);
            const search = toNullableString(query.search);
            const drivers = await listAssignableDrivers({ routeId, rideId, search, limit });
            return { items: drivers };
        },

        async getBookingMeta({ auth }) {
            if (!["admin", "dispatcher", "passenger"].includes(auth.role)) throw new AppError("Forbidden", 403, "FORBIDDEN");

            const [routes, rides] = await Promise.all([listBookingMetaRoutes(), listBookingMetaRides()]);
            return {
                booking_types: [
                    { value: 0, label: "Nội thành" },
                    { value: 1, label: "Liên tỉnh" },
                ],
                payment_types: [
                    { value: 1, label: "Tiền mặt" },
                    { value: 2, label: "Ví" },
                    { value: 3, label: "Thẻ" },
                    { value: 4, label: "POS" },
                ],
                routes,
                rides,
            };
        },

        async getLocationSuggestions({ query, auth }) {
            if (!["admin", "dispatcher", "passenger"].includes(auth.role)) throw new AppError("Forbidden", 403, "FORBIDDEN");
            const keyword = toNullableString(query.keyword);
            const limit = Math.min(Math.max(toOptionalInteger(query.limit) || 8, 1), 20);
            if (!keyword || keyword.length < 2) return { items: [] };
            const items = await listLocationSuggestions(keyword, limit);
            return { items };
        },

        async estimateRoute({ query, auth }) {
            if (!["admin", "dispatcher", "passenger"].includes(auth.role)) throw new AppError("Forbidden", 403, "FORBIDDEN");
            const estimate = normalizeRouteEstimateInput({
                pickup_lat: query.pickup_lat,
                pickup_lng: query.pickup_lng,
                dropoff_lat: query.dropoff_lat,
                dropoff_lng: query.dropoff_lng,
                route_scope: query.route_scope,
            });

            return {
                distance_km: estimate.distanceKm,
                duration_min: estimate.durationMinutes,
                route_scope: estimate.routeScope,
                source: "server_estimate",
            };
        },

        async quoteBookingPrice({ payload, auth }) {
            if (!["admin", "dispatcher", "passenger"].includes(auth.role)) throw new AppError("Forbidden", 403, "FORBIDDEN");

            const routeId = toOptionalInteger(payload.route_id);
            const rideId = toOptionalInteger(payload.ride_id);
            if (!Number.isInteger(routeId) || routeId < 1) throw new AppError("route_id is required.", 422, "INVALID_ROUTE_ID");
            if (!Number.isInteger(rideId) || rideId < 1) throw new AppError("ride_id is required.", 422, "INVALID_RIDE_ID");

            const [route, ride] = await Promise.all([findRouteById(routeId), findRideById(rideId)]);
            if (!route) throw new AppError("Route not found.", 404, "ROUTE_NOT_FOUND");
            if (!ride || ride.avail !== 1) throw new AppError("Ride type not found or unavailable.", 404, "RIDE_NOT_FOUND");

            let distanceKm = toOptionalNumber(payload.distance_km, NaN);
            let durationMinutes = toOptionalNumber(payload.duration_min, NaN);

            if (!(distanceKm > 0) || !(durationMinutes > 0)) {
                if (isValidLatLng(payload.pickup_lat, payload.pickup_lng) && isValidLatLng(payload.dropoff_lat, payload.dropoff_lng)) {
                    const estimate = normalizeRouteEstimateInput({
                        pickup_lat: payload.pickup_lat,
                        pickup_lng: payload.pickup_lng,
                        dropoff_lat: payload.dropoff_lat,
                        dropoff_lng: payload.dropoff_lng,
                        route_scope: route.r_scope,
                    });
                    distanceKm = estimate.distanceKm;
                    durationMinutes = estimate.durationMinutes;
                } else {
                    throw new AppError("distance/duration or pickup/dropoff coordinates are required for quote.", 422, "MISSING_ESTIMATE_INPUT");
                }
            }

            const quote = await buildPriceQuote({
                routeId,
                rideId,
                distanceKm,
                durationMinutes,
                pickupDatetime: toDateValue(payload.pickup_datetime, "pickup_datetime"),
            });

            return {
                ...quote,
                route_id: routeId,
                ride_id: rideId,
            };
        },

        constants: {
            BOOKING_STATUS,
            DRIVER_ALLOCATE_STATUS,
        },
    };
}

const bookingService = createBookingService();

export const createBooking = (...args) => bookingService.createBooking(...args);
export const getBookingList = (...args) => bookingService.getBookingList(...args);
export const getProcessingBookingList = (...args) => bookingService.getProcessingBookingList(...args);
export const getScheduledBookingList = (...args) => bookingService.getScheduledBookingList(...args);
export const getBookingDetail = (...args) => bookingService.getBookingDetail(...args);
export const assignDriver = (...args) => bookingService.assignDriver(...args);
export const changeBookingStatus = (...args) => bookingService.updateBookingStatus(...args);
export const getAssignableDrivers = (...args) => bookingService.listAssignableDrivers(...args);
export const getBookingMeta = (...args) => bookingService.getBookingMeta(...args);
export const getBookingLocationSuggestions = (...args) => bookingService.getLocationSuggestions(...args);
export const estimateBookingRoute = (...args) => bookingService.estimateRoute(...args);
export const quoteBookingPrice = (...args) => bookingService.quoteBookingPrice(...args);

export { BOOKING_STATUS, DRIVER_ALLOCATE_STATUS, ALLOWED_TRANSITIONS };
