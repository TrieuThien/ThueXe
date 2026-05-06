import crypto from "crypto";
import sqldb from "../../config/sqldatabase.js";
import AppError from "../../utils/appError.js";
import { findOwnerEmailById } from "../../repositories/ownerRepository.js";
import { sendOwnerRentalRequestEmail } from "../emailService.js";
import {
    countRentalHistoryByUser,
    createRentalBooking,
    createWalletAccount,
    findCouponForCustomerRental,
    findCurrentRentalBookingByUser,
    findCustomerById,
    findDefaultCurrencyId,
    findDriverById,
    findRentalBookingByIdForUser,
    findRentalPackageById,
    findVehicleById,
    updateVehicleLocationByRental,
    findWalletByActorForUpdate,
    insertPayment,
    insertWalletLedger,
    isDriverAvailableInWindow,
    isVehicleAvailableInWindow,
    listAvailableDrivers,
    listAvailableVehicles,
    listRentalHistoryByUser,
    listRentalPackagesByServiceType,
    updateRentalAsCompleted,
    updateRentalBookingCancellation,
    updateWalletBalance,
    upsertCouponUsage,
} from "../../repositories/customer/rentalRepository.js";

const FINAL_STATUSES = new Set(["completed", "cancelled"]);

function round2(value) {
    return Number(Number(value || 0).toFixed(2));
}

function parseDateTime(value, fieldName) {
    const date = new Date(value);
    if (!value || Number.isNaN(date.getTime())) {
        throw new AppError(`${fieldName} must be a valid datetime.`, 422, "INVALID_DATETIME");
    }
    return date;
}

function toMySqlDatetime(date) {
    return date.toISOString().slice(0, 19).replace("T", " ");
}

function normalizePagination(query = {}) {
    const page = Math.max(Number(query.page || 1), 1);
    const limit = Math.min(Math.max(Number(query.limit || 20), 1), 100);
    return { page, limit, offset: (page - 1) * limit };
}

function assertCustomer(auth) {
    const userId = Number(auth?.userId || 0);
    const isPassengerRole = auth?.role === "passenger";
    if (!userId || (!isPassengerRole && Number(auth?.userType) !== 0)) {
        throw new AppError("Forbidden", 403, "FORBIDDEN");
    }
    return userId;
}

function ensureServiceType(serviceTypeInput) {
    const serviceType = Number(serviceTypeInput);
    if (![1, 2, 3].includes(serviceType)) {
        throw new AppError("service_type must be one of 1,2,3.", 422, "INVALID_SERVICE_TYPE");
    }
    return serviceType;
}

function computeDurationHours(start, end) {
    return Math.max(Math.ceil((end.getTime() - start.getTime()) / (60 * 60 * 1000)), 1);
}

function calculateFareBreakdown({ rentalPackage, durationHours, distanceKm }) {
    const packageDuration = Number(rentalPackage.duration_hours || 0);
    const distanceLimit = Number(rentalPackage.distance_limit_km || 0);

    const overtimeHours = Math.max(Number(durationHours) - packageDuration, 0);
    const exceededDistanceKm = Math.max(Number(distanceKm) - distanceLimit, 0);

    const extraTimeFee = round2(overtimeHours * Number(rentalPackage.extra_time_fee || 0));
    const extraDistanceFee = round2(exceededDistanceKm * Number(rentalPackage.extra_distance_fee || 0));

    const basePrice = round2(rentalPackage.base_price);
    const depositAmount = round2(rentalPackage.deposit_amount);
    const subtotal = round2(basePrice + extraTimeFee + extraDistanceFee);

    return {
        package: {
            package_id: Number(rentalPackage.package_id),
            package_name: rentalPackage.package_name,
            duration_hours: packageDuration,
            distance_limit_km: distanceLimit,
        },
        base_price: basePrice,
        overtime_hours: round2(overtimeHours),
        exceeded_distance_km: round2(exceededDistanceKm),
        extra_time_fee: extraTimeFee,
        extra_distance_fee: extraDistanceFee,
        subtotal,
        deposit_amount: depositAmount,
    };
}

function validateCouponUsability(coupon, { subtotal, packageTypeId = null }) {
    if (!coupon) throw new AppError("Coupon not found.", 404, "COUPON_NOT_FOUND");
    if (coupon.status !== 1) throw new AppError("Coupon is inactive.", 409, "COUPON_INACTIVE");

    const now = Date.now();
    const activeAt = new Date(coupon.active_date).getTime();
    const expireAt = new Date(coupon.expiry_date).getTime();
    if (Number.isNaN(activeAt) || Number.isNaN(expireAt) || now < activeAt || now > expireAt) {
        throw new AppError("Coupon is expired or not active.", 409, "COUPON_EXPIRED");
    }

    if (Number(subtotal) < Number(coupon.min_fare || 0)) {
        throw new AppError("Order value does not meet coupon minimum fare.", 409, "COUPON_MIN_FARE");
    }

    if (Number(coupon.limit_count) > 0 && Number(coupon.total_used || 0) >= Number(coupon.limit_count)) {
        throw new AppError("Coupon usage limit reached.", 409, "COUPON_USAGE_LIMIT");
    }

    if (
        Number(coupon.user_limit_count) > 0 &&
        Number(coupon.user_used || 0) >= Number(coupon.user_limit_count)
    ) {
        throw new AppError("You have reached coupon usage limit.", 409, "COUPON_USER_LIMIT");
    }

    if (
        packageTypeId &&
        Array.isArray(coupon.vehicle_type_ids) &&
        coupon.vehicle_type_ids.length > 0 &&
        !coupon.vehicle_type_ids.includes(Number(packageTypeId))
    ) {
        throw new AppError("Coupon is not valid for this package type.", 409, "COUPON_INVALID_PACKAGE_TYPE");
    }
}

function calculateDiscount(coupon, subtotal) {
    if (!coupon) return 0;

    let discount = 0;
    if (Number(coupon.discount_type) === 0) {
        discount = (Number(subtotal) * Number(coupon.discount_value || 0)) / 100;
        if (Number(coupon.max_discount_amount || 0) > 0) {
            discount = Math.min(discount, Number(coupon.max_discount_amount || 0));
        }
    } else {
        discount = Number(coupon.discount_value || 0);
    }

    return round2(Math.max(0, Math.min(discount, Number(subtotal))));
}

function buildPaymentCode(prefix = "RRF") {
    return `${prefix}-${Date.now()}-${crypto.randomBytes(3).toString("hex").toUpperCase()}`;
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

async function ensureCustomer(userId, conn = null, forUpdate = false) {
    const customer = await findCustomerById(userId, conn, forUpdate);
    if (!customer) throw new AppError("Customer not found.", 404, "CUSTOMER_NOT_FOUND");
    if (Number(customer.account_deleted || 0) === 1 || Number(customer.account_active || 0) !== 1 || Number(customer.is_activated || 0) !== 1) {
        throw new AppError("Customer account is inactive.", 403, "ACCOUNT_INACTIVE");
    }
    return customer;
}

function mapRentalBooking(row) {
    if (!row) return null;

    return {
        rental_id: Number(row.rental_id),
        rental_code: row.rental_code,
        user_id: Number(row.user_id),
        package_id: row.package_id === null ? null : Number(row.package_id),
        package_name: row.package_name,
        service_type: Number(row.service_type || 0),
        vehicle_id: row.vehicle_id === null ? null : Number(row.vehicle_id),
        driver_id: row.driver_id === null ? null : Number(row.driver_id),
        vehicle: row.vehicle_id
            ? {
                  plate_number: row.license_plate,
                  vehicle_type: row.vehicle_type,
              }
            : null,
        driver: row.driver_id
            ? {
                  name: row.driver_name,
                  rating: Number(row.driver_rating || 0),
              }
            : null,
        start_datetime: row.start_datetime,
        end_datetime: row.end_datetime,
        actual_end_datetime: row.actual_end_datetime,
        pickup_address: row.pickup_address,
        dropoff_address: row.dropoff_address,
        distance_limit_km: Number(row.distance_limit_km || 0),
        distance_travelled_km: Number(row.distance_travelled_km || 0),
        base_price: Number(row.base_price || 0),
        extra_time_fee: Number(row.extra_time_fee || 0),
        extra_distance_fee: Number(row.extra_distance_fee || 0),
        deposit_amount: Number(row.deposit_amount || 0),
        total_price: Number(row.total_price || 0),
        owner_name: row.owner_name ?? null,
        owner_phone: row.owner_phone ?? null,
        payment_status: row.payment_status,
        payment_type: row.payment_type === null ? null : Number(row.payment_type),
        payment_method: row.payment_type === null ? null : (row.payment_type === 2 ? 'Ví ThueXe' : 'Tiền mặt'),
        status: row.status,
        cancel_reason: row.cancel_reason,
        created_at: row.created_at,
        updated_at: row.updated_at,
    };
}

async function resolveCoupon({ couponCode, serviceType, customer, subtotal, packageInfo, conn, forUpdate = false }) {
    if (!couponCode) {
        return {
            coupon: null,
            discountAmount: 0,
        };
    }

    if (!customer.route_id) {
        throw new AppError("Customer route is required to apply coupon.", 409, "CUSTOMER_ROUTE_REQUIRED");
    }

    const normalizedCode = String(couponCode).trim().toUpperCase();
    const coupon = await findCouponForCustomerRental(
        {
            couponCode: normalizedCode,
            routeId: Number(customer.route_id),
            serviceType,
            userId: Number(customer.user_id),
        },
        conn,
        forUpdate
    );

    validateCouponUsability(coupon, {
        subtotal,
        packageTypeId: packageInfo.type_id,
    });

    return {
        coupon,
        discountAmount: calculateDiscount(coupon, subtotal),
    };
}

export async function getRentalPackages(auth, query = {}) {
    const userId = assertCustomer(auth);
    await ensureCustomer(userId);

    const serviceType = ensureServiceType(query.service_type);
    const items = await listRentalPackagesByServiceType(serviceType);
    return {
        items: items.map((item) => ({
            package_id: item.package_id,
            package_name: item.package_name,
            duration_hours: item.duration_hours,
            distance_limit_km: item.distance_limit_km,
            base_price: item.base_price,
            deposit_amount: item.deposit_amount,
            extra_time_fee: item.extra_time_fee,
            extra_distance_fee: item.extra_distance_fee,
        })),
    };
}

export async function estimateRentalFare(auth, payload) {
    const userId = assertCustomer(auth);

    return runInTransaction(async (conn) => {
        const customer = await ensureCustomer(userId, conn);
        const serviceType = ensureServiceType(payload.service_type);

        const rentalPackage = await findRentalPackageById(Number(payload.package_id), conn, false);
        if (!rentalPackage || Number(rentalPackage.active) !== 1) {
            throw new AppError("Rental package not found or inactive.", 404, "RENTAL_PACKAGE_NOT_FOUND");
        }
        if (Number(rentalPackage.service_type) !== serviceType) {
            throw new AppError("Package does not match service type.", 409, "PACKAGE_SERVICE_TYPE_MISMATCH");
        }

        const startDatetime = parseDateTime(payload.start_datetime, "start_datetime");
        const durationHours = Number(payload.duration_hours || rentalPackage.duration_hours || 0);
        if (!(durationHours > 0)) {
            throw new AppError("duration_hours must be greater than 0.", 422, "INVALID_DURATION_HOURS");
        }

        const distanceKm = Number(payload.distance_km || 0);
        if (distanceKm < 0) {
            throw new AppError("distance_km must be non-negative.", 422, "INVALID_DISTANCE_KM");
        }

        const breakdown = calculateFareBreakdown({
            rentalPackage,
            durationHours,
            distanceKm,
        });

        const { coupon, discountAmount } = await resolveCoupon({
            couponCode: payload.coupon_code,
            serviceType,
            customer,
            subtotal: breakdown.subtotal,
            packageInfo: rentalPackage,
            conn,
            forUpdate: false,
        });

        return {
            service_type: serviceType,
            package_id: Number(rentalPackage.package_id),
            start_datetime: toMySqlDatetime(startDatetime),
            duration_hours: round2(durationHours),
            distance_km: round2(distanceKm),
            breakdown: {
                ...breakdown,
                discount_amount: discountAmount,
                total_price: round2(breakdown.subtotal - discountAmount),
            },
            coupon: coupon
                ? {
                      coupon_code: coupon.coupon_code,
                      discount_type: Number(coupon.discount_type),
                      discount_value: Number(coupon.discount_value),
                  }
                : null,
        };
    });
}

export async function createRentalBookingForCustomer(auth, payload) {
    const userId = assertCustomer(auth);

    return runInTransaction(async (conn) => {
        const customer = await ensureCustomer(userId, conn, true);
        const serviceType = ensureServiceType(payload.service_type);

        const existing = await findCurrentRentalBookingByUser(userId, conn);
        if (existing) {
            throw new AppError("You already have an active rental booking.", 409, "ACTIVE_RENTAL_EXISTS");
        }

        const rentalPackage = await findRentalPackageById(Number(payload.package_id), conn, true);
        if (!rentalPackage || Number(rentalPackage.active) !== 1) {
            throw new AppError("Rental package not found or inactive.", 404, "RENTAL_PACKAGE_NOT_FOUND");
        }
        if (Number(rentalPackage.service_type) !== serviceType) {
            throw new AppError("Package does not match service type.", 409, "PACKAGE_SERVICE_TYPE_MISMATCH");
        }

        const startDatetime = parseDateTime(payload.start_datetime, "start_datetime");
        const now = Date.now();

        let endDatetime = payload.end_datetime
            ? parseDateTime(payload.end_datetime, "end_datetime")
            : new Date(startDatetime.getTime() + Number(rentalPackage.duration_hours || payload.duration_hours || 1) * 60 * 60 * 1000);

        if (endDatetime.getTime() <= startDatetime.getTime()) {
            throw new AppError("end_datetime must be greater than start_datetime.", 422, "INVALID_TIME_RANGE");
        }

        const requestedDurationHours = payload.duration_hours
            ? Number(payload.duration_hours)
            : computeDurationHours(startDatetime, endDatetime);

        if (!(requestedDurationHours > 0)) {
            throw new AppError("duration_hours must be greater than 0.", 422, "INVALID_DURATION_HOURS");
        }

        const distanceKm = Number(payload.distance_km || rentalPackage.distance_limit_km || 0);
        if (distanceKm < 0) {
            throw new AppError("distance_km must be non-negative.", 422, "INVALID_DISTANCE_KM");
        }

        const vehicleId = payload.vehicle_id === undefined || payload.vehicle_id === null || payload.vehicle_id === ""
            ? null
            : Number(payload.vehicle_id);
        const driverId = payload.driver_id === undefined || payload.driver_id === null || payload.driver_id === ""
            ? null
            : Number(payload.driver_id);

        if (serviceType === 3 && (!vehicleId || !driverId)) {
            throw new AppError(
                "service_type 3 requires both vehicle_id and driver_id.",
                422,
                "MISSING_VEHICLE_OR_DRIVER"
            );
        }

        let ownerId = null;

        if (vehicleId) {
            const vehicle = await findVehicleById(vehicleId, conn);
            if (!vehicle) throw new AppError("Vehicle not found.", 404, "VEHICLE_NOT_FOUND");

            const vehicleAvailable = await isVehicleAvailableInWindow(
                vehicleId,
                toMySqlDatetime(startDatetime),
                toMySqlDatetime(endDatetime),
                conn
            );
            if (!vehicleAvailable) {
                throw new AppError("Vehicle is not available in selected time range.", 409, "VEHICLE_NOT_AVAILABLE");
            }

            ownerId = Number(vehicle.owner_id);
        }

        if (driverId) {
            const driver = await findDriverById(driverId, conn);
            if (!driver) throw new AppError("Driver not found.", 404, "DRIVER_NOT_FOUND");

            const driverAvailable = await isDriverAvailableInWindow(
                driverId,
                toMySqlDatetime(startDatetime),
                toMySqlDatetime(endDatetime),
                conn
            );
            if (!driverAvailable) {
                throw new AppError("Driver is not available in selected time range.", 409, "DRIVER_NOT_AVAILABLE");
            }
        }

        const breakdown = calculateFareBreakdown({
            rentalPackage,
            durationHours: requestedDurationHours,
            distanceKm,
        });

        const { coupon, discountAmount } = await resolveCoupon({
            couponCode: payload.coupon_code,
            serviceType,
            customer,
            subtotal: breakdown.subtotal,
            packageInfo: rentalPackage,
            conn,
            forUpdate: true,
        });

        if (coupon) {
            await upsertCouponUsage({ couponId: coupon.id, userId }, conn);
        }

        const totalPrice = round2(breakdown.subtotal - discountAmount + breakdown.deposit_amount);
        const status = startDatetime.getTime() > now ? "scheduled" : "pending";

        const rentalId = await createRentalBooking(
            {
                rental_code: crypto.randomBytes(16).toString("hex"),
                user_id: userId,
                vehicle_id: vehicleId,
                driver_id: driverId,
                package_id: Number(rentalPackage.package_id),
                owner_id: ownerId,
                service_type: serviceType,
                start_datetime: toMySqlDatetime(startDatetime),
                end_datetime: toMySqlDatetime(endDatetime),
                pickup_address: String(payload.pickup_address || "").trim(),
                dropoff_address: payload.dropoff_address ? String(payload.dropoff_address).trim() : null,
                distance_limit_km: Number(rentalPackage.distance_limit_km || 0),
                distance_travelled_km: 0,
                base_price: breakdown.base_price,
                extra_time_fee: breakdown.extra_time_fee,
                extra_distance_fee: breakdown.extra_distance_fee,
                deposit_amount: breakdown.deposit_amount,
                total_price: totalPrice,
                payment_status: "pending",
                payment_type: payload.payment_type === undefined ? null : Number(payload.payment_type),
                status,
            },
            conn
        );

        const created = await findRentalBookingByIdForUser(rentalId, userId, conn);

        // Gửi email thông báo cho chủ xe (bất đồng bộ, không ảnh hưởng response)
        if (ownerId) {
            const customerName = `${customer.firstname || ""} ${customer.lastname || ""}`.trim() || "Khách hàng";
            findOwnerEmailById(ownerId).then((ownerInfo) => {
                if (ownerInfo?.email) {
                    sendOwnerRentalRequestEmail({
                        toEmail: ownerInfo.email,
                        ownerName: ownerInfo.fullname || "Chủ xe",
                        customerName,
                        packageName: rentalPackage.package_name,
                        startDatetime: toMySqlDatetime(startDatetime),
                        durationHours: requestedDurationHours,
                        pickupAddress: String(payload.pickup_address || ""),
                        rentalCode: created?.rental_code || String(rentalId),
                    }).catch(() => {});
                }
            }).catch(() => {});
        }

        return {
            booking: mapRentalBooking(created),
            pricing: {
                ...breakdown,
                discount_amount: discountAmount,
                total_price: round2(breakdown.subtotal - discountAmount),
                total_payable: totalPrice,
            },
            coupon: coupon ? { coupon_code: coupon.coupon_code } : null,
        };
    });
}

export async function getCurrentRentalBooking(auth) {
    const userId = assertCustomer(auth);
    await ensureCustomer(userId);

    const rentalId = await findCurrentRentalBookingByUser(userId);
    if (!rentalId) return { booking: null };

    const booking = await findRentalBookingByIdForUser(rentalId, userId);
    return { booking: mapRentalBooking(booking) };
}

export async function getRentalBookingDetail(auth, rentalIdInput) {
    const userId = assertCustomer(auth);
    await ensureCustomer(userId);

    const rentalId = Number(rentalIdInput);
    const booking = await findRentalBookingByIdForUser(rentalId, userId);
    if (!booking) throw new AppError("Rental booking not found.", 404, "RENTAL_BOOKING_NOT_FOUND");

    return { booking: mapRentalBooking(booking) };
}

export async function getRentalBookingHistory(auth, query = {}) {
    const userId = assertCustomer(auth);
    await ensureCustomer(userId);

    const { page, limit, offset } = normalizePagination(query);

    const [ids, totalItems] = await Promise.all([
        listRentalHistoryByUser(userId, { limit, offset }),
        countRentalHistoryByUser(userId),
    ]);

    const details = await Promise.all(ids.map((id) => findRentalBookingByIdForUser(id, userId)));
    const items = details.filter(Boolean).map((row) => mapRentalBooking(row));
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
    };
}

export async function cancelRentalBooking(auth, rentalIdInput, payload = {}) {
    const userId = assertCustomer(auth);

    return runInTransaction(async (conn) => {
        await ensureCustomer(userId, conn, true);

        const rentalId = Number(rentalIdInput);
        const booking = await findRentalBookingByIdForUser(rentalId, userId, conn, true);
        if (!booking) throw new AppError("Rental booking not found.", 404, "RENTAL_BOOKING_NOT_FOUND");

        if (FINAL_STATUSES.has(String(booking.status))) {
            throw new AppError("Rental booking is already finalized.", 409, "RENTAL_FINALIZED");
        }
        if (String(booking.status) === "in_progress") {
            throw new AppError("Cannot cancel after rental has started.", 409, "RENTAL_ALREADY_STARTED");
        }

        const cancelDeadlineMinutes = Number(process.env.RENTAL_CANCEL_DEADLINE_MINUTES || 30);
        const startAtMs = new Date(booking.start_datetime).getTime();
        if (Number.isFinite(startAtMs)) {
            const latestCancelableAt = startAtMs - cancelDeadlineMinutes * 60 * 1000;
            if (Date.now() > latestCancelableAt) {
                throw new AppError("Cancellation window has passed.", 409, "RENTAL_CANCEL_WINDOW_PASSED");
            }
        }

        let refundAmount = 0;
        let nextPaymentStatus = null;

        if (String(booking.payment_status) === "paid" && Number(booking.deposit_amount || 0) > 0) {
            refundAmount = round2(Number(booking.deposit_amount || 0));

            let wallet = await findWalletByActorForUpdate({ actorType: 0, actorId: userId }, conn);
            if (!wallet) {
                const currencyId = await findDefaultCurrencyId(conn);
                await createWalletAccount({ actorType: 0, actorId: userId, currencyId }, conn);
                wallet = await findWalletByActorForUpdate({ actorType: 0, actorId: userId }, conn);
            }

            if (!wallet || Number(wallet.status || 0) !== 1) {
                throw new AppError("Wallet is not available for refund.", 409, "WALLET_UNAVAILABLE");
            }

            const nextBalance = round2(Number(wallet.balance || 0) + refundAmount);
            const paymentId = await insertPayment(
                {
                    payment_code: buildPaymentCode(),
                    payer_wallet_id: Number(wallet.wallet_id),
                    actor_type: 0,
                    actor_id: userId,
                    service_domain: 1,
                    booking_id: null,
                    rental_id: Number(booking.rental_id),
                    amount: refundAmount,
                    currency_id: Number(wallet.currency_id || 1),
                    status: "paid",
                    description: `Refund deposit for rental #${booking.rental_id}`,
                },
                conn
            );

            await updateWalletBalance(Number(wallet.wallet_id), nextBalance, conn);
            await insertWalletLedger(
                {
                    wallet_id: Number(wallet.wallet_id),
                    payment_id: paymentId,
                    amount: refundAmount,
                    balance_after: nextBalance,
                    direction: "credit",
                    entry_type: "refund",
                    source_type: "rental_booking",
                    source_id: Number(booking.rental_id),
                    description: `Refund deposit for rental #${booking.rental_id}`,
                },
                conn
            );

            nextPaymentStatus = "refunded";
        }

        await updateRentalBookingCancellation(
            {
                rentalId,
                status: "cancelled",
                cancelReason: payload.reason ? String(payload.reason).trim() : "Cancelled by customer",
                paymentStatus: nextPaymentStatus,
            },
            conn
        );

        const updated = await findRentalBookingByIdForUser(rentalId, userId, conn);
        return {
            booking: mapRentalBooking(updated),
            refund_amount: refundAmount,
        };
    });
}

export async function getAvailableRentalVehicles(auth, query) {
    const userId = assertCustomer(auth);
    await ensureCustomer(userId);

    const startDatetime = toMySqlDatetime(parseDateTime(query.start_datetime, "start_datetime"));
    const endDatetime = toMySqlDatetime(parseDateTime(query.end_datetime, "end_datetime"));

    if (new Date(endDatetime).getTime() <= new Date(startDatetime).getTime()) {
        throw new AppError("end_datetime must be greater than start_datetime.", 422, "INVALID_TIME_RANGE");
    }

    const items = await listAvailableVehicles({ startDatetime, endDatetime });
    return { items };
}

export async function getAvailableRentalDrivers(auth, query) {
    const userId = assertCustomer(auth);
    await ensureCustomer(userId);

    const startDatetime = toMySqlDatetime(parseDateTime(query.start_datetime, "start_datetime"));
    const endDatetime = toMySqlDatetime(parseDateTime(query.end_datetime, "end_datetime"));

    if (new Date(endDatetime).getTime() <= new Date(startDatetime).getTime()) {
        throw new AppError("end_datetime must be greater than start_datetime.", 422, "INVALID_TIME_RANGE");
    }

    const items = await listAvailableDrivers({ startDatetime, endDatetime });
    return { items };
}

export async function completeRentalBooking(auth, rentalIdInput, payload) {
    const userId = assertCustomer(auth);

    return runInTransaction(async (conn) => {
        await ensureCustomer(userId, conn);

        const rentalId = Number(rentalIdInput);
        const booking = await findRentalBookingByIdForUser(rentalId, userId, conn, true);
        if (!booking) throw new AppError("Rental booking not found.", 404, "RENTAL_BOOKING_NOT_FOUND");

        if (String(booking.status) === "cancelled") {
            throw new AppError("Cancelled booking cannot be completed.", 409, "RENTAL_CANCELLED");
        }

        const actualEnd = payload?.actual_end_datetime
            ? parseDateTime(payload.actual_end_datetime, "actual_end_datetime")
            : new Date();

        const packageInfo = await findRentalPackageById(Number(booking.package_id), conn, false);
        const distanceTravelledKm = round2(payload?.distance_travelled_km ?? booking.distance_travelled_km ?? 0);

        const durationHours = computeDurationHours(new Date(booking.start_datetime), actualEnd);

        const extraTimeFeeRate = Number(packageInfo?.extra_time_fee || 0);
        const distanceLimitKm = Number(packageInfo?.distance_limit_km || booking.distance_limit_km || 0);
        const extraDistanceFeeRate = Number(packageInfo?.extra_distance_fee || 0);
        const includedDuration = Number(packageInfo?.duration_hours || 0);

        const overtimeHours = Math.max(durationHours - includedDuration, 0);
        const exceededDistanceKm = Math.max(distanceTravelledKm - distanceLimitKm, 0);

        const extraTimeFee = round2(overtimeHours * extraTimeFeeRate);
        const extraDistanceFee = round2(exceededDistanceKm * extraDistanceFeeRate);
        const totalPrice = round2(
            Number(booking.base_price || 0) +
                Number(booking.deposit_amount || 0) +
                extraTimeFee +
                extraDistanceFee
        );

        await updateRentalAsCompleted(
            {
                rentalId,
                actualEndDatetime: toMySqlDatetime(actualEnd),
                distanceTravelledKm,
                extraTimeFee,
                extraDistanceFee,
                totalPrice,
            },
            conn
        );

        const updated = await findRentalBookingByIdForUser(rentalId, userId, conn);
        return { booking: mapRentalBooking(updated) };
    });
}

export async function updateRentalLocation(auth, rentalIdInput, payload) {
    const userId = assertCustomer(auth);
    const rentalId = Number(rentalIdInput);
    const lat = Number(payload.lat);
    const lng = Number(payload.lng);

    if (!Number.isFinite(lat) || lat < -90 || lat > 90)
        throw new AppError("lat không hợp lệ.", 422, "INVALID_LAT");
    if (!Number.isFinite(lng) || lng < -180 || lng > 180)
        throw new AppError("lng không hợp lệ.", 422, "INVALID_LNG");

    const updated = await updateVehicleLocationByRental(rentalId, userId, lat, lng);
    if (!updated)
        throw new AppError("Đơn thuê không tồn tại hoặc chưa bắt đầu.", 404, "RENTAL_NOT_IN_PROGRESS");

    return { rental_id: rentalId, lat, lng };
}
