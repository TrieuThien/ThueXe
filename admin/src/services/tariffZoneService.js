import { apiClient } from "./authService";
import { sanitizeQueryParams } from "./driverService";

function extractPayload(response) {
    return response?.data?.data || {};
}

export async function getTariffMeta() {
    const response = await apiClient.get("/api/admin/tariffs/meta");
    return extractPayload(response);
}

export async function getTariffList(params = {}) {
    const response = await apiClient.get("/api/admin/tariffs", {
        params: sanitizeQueryParams(params),
    });

    return extractPayload(response);
}

export async function getTariffDetail(id) {
    const response = await apiClient.get(`/api/admin/tariffs/${id}`);
    return extractPayload(response);
}

export async function createTariff(payload) {
    const response = await apiClient.post("/api/admin/tariffs", payload);
    return extractPayload(response);
}

export async function updateTariff(id, payload) {
    const response = await apiClient.put(`/api/admin/tariffs/${id}`, payload);
    return extractPayload(response);
}

export async function getZoneMeta() {
    const response = await apiClient.get("/api/admin/zones/meta");
    return extractPayload(response);
}

export async function getZoneList(params = {}) {
    const response = await apiClient.get("/api/admin/zones", {
        params: sanitizeQueryParams(params),
    });

    return extractPayload(response);
}

export async function getZoneDetail(id) {
    const response = await apiClient.get(`/api/admin/zones/${id}`);
    return extractPayload(response);
}

export async function createZone(payload) {
    const response = await apiClient.post("/api/admin/zones", payload);
    return extractPayload(response);
}

export async function updateZone(id, payload) {
    const response = await apiClient.put(`/api/admin/zones/${id}`, payload);
    return extractPayload(response);
}

