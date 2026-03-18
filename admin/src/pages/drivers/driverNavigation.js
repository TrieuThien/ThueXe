import { buildRolePath } from "../../config/roleRoutes";

function buildSearchString(values = {}) {
    const searchParams = new URLSearchParams();

    Object.entries(values).forEach(([key, value]) => {
        if (value === undefined || value === null || value === "") {
            return;
        }

        searchParams.set(key, String(value));
    });

    const search = searchParams.toString();
    return search ? `?${search}` : "";
}

export function buildDriverDetailPath(role, driverId) {
    return buildRolePath(role, `drivers/${driverId}`);
}

export function buildDriverEditPath(role, driverId) {
    return buildRolePath(role, `drivers/${driverId}/edit`);
}

export function buildDriverBookingHistoryDestination(role, driver) {
    return {
        pathname: buildRolePath(role, "bookings"),
        search: buildSearchString({
            driver_id: driver.driver_id,
            driver_name: driver.full_name,
            driver_phone: driver.phone,
        }),
    };
}

export function buildDriverTrackingState(driver) {
    return {
        driver_id: driver.driver_id,
        driver_name: driver.full_name,
        driver_phone: driver.phone,
        available: driver.available,
    };
}
