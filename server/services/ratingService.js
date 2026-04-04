import sqldb from "../config/sqldatabase.js";
import AppError from "../utils/appError.js";
import {
    findBookingForRating,
    listRatingsByDriver,
    listRatingsByUser,
    refreshDriverAverageRating,
    refreshUserAverageRating,
    upsertDriverRating,
    upsertUserRating,
} from "../repositories/ratingRepository.js";

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

function normalizeRating(input) {
    const rating = Number(input);
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
        throw new AppError("rating must be an integer from 1 to 5.", 422, "INVALID_RATING");
    }
    return rating;
}

function normalizeComment(comment) {
    if (comment === undefined || comment === null) return null;
    const normalized = String(comment).trim();
    return normalized.length ? normalized : null;
}

export async function rateDriverByPassenger({ auth, payload }) {
    if (auth.role !== "passenger") {
        throw new AppError("Only passenger can rate driver here.", 403, "FORBIDDEN");
    }
    const bookingId = Number(payload.booking_id);
    if (!Number.isInteger(bookingId) || bookingId < 1) {
        throw new AppError("booking_id must be a positive integer.", 422, "INVALID_BOOKING_ID");
    }
    const rating = normalizeRating(payload.rating);
    const comment = normalizeComment(payload.comment);

    return runInTransaction(async (conn) => {
        const booking = await findBookingForRating(bookingId, conn);
        if (!booking) throw new AppError("Booking not found.", 404, "BOOKING_NOT_FOUND");
        if (booking.user_id !== Number(auth.userId)) throw new AppError("Forbidden", 403, "FORBIDDEN");
        if (booking.driver_id <= 0) throw new AppError("Booking has no driver.", 409, "NO_DRIVER_TO_RATE");
        if (booking.status !== 3) throw new AppError("Only completed booking can be rated.", 409, "BOOKING_NOT_COMPLETED");

        const ratingId = await upsertUserRating(
            {
                bookingId,
                userId: Number(auth.userId),
                rating,
                comment,
            },
            conn
        );
        const average = await refreshDriverAverageRating(booking.driver_id, conn);
        return {
            rating_id: ratingId,
            booking_id: bookingId,
            driver_id: booking.driver_id,
            rating,
            comment,
            driver_rating_average: average,
        };
    });
}

export async function ratePassengerByDriver({ auth, payload }) {
    if (auth.role !== "driver") {
        throw new AppError("Only driver can rate passenger here.", 403, "FORBIDDEN");
    }
    const bookingId = Number(payload.booking_id);
    if (!Number.isInteger(bookingId) || bookingId < 1) {
        throw new AppError("booking_id must be a positive integer.", 422, "INVALID_BOOKING_ID");
    }
    const rating = normalizeRating(payload.rating);
    const comment = normalizeComment(payload.comment);

    return runInTransaction(async (conn) => {
        const booking = await findBookingForRating(bookingId, conn);
        if (!booking) throw new AppError("Booking not found.", 404, "BOOKING_NOT_FOUND");
        if (booking.driver_id !== Number(auth.userId)) throw new AppError("Forbidden", 403, "FORBIDDEN");
        if (booking.status !== 3) throw new AppError("Only completed booking can be rated.", 409, "BOOKING_NOT_COMPLETED");

        const ratingId = await upsertDriverRating(
            {
                bookingId,
                driverId: Number(auth.userId),
                rating,
                comment,
            },
            conn
        );
        const average = await refreshUserAverageRating(booking.user_id, conn);
        return {
            rating_id: ratingId,
            booking_id: bookingId,
            user_id: booking.user_id,
            rating,
            comment,
            user_rating_average: average,
        };
    });
}

export async function listMyRatings({ auth }) {
    if (auth.role === "passenger") {
        return {
            items: await listRatingsByUser(Number(auth.userId)),
        };
    }
    if (auth.role === "driver") {
        return {
            items: await listRatingsByDriver(Number(auth.userId)),
        };
    }
    throw new AppError("Only passenger/driver has personal rating history.", 403, "FORBIDDEN");
}

