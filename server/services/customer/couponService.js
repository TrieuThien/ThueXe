import sqldb from "../../config/sqldatabase.js";
import AppError from "../../utils/appError.js";
import {
    applyCouponToRentalBooking,
    applyCouponToRideBooking,
    findCouponForUserByCode,
    findCustomerById,
    findRentalBookingForUser,
    findRideBookingForUser,
    listUnusedAvailableCouponsByUser,
    upsertCouponUsage,
} from "../../repositories/customer/couponRepository.js";

function round2(value) {
    return Number(Number(value || 0).toFixed(2));
}

function assertCustomer(auth) {
    const userId = Number(auth?.userId || 0);
    const isPassengerRole = auth?.role === "passenger";
    if (!userId || (!isPassengerRole && Number(auth?.userType) !== 0)) {
        throw new AppError("Forbidden", 403, "FORBIDDEN");
    }
    return userId;
}

function normalizeServiceDomain(value) {
    const domain = String(value || "").trim().toLowerCase();
    if (!["ride", "rental"].includes(domain)) {
        throw new AppError("service_domain must be ride or rental.", 400, "INVALID_SERVICE_DOMAIN");
    }
    return domain;
}

function validateCouponOrThrow(coupon, { bookingAmount, vehicleTypeId, invalidAsNotFound = false }) {
    if (!coupon) {
        throw new AppError(
            invalidAsNotFound ? "Coupon not found." : "Coupon is invalid.",
            400,
            invalidAsNotFound ? "COUPON_NOT_FOUND" : "COUPON_INVALID"
        );
    }

    if (Number(coupon.status) !== 1) {
        throw new AppError("Coupon is invalid.", 400, "COUPON_INVALID");
    }

    const now = Date.now();
    const activeAt = new Date(coupon.active_date).getTime();
    const expireAt = new Date(coupon.expiry_date).getTime();
    if (Number.isNaN(activeAt) || Number.isNaN(expireAt) || now < activeAt || now > expireAt) {
        throw new AppError("Coupon has expired or not active.", 400, "COUPON_EXPIRED");
    }

    if (Number(coupon.min_fare || 0) > Number(bookingAmount || 0)) {
        throw new AppError("Booking amount does not meet coupon minimum fare.", 400, "COUPON_MIN_FARE");
    }

    if (Number(coupon.limit_count) > 0 && Number(coupon.total_used || 0) >= Number(coupon.limit_count)) {
        throw new AppError("Coupon usage limit exceeded.", 409, "COUPON_USAGE_LIMIT");
    }

    if (
        Number(coupon.user_limit_count) > 0 &&
        Number(coupon.user_used || 0) >= Number(coupon.user_limit_count)
    ) {
        throw new AppError("You have exceeded the allowed usage for this coupon.", 409, "COUPON_USER_LIMIT");
    }

    if (
        Array.isArray(coupon.vehicle_type_ids) &&
        coupon.vehicle_type_ids.length > 0 &&
        vehicleTypeId &&
        !coupon.vehicle_type_ids.includes(Number(vehicleTypeId))
    ) {
        throw new AppError("Coupon is not applicable for this vehicle type.", 400, "COUPON_VEHICLE_TYPE_MISMATCH");
    }
}

function estimateDiscount(coupon, bookingAmount) {
    const amount = Number(bookingAmount || 0);
    let discount = 0;

    if (Number(coupon.discount_type) === 0) {
        discount = (amount * Number(coupon.discount_value || 0)) / 100;
        const maxDiscount = Number(coupon.max_discount_amount || 0);
        if (maxDiscount > 0) {
            discount = Math.min(discount, maxDiscount);
        }
    } else {
        discount = Number(coupon.discount_value || 0);
    }

    discount = Math.max(0, Math.min(discount, amount));
    return round2(discount);
}

function mapCoupon(coupon, estimatedDiscount = null, bookingAmount = null) {
    return {
        id: Number(coupon.id),
        coupon_code: coupon.coupon_code,
        coupon_title: coupon.coupon_title,
        service_type: Number(coupon.service_type || 0),
        discount_type: Number(coupon.discount_type || 0),
        discount_value: Number(coupon.discount_value || 0),
        min_fare: Number(coupon.min_fare || 0),
        max_discount_amount: Number(coupon.max_discount_amount || 0),
        active_date: coupon.active_date,
        expiry_date: coupon.expiry_date,
        vehicle_type_ids: Array.isArray(coupon.vehicle_type_ids) ? coupon.vehicle_type_ids : [],
        ...(estimatedDiscount === null
            ? {}
            : {
                  estimated_discount: estimatedDiscount,
                  estimated_total_after_discount: round2(Number(bookingAmount || 0) - Number(estimatedDiscount || 0)),
              }),
    };
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

async function ensureActiveCustomer(userId, conn = null, forUpdate = false) {
    const customer = await findCustomerById(userId, conn, forUpdate);
    if (!customer) throw new AppError("Customer not found.", 404, "CUSTOMER_NOT_FOUND");
    if (
        Number(customer.account_deleted || 0) === 1 ||
        Number(customer.account_active || 0) !== 1 ||
        Number(customer.is_activated || 0) !== 1
    ) {
        throw new AppError("Customer account is inactive.", 403, "ACCOUNT_INACTIVE");
    }
    if (!customer.route_id) {
        throw new AppError("Customer route is required.", 400, "CUSTOMER_ROUTE_REQUIRED");
    }
    return customer;
}

export async function validateCoupon(auth, payload) {
    const userId = assertCustomer(auth);

    return runInTransaction(async (conn) => {
        const customer = await ensureActiveCustomer(userId, conn);
        const serviceDomain = normalizeServiceDomain(payload.service_domain);
        const bookingAmount = Number(payload.booking_amount || 0);
        const vehicleTypeId = payload.vehicle_type_id ? Number(payload.vehicle_type_id) : null;

        const coupon = await findCouponForUserByCode(
            {
                couponCode: String(payload.coupon_code || "").trim().toUpperCase(),
                routeId: Number(customer.route_id),
                serviceDomain,
                userId,
            },
            conn,
            false
        );

        validateCouponOrThrow(coupon, {
            bookingAmount,
            vehicleTypeId,
            invalidAsNotFound: false,
        });

        const estimatedDiscount = estimateDiscount(coupon, bookingAmount);

        return {
            valid: true,
            service_domain: serviceDomain,
            booking_amount: round2(bookingAmount),
            coupon: mapCoupon(coupon, estimatedDiscount, bookingAmount),
        };
    });
}

export async function applyCoupon(auth, payload) {
    const userId = assertCustomer(auth);

    return runInTransaction(async (conn) => {
        const customer = await ensureActiveCustomer(userId, conn, true);
        const hasBookingId = payload.booking_id !== undefined && payload.booking_id !== null && payload.booking_id !== "";
        const hasRentalId = payload.rental_id !== undefined && payload.rental_id !== null && payload.rental_id !== "";

        if ((hasBookingId && hasRentalId) || (!hasBookingId && !hasRentalId)) {
            throw new AppError("Provide either booking_id or rental_id.", 400, "INVALID_TARGET_BOOKING");
        }

        const serviceDomain = hasBookingId ? "ride" : "rental";
        const targetId = hasBookingId ? Number(payload.booking_id) : Number(payload.rental_id);

        let bookingAmount = 0;
        let vehicleTypeId = null;

        if (serviceDomain === "ride") {
            const booking = await findRideBookingForUser(targetId, userId, conn, true);
            if (!booking) throw new AppError("Ride booking not found.", 404, "BOOKING_NOT_FOUND");
            bookingAmount = Number(booking.estimated_cost || 0);
            vehicleTypeId = booking.ride_id ? Number(booking.ride_id) : null;
        } else {
            const rental = await findRentalBookingForUser(targetId, userId, conn, true);
            if (!rental) throw new AppError("Rental booking not found.", 404, "RENTAL_NOT_FOUND");
            bookingAmount = Number(rental.total_price || rental.base_price || 0);
            vehicleTypeId = rental.package_id ? Number(rental.package_id) : null;
        }

        const coupon = await findCouponForUserByCode(
            {
                couponCode: String(payload.coupon_code || "").trim().toUpperCase(),
                routeId: Number(customer.route_id),
                serviceDomain,
                userId,
            },
            conn,
            true
        );

        validateCouponOrThrow(coupon, {
            bookingAmount,
            vehicleTypeId,
            invalidAsNotFound: true,
        });

        if (serviceDomain === "ride") {
            await applyCouponToRideBooking({ bookingId: targetId, coupon }, conn);
        } else {
            const rentalUpdated = await applyCouponToRentalBooking({ rentalId: targetId, coupon }, conn);
            if (!rentalUpdated) {
                throw new AppError(
                    "Rental booking coupon fields are not available in current schema.",
                    400,
                    "RENTAL_COUPON_FIELDS_MISSING"
                );
            }
        }

        const timesUsed = await upsertCouponUsage({ couponId: coupon.id, userId }, conn);

        const estimatedDiscount = estimateDiscount(coupon, bookingAmount);

        return {
            applied: true,
            service_domain: serviceDomain,
            target_id: targetId,
            coupon: mapCoupon(coupon, estimatedDiscount, bookingAmount),
            usage: {
                user_id: userId,
                coupon_id: Number(coupon.id),
                times_used: timesUsed,
            },
        };
    });
}

export async function getMyAvailableCoupons(auth) {
    const userId = assertCustomer(auth);
    const customer = await ensureActiveCustomer(userId);

    const coupons = await listUnusedAvailableCouponsByUser({
        userId,
        routeId: Number(customer.route_id),
    });

    return {
        items: coupons.map((coupon) => mapCoupon(coupon)),
        totalItems: coupons.length,
    };
}
