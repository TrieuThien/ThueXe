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

export async function createCustomer(formData) {
    const response = await apiClient.post("/api/customers", formData, {
        transformRequest: [
            (data, headers) => {
                deleteJsonContentType(headers);
                return data;
            },
        ],
    });

    return extractPayload(response).customer;
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

export async function getCustomers(params = {}) {
    const response = await apiClient.get("/api/customers", {
        params: sanitizeQueryParams(params),
    });

    return extractPayload(response);
}

export async function getCustomerSummary(params = {}) {
    const response = await apiClient.get("/api/customers/summary", {
        params: sanitizeQueryParams(params),
    });

    return extractPayload(response);
}

export async function getCustomerDetail(userId) {
    const response = await apiClient.get(`/api/customers/${userId}`);
    return extractPayload(response);
}

export async function updateCustomerAccountStatus(userId, payload) {
    const normalizedUserId = Number(userId);

    if (!Number.isInteger(normalizedUserId) || normalizedUserId < 1) {
        throw new Error(`Invalid customer userId: ${userId}`);
    }

    console.log("Updating account status for userId:", normalizedUserId, "with payload:", payload);
    const response = await apiClient.patch(`/api/customers/${normalizedUserId}/account-status`, payload);
    return extractPayload(response);
}

export async function updateCustomerPersonalInfo(userId, formData) {
    const response = await apiClient.put(`/api/customers/${userId}/personal-info`, formData, {
        transformRequest: [
            (data, headers) => {
                deleteJsonContentType(headers);
                return data;
            },
        ],
    });

    return extractPayload(response);
}
