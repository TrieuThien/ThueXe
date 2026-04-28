import { apiClient } from "./authService";

function extractPayload(res) {
    return res?.data?.data || {};
}

function sanitize(params = {}) {
    return Object.entries(params).reduce((acc, [key, value]) => {
        if (value !== undefined && value !== null && value !== "") {
            acc[key] = value;
        }
        return acc;
    }, {});
}

export async function getRentalBookings(params = {}) {
    const res = await apiClient.get("/api/rentals/bookings", { params: sanitize(params) });
    return extractPayload(res);
}

export async function getRentalBookingDetail(rentalId) {
    const res = await apiClient.get(`/api/rentals/bookings/${rentalId}`);
    return extractPayload(res);
}

export async function assignRentalBooking(rentalId, payload) {
    const res = await apiClient.patch(`/api/rentals/bookings/${rentalId}/assign`, payload);
    return extractPayload(res);
}

export async function updateRentalBookingStatus(rentalId, payload) {
    const res = await apiClient.patch(`/api/rentals/bookings/${rentalId}/status`, payload);
    return extractPayload(res);
}
