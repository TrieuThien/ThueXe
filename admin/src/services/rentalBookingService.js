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
    const raw = extractPayload(res);
    const totalItems = Number(raw.totalItems || 0);
    const page = Number(raw.page || 1);
    const limit = Number(raw.limit || 15);
    return {
        items: raw.items || [],
        pagination: {
            page,
            total: totalItems,
            totalPages: limit > 0 ? Math.ceil(totalItems / limit) : 0,
        },
    };
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
