import { apiClient } from "./authService";
import { sanitizeQueryParams } from "./driverService";

function extractPayload(response) {
    return response?.data?.data || {};
}

export async function getBannerMeta() {
    const response = await apiClient.get("/api/admin/banners/meta");
    return extractPayload(response);
}

export async function getAdminBanners(params = {}) {
    const response = await apiClient.get("/api/admin/banners", {
        params: sanitizeQueryParams(params),
    });
    return extractPayload(response);
}

export async function getAdminBannerDetail(id) {
    const response = await apiClient.get(`/api/admin/banners/${id}`);
    return extractPayload(response);
}

export async function createAdminBanner(payload) {
    const response = await apiClient.post("/api/admin/banners", payload);
    return extractPayload(response);
}

export async function updateAdminBanner(id, payload) {
    const response = await apiClient.patch(`/api/admin/banners/${id}`, payload);
    return extractPayload(response);
}

export async function updateAdminBannerStatus(id, status) {
    const response = await apiClient.patch(`/api/admin/banners/${id}/status`, { status });
    return extractPayload(response);
}
