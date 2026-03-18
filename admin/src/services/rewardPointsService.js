import { apiClient } from "./authService";
import { sanitizeQueryParams } from "./driverService";

function extractPayload(response) {
    return response?.data?.data || {};
}

export async function getRewardPointsConfig() {
    const response = await apiClient.get("/api/admin/reward-points/config");
    return extractPayload(response);
}

export async function updateRewardPointsConfig(payload) {
    const response = await apiClient.patch("/api/admin/reward-points/config", payload);
    return extractPayload(response);
}

export async function getRewardPointsHistory(params = {}) {
    const response = await apiClient.get("/api/admin/reward-points/history", {
        params: sanitizeQueryParams(params),
    });

    return extractPayload(response);
}

export async function adjustRewardPoints(payload) {
    const response = await apiClient.post("/api/admin/reward-points/adjust", payload);
    return extractPayload(response);
}

export async function redeemRewardPoints(payload) {
    const response = await apiClient.post("/api/admin/reward-points/redeem", payload);
    return extractPayload(response);
}

export async function processBookingRewardPoints(bookingId) {
    const response = await apiClient.post(`/api/admin/reward-points/bookings/${bookingId}/process`, {});
    return extractPayload(response);
}
