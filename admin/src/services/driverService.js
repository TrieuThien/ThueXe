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

export async function getDriverMeta() {
    const response = await apiClient.get("/api/drivers/meta");
    return extractPayload(response);
}

export async function createDriver(formData) {
    const response = await apiClient.post("/api/drivers", formData, {
        transformRequest: [
            (data, headers) => {
                deleteJsonContentType(headers);
                return data;
            },
        ],
    });

    return extractPayload(response).driver;
}

export async function getDrivers(params = {}) {
    const response = await apiClient.get("/api/drivers", {
        params: sanitizeQueryParams(params),
    });

    return extractPayload(response);
}

export async function getDriverSummary(params = {}) {
    const response = await apiClient.get("/api/drivers/summary", {
        params: sanitizeQueryParams(params),
    });

    return extractPayload(response);
}

export async function getDriverDetail(driverId) {
    const response = await apiClient.get(`/api/drivers/${driverId}`);
    return extractPayload(response);
}

export async function updateDriverPersonalInfo(driverId, formData) {
    const response = await apiClient.put(`/api/drivers/${driverId}/personal-info`, formData, {
        transformRequest: [
            (data, headers) => {
                deleteJsonContentType(headers);
                return data;
            },
        ],
    });

    return extractPayload(response);
}

export async function updateDriverAccountStatus(driverId, payload) {
    const response = await apiClient.patch(`/api/drivers/${driverId}/account-status`, payload);
    return extractPayload(response);
}

export async function deleteDriverAccount(driverId, payload) {
    const response = await apiClient.patch(`/api/drivers/${driverId}/delete-account`, payload);
    return extractPayload(response);
}

export async function updateDriverWithdrawal(driverId, withdrawalId, payload) {
    const response = await apiClient.patch(
        `/api/drivers/${driverId}/withdrawals/${withdrawalId}`,
        payload
    );

    return extractPayload(response);
}

export async function getDriverLocation(driverId) {
    const response = await apiClient.get(`/api/drivers/${driverId}/location`);
    return extractPayload(response);
}

export { sanitizeQueryParams };
