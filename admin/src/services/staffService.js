import { apiClient } from "./authService";

function extractPayload(response) {
    return response?.data?.data || {};
}

function deleteJsonContentType(headers) {
    if (!headers) {
        return;
    }

    delete headers["Content-Type"];
    delete headers["content-type"];
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

export async function getStaff(params = {}) {
    const response = await apiClient.get("/api/staff", {
        params: sanitizeQueryParams(params),
    });

    return extractPayload(response);
}

export async function getStaffSummary(params = {}) {
    const response = await apiClient.get("/api/staff/summary", {
        params: sanitizeQueryParams(params),
    });

    return extractPayload(response);
}

export async function getStaffDetail(userId) {
    const response = await apiClient.get(`/api/staff/${userId}`);
    return extractPayload(response);
}

export async function getMyStaffProfileDetail() {
    const response = await apiClient.get("/api/staff/me/detail");
    return extractPayload(response);
}

export async function createStaff(formData) {
    const response = await apiClient.post("/api/staff", formData, {
        transformRequest: [
            (data, headers) => {
                deleteJsonContentType(headers);
                return data;
            },
        ],
    });

    return extractPayload(response).staff;
}

export async function updateStaffPersonalInfo(userId, formData) {
    const response = await apiClient.put(`/api/staff/${userId}/personal-info`, formData, {
        transformRequest: [
            (data, headers) => {
                deleteJsonContentType(headers);
                return data;
            },
        ],
    });

    return extractPayload(response);
}

export async function deleteStaffAccount(userId, payload) {
    const response = await apiClient.patch(`/api/staff/${userId}/delete-account`, payload);
    return extractPayload(response);
}

export async function getRoutes() {
    const response = await apiClient.get("/api/routes");
    const payload = extractPayload(response);

    if (Array.isArray(payload)) {
        return payload;
    }

    if (Array.isArray(payload.items)) {
        return payload.items;
    }

    if (Array.isArray(payload.routes)) {
        return payload.routes;
    }

    return [];
}
