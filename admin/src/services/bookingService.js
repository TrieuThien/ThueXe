import { apiClient } from "./authService";

function extractPayload(response) {
    return response?.data?.data || {};
}

function sanitizeQueryParams(params = {}) {
    return Object.entries(params).reduce((accumulator, [key, value]) => {
        if (value === undefined || value === null || value === "") {
            return accumulator;
        }

        accumulator[key] = value;
        return accumulator;
    }, {});
}

function createIdempotencyKey() {
    const randomPart = Math.random().toString(36).slice(2, 10);
    return `booking-${Date.now()}-${randomPart}`;
}

export async function createBooking(payload, idempotencyKey = createIdempotencyKey()) {
    const response = await apiClient.post("/api/bookings", payload, {
        headers: {
            "x-idempotency-key": idempotencyKey,
        },
    });

    return extractPayload(response);
}

export async function getBookings(params = {}) {
    const response = await apiClient.get("/api/bookings", {
        params: sanitizeQueryParams(params),
    });

    return extractPayload(response);
}

export async function getProcessingBookings(params = {}) {
    const response = await apiClient.get("/api/bookings/processing", {
        params: sanitizeQueryParams(params),
    });

    return extractPayload(response);
}

export async function getScheduledBookings(params = {}) {
    const response = await apiClient.get("/api/bookings/scheduled", {
        params: sanitizeQueryParams(params),
    });

    return extractPayload(response);
}

export async function getBookingDetail(bookingId) {
    const response = await apiClient.get(`/api/bookings/${bookingId}`);
    return extractPayload(response);
}

export async function assignDriver(bookingId, driverId) {
    const response = await apiClient.patch(`/api/bookings/${bookingId}/assign-driver`, {
        driver_id: driverId,
    });

    return extractPayload(response);
}

export async function updateBookingStatus(bookingId, payload) {
    const response = await apiClient.patch(`/api/bookings/${bookingId}/status`, payload);
    return extractPayload(response);
}

export async function getAssignableDrivers(params = {}) {
    const response = await apiClient.get("/api/bookings-meta/assignable-drivers", {
        params: sanitizeQueryParams(params),
    });

    return extractPayload(response);
}

export async function getBookingMeta() {
    const response = await apiClient.get("/api/bookings-meta");
    return extractPayload(response);
}

export async function getBookingLocationSuggestions(params = {}) {
    const response = await apiClient.get("/api/bookings-meta/location-suggestions", {
        params: sanitizeQueryParams(params),
    });

    return extractPayload(response);
}

export async function estimateBookingRoute(params = {}) {
    const response = await apiClient.get("/api/bookings-meta/route-estimate", {
        params: sanitizeQueryParams(params),
    });

    return extractPayload(response);
}

export async function quoteBookingPrice(payload) {
    const response = await apiClient.post("/api/bookings-meta/price-quote", payload);
    return extractPayload(response);
}

export { sanitizeQueryParams };
