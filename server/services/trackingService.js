import sqldb from "../config/sqldatabase.js";
import AppError from "../utils/appError.js";
import {
    createDriverTravelRouteRecord,
    findBookingDriver,
    findDriverTravelRouteRecord,
    getDriverCurrentLocation,
    updateDriverTravelRouteRecord,
    upsertDriverCurrentLocation,
} from "../repositories/trackingRepository.js";

function ensureCoordinates(lat, long) {
    const latNum = Number(lat);
    const longNum = Number(long);
    if (!Number.isFinite(latNum) || latNum < -90 || latNum > 90) {
        throw new AppError("lat must be in range -90..90", 422, "INVALID_LATITUDE");
    }
    if (!Number.isFinite(longNum) || longNum < -180 || longNum > 180) {
        throw new AppError("long must be in range -180..180", 422, "INVALID_LONGITUDE");
    }
    return { lat: latNum, long: longNum };
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

export async function updateMyDriverLocation({ auth, payload }) {
    if (auth.role !== "driver") {
        throw new AppError("Only driver can update location.", 403, "FORBIDDEN");
    }
    const { lat, long } = ensureCoordinates(payload.lat, payload.long);
    const bAngle = payload.b_angle === undefined || payload.b_angle === null ? 0 : Number(payload.b_angle);
    const staticStatus = payload.loc_static_status === undefined ? 0 : Number(payload.loc_static_status);
    const staticDuration =
        payload.loc_static_duration === undefined || payload.loc_static_duration === null || payload.loc_static_duration === ""
            ? null
            : Number(payload.loc_static_duration);

    await upsertDriverCurrentLocation({
        driver_id: Number(auth.userId),
        long,
        lat,
        b_angle: Number.isFinite(bAngle) ? bAngle : 0,
        loc_static_status: Number.isFinite(staticStatus) ? staticStatus : 0,
        loc_static_duration: Number.isFinite(staticDuration) ? staticDuration : null,
    });

    return {
        location: await getDriverCurrentLocation(Number(auth.userId)),
    };
}

export async function getDriverLocationService({ driverId, auth }) {
    const numericDriverId = Number(driverId);
    if (!Number.isInteger(numericDriverId) || numericDriverId < 1) {
        throw new AppError("Invalid driver id.", 422, "INVALID_DRIVER_ID");
    }
    if (!["admin", "dispatcher", "passenger", "driver"].includes(auth.role)) {
        throw new AppError("Forbidden", 403, "FORBIDDEN");
    }
    return {
        location: await getDriverCurrentLocation(numericDriverId),
    };
}

export async function getBookingDriverLocationService({ bookingId, auth }) {
    const numericBookingId = Number(bookingId);
    if (!Number.isInteger(numericBookingId) || numericBookingId < 1) {
        throw new AppError("Invalid booking id.", 422, "INVALID_BOOKING_ID");
    }
    const booking = await findBookingDriver(numericBookingId);
    if (!booking) throw new AppError("Booking not found.", 404, "BOOKING_NOT_FOUND");

    if (auth.role === "passenger" && booking.user_id !== Number(auth.userId)) {
        throw new AppError("Forbidden", 403, "FORBIDDEN");
    }
    if (auth.role === "driver" && booking.driver_id !== Number(auth.userId)) {
        throw new AppError("Forbidden", 403, "FORBIDDEN");
    }

    return {
        booking_id: numericBookingId,
        driver_id: booking.driver_id || null,
        location: booking.driver_id ? await getDriverCurrentLocation(booking.driver_id) : null,
    };
}

export async function appendDriverRoutePointService({ bookingId, auth, payload }) {
    const numericBookingId = Number(bookingId);
    if (!Number.isInteger(numericBookingId) || numericBookingId < 1) {
        throw new AppError("Invalid booking id.", 422, "INVALID_BOOKING_ID");
    }
    if (auth.role !== "driver") {
        throw new AppError("Only driver can append travel route.", 403, "FORBIDDEN");
    }
    const { lat, long } = ensureCoordinates(payload.lat, payload.long);
    const booking = await findBookingDriver(numericBookingId);
    if (!booking) throw new AppError("Booking not found.", 404, "BOOKING_NOT_FOUND");
    if (booking.driver_id !== Number(auth.userId)) {
        throw new AppError("Forbidden", 403, "FORBIDDEN");
    }

    const point = {
        lat,
        long,
        b_angle: payload.b_angle === undefined ? 0 : Number(payload.b_angle),
        ts: new Date().toISOString(),
    };

    return runInTransaction(async (conn) => {
        const existing = await findDriverTravelRouteRecord(
            {
                bookingId: numericBookingId,
                driverId: Number(auth.userId),
            },
            conn
        );
        let route = [];
        if (existing?.route_data) {
            try {
                const parsed = JSON.parse(existing.route_data);
                if (Array.isArray(parsed)) route = parsed;
            } catch {
                route = [];
            }
        }
        route.push(point);
        const serialized = JSON.stringify(route);
        if (existing) {
            await updateDriverTravelRouteRecord(existing.id, serialized, conn);
        } else {
            await createDriverTravelRouteRecord(
                {
                    bookingId: numericBookingId,
                    driverId: Number(auth.userId),
                    routeData: serialized,
                },
                conn
            );
        }
        return {
            booking_id: numericBookingId,
            points_count: route.length,
            latest_point: point,
        };
    });
}

export async function getDriverRouteService({ bookingId, auth }) {
    const numericBookingId = Number(bookingId);
    if (!Number.isInteger(numericBookingId) || numericBookingId < 1) {
        throw new AppError("Invalid booking id.", 422, "INVALID_BOOKING_ID");
    }
    const booking = await findBookingDriver(numericBookingId);
    if (!booking) throw new AppError("Booking not found.", 404, "BOOKING_NOT_FOUND");
    if (auth.role === "passenger" && booking.user_id !== Number(auth.userId)) {
        throw new AppError("Forbidden", 403, "FORBIDDEN");
    }
    if (auth.role === "driver" && booking.driver_id !== Number(auth.userId)) {
        throw new AppError("Forbidden", 403, "FORBIDDEN");
    }
    const record = await findDriverTravelRouteRecord({
        bookingId: numericBookingId,
        driverId: booking.driver_id,
    });

    let route = [];
    if (record?.route_data) {
        try {
            const parsed = JSON.parse(record.route_data);
            if (Array.isArray(parsed)) route = parsed;
        } catch {
            route = [];
        }
    }
    return {
        booking_id: numericBookingId,
        driver_id: booking.driver_id,
        route,
    };
}

