import sqldb from "../../config/sqldatabase.js";
import AppError from "../../utils/appError.js";
import {
    findBookingForRating,
    refreshUserAverageRating,
} from "../../repositories/ratingRepository.js";
import {
    findDriverRatingForDriver,
    insertDriverRatingOnce,
} from "../../repositories/driver/tripRatingRepository.js";

// ─── Private helpers ──────────────────────────────────────────────────────────

function assertDriver(auth) {
    const driverId = Number(auth?.userId || 0);
    if (!driverId) throw new AppError("Forbidden", 403, "FORBIDDEN");
    return driverId;
}

/** booking.status === 3 means completed (consistent with existing ratingService.js) */
const BOOKING_STATUS_COMPLETED = 3;

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

// ─── Service ──────────────────────────────────────────────────────────────────

/**
 * Driver rates the customer (passenger) on a completed trip.
 *
 * Rules enforced:
 * 1. Booking must exist and belong to this driver.
 * 2. Booking must be completed (status = 3).
 * 3. Each (booking_id, driver_id) pair can only be rated once.
 * 4. Rating must be 1-5; comment is optional (max 500 chars from validator).
 * 5. After insert, refreshes the user's average rating on the users table.
 */
export async function rateCustomerByDriver(auth, bookingIdInput, payload) {
    const driverId  = assertDriver(auth);
    const bookingId = Number(bookingIdInput);

    if (!Number.isInteger(bookingId) || bookingId < 1) {
        throw new AppError("Invalid booking id.", 422, "INVALID_BOOKING_ID");
    }

    const rating  = Number(payload.rating);
    const comment = payload.comment === undefined || payload.comment === null
        ? null
        : String(payload.comment).trim() || null;

    return runInTransaction(async (conn) => {
        const booking = await findBookingForRating(bookingId, conn);

        if (!booking) {
            throw new AppError("Booking not found.", 404, "BOOKING_NOT_FOUND");
        }
        if (booking.driver_id !== driverId) {
            throw new AppError("Forbidden.", 403, "FORBIDDEN");
        }
        if (booking.status !== BOOKING_STATUS_COMPLETED) {
            throw new AppError(
                "Only completed bookings can be rated.",
                409,
                "BOOKING_NOT_COMPLETED"
            );
        }

        const existing = await findDriverRatingForDriver(bookingId, driverId, conn);
        if (existing) {
            throw new AppError(
                "You have already rated this booking.",
                409,
                "ALREADY_RATED"
            );
        }

        const ratingId = await insertDriverRatingOnce(
            { bookingId, driverId, rating, comment },
            conn
        );

        const userRatingAverage = await refreshUserAverageRating(booking.user_id, conn);

        return {
            rating_id:           ratingId,
            booking_id:          bookingId,
            driver_id:           driverId,
            user_id:             booking.user_id,
            rating,
            comment,
            user_rating_average: userRatingAverage,
        };
    });
}
