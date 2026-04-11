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

export async function getVehicleOwnerMeta() {
    const response = await apiClient.get("/api/vehicle-owners/meta");
    return extractPayload(response);
}

export async function getVehicleOwners(params = {}) {
    const response = await apiClient.get("/api/vehicle-owners", {
        params: sanitizeQueryParams(params),
    });
    return extractPayload(response);
}

export async function getVehicleOwnerSummary(params = {}) {
    const response = await apiClient.get("/api/vehicle-owners/summary", {
        params: sanitizeQueryParams(params),
    });
    return extractPayload(response);
}

export async function getVehicleOwnerDetail(ownerId) {
    const response = await apiClient.get(`/api/vehicle-owners/${ownerId}`);
    return extractPayload(response);
}

export async function createVehicleOwner(payload) {
    const response = await apiClient.post("/api/vehicle-owners", payload);
    return extractPayload(response);
}

export async function updateVehicleOwnerPersonalInfo(ownerId, payload) {
    const response = await apiClient.put(`/api/vehicle-owners/${ownerId}/personal-info`, payload);
    return extractPayload(response);
}

export async function updateVehicleOwnerAccountStatus(ownerId, payload) {
    const response = await apiClient.patch(`/api/vehicle-owners/${ownerId}/account-status`, payload);
    return extractPayload(response);
}

export async function deleteVehicleOwnerAccount(ownerId, payload = {}) {
    const response = await apiClient.patch(`/api/vehicle-owners/${ownerId}/delete-account`, payload);
    return extractPayload(response);
}

