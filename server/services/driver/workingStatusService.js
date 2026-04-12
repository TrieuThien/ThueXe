import {
    findDriverWorkingStatus,
    findAllRoutes,
    setDriverAvailable,
    setDriverServiceFlags,
    touchHeartbeat,
} from "../../repositories/driver/workingStatusRepository.js";
import {
    upsertDriverCurrentLocation,
    getDriverCurrentLocation,
} from "../../repositories/trackingRepository.js";
import AppError from "../../utils/appError.js";

// ─── Guards ───────────────────────────────────────────────────────────────────

function assertDriverActive(driver) {
    if (!driver) {
        throw new AppError("Driver not found.", 404, "DRIVER_NOT_FOUND");
    }
    if (driver.account_deleted === 1) {
        throw new AppError("Account has been deleted.", 403, "ACCOUNT_DELETED");
    }
}

function assertDriverCanWork(driver) {
    if (driver.is_activated !== 1) {
        throw new AppError(
            "Account has not been activated yet.",
            403,
            "ACCOUNT_NOT_ACTIVATED"
        );
    }
    if (driver.account_active !== 1) {
        throw new AppError(
            "Account is inactive. Please contact support.",
            403,
            "ACCOUNT_INACTIVE"
        );
    }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function mapLocation(loc) {
    if (!loc) return null;
    return {
        lat:        loc.lat,
        long:       loc.long,
        b_angle:    loc.b_angle,
        updated_at: loc.updated_at,
    };
}

// ─── GET /working-status ──────────────────────────────────────────────────────

export async function getWorkingStatus(auth) {
    const driverId = Number(auth.userId);
    const driver = await findDriverWorkingStatus(driverId);
    assertDriverActive(driver);

    const location = await getDriverCurrentLocation(driverId);

    return {
        online:               driver.available,
        operation_status:     driver.operation_status,
        available_for_rental: driver.available_for_rental,
        ride: driver.ride_id
            ? { id: driver.ride_id, ride_type: driver.ride_type }
            : null,
        route: driver.route_id
            ? { id: driver.route_id, name: driver.route_name }
            : null,
        reg_route: driver.reg_route_id
            ? { id: driver.reg_route_id, name: driver.reg_route_name }
            : null,
        location: mapLocation(location),
    };
}

// ─── PATCH /working-status/online ─────────────────────────────────────────────

export async function patchOnlineStatus(auth, payload) {
    const driverId  = Number(auth.userId);
    const driver    = await findDriverWorkingStatus(driverId);
    assertDriverActive(driver);

    const goingOnline = payload.online === 1;

    // Going online requires a fully active account
    if (goingOnline) {
        assertDriverCanWork(driver);
    }

    await setDriverAvailable(driverId, goingOnline ? 1 : 0);

    // Upsert location when going online and coordinates are provided
    const hasCoords = payload.lat != null && payload.long != null;
    if (goingOnline && hasCoords) {
        await upsertDriverCurrentLocation({
            driver_id:          driverId,
            lat:                payload.lat,
            long:               payload.long,
            b_angle:            payload.b_angle ?? 0,
            loc_static_status:  1,
            loc_static_duration: null,
        });
    }

    const updated  = await findDriverWorkingStatus(driverId);
    const location = await getDriverCurrentLocation(driverId);

    return {
        online:           updated.available,
        operation_status: updated.operation_status,
        location:         mapLocation(location),
    };
}

// ─── PATCH /working-status/service-type ───────────────────────────────────────

export async function patchServiceType(auth, payload) {
    const driverId = Number(auth.userId);
    const driver   = await findDriverWorkingStatus(driverId);
    assertDriverActive(driver);

    const fields = {};
    if (payload.available_for_rental !== undefined) {
        fields.available_for_rental = payload.available_for_rental === 1 ? 1 : 0;
    }

    if (Object.keys(fields).length === 0) {
        throw new AppError(
            "No valid service-type fields provided.",
            422,
            "NO_UPDATE_FIELDS"
        );
    }

    await setDriverServiceFlags(driverId, fields);
    const updated = await findDriverWorkingStatus(driverId);

    return {
        available_for_rental: updated.available_for_rental,
    };
}

// ─── GET /working-status/areas ────────────────────────────────────────────────

export async function getWorkingAreas(auth) {
    const driverId = Number(auth.userId);
    const driver   = await findDriverWorkingStatus(driverId);
    assertDriverActive(driver);

    const areas = await findAllRoutes();

    return {
        current_route_id: driver.route_id,
        reg_route_id:     driver.reg_route_id,
        areas,
    };
}

// ─── POST /location ───────────────────────────────────────────────────────────

export async function postLocation(auth, payload) {
    const driverId = Number(auth.userId);

    await upsertDriverCurrentLocation({
        driver_id:           driverId,
        lat:                 payload.lat,
        long:                payload.long,
        b_angle:             payload.b_angle          ?? 0,
        loc_static_status:   payload.loc_static_status ?? 1,
        loc_static_duration: null,
    });

    const location = await getDriverCurrentLocation(driverId);
    return { location };
}

// ─── POST /location/heartbeat ─────────────────────────────────────────────────

export async function postHeartbeat(auth, payload) {
    const driverId  = Number(auth.userId);
    const hasCoords = payload.lat != null && payload.long != null;

    if (hasCoords) {
        // Full upsert when coordinates are present
        await upsertDriverCurrentLocation({
            driver_id:           driverId,
            lat:                 payload.lat,
            long:                payload.long,
            b_angle:             payload.b_angle ?? 0,
            loc_static_status:   1,
            loc_static_duration: null,
        });
    } else {
        // No coordinates: only bump updated_at if a location row already exists.
        // No-op if the driver has never sent a location (safe — does not throw).
        await touchHeartbeat(driverId);
    }

    return { acknowledged: true, has_location_update: hasCoords };
}
