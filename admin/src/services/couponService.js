import { apiClient } from "./authService";
import { sanitizeQueryParams } from "./driverService";

function extractPayload(response) {
    return response?.data?.data || {};
}

export async function getCouponMeta() {
    const response = await apiClient.get("/api/admin/coupons/meta");
    return extractPayload(response);
}

export async function getAdminCoupons(params = {}) {
    const response = await apiClient.get("/api/admin/coupons", {
        params: sanitizeQueryParams(params),
    });
    return extractPayload(response);
}

export async function getAdminCouponDetail(id) {
    const response = await apiClient.get(`/api/admin/coupons/${id}`);
    return extractPayload(response);
}

export async function createAdminCoupon(payload) {
    const response = await apiClient.post("/api/admin/coupons", payload);
    return extractPayload(response);
}

export async function updateAdminCoupon(id, payload) {
    const response = await apiClient.patch(`/api/admin/coupons/${id}`, payload);
    return extractPayload(response);
}

export async function updateAdminCouponStatus(id, status) {
    const response = await apiClient.patch(`/api/admin/coupons/${id}/status`, { status });
    return extractPayload(response);
}

export async function getAvailableCoupons(params = {}) {
    const response = await apiClient.get("/api/coupons/available", {
        params: sanitizeQueryParams(params),
    });
    return extractPayload(response);
}

export async function validateCoupon(payload) {
    const response = await apiClient.post("/api/coupons/validate", payload);
    return extractPayload(response);
}

export async function applyCoupon(payload) {
    const response = await apiClient.post("/api/coupons/apply", payload);
    return extractPayload(response);
}

