import { apiClient } from "./authService";

function payload(response) {
    return response?.data?.data || response?.data || {};
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

export async function getVehicleDocumentSubmissions(params = {}) {
    const response = await apiClient.get("/api/documents/vehicle-submissions", {
        params: sanitizeQueryParams(params),
    });
    return payload(response);
}

export async function reviewVehicleDocumentSubmission(submissionId, payloadData) {
    const response = await apiClient.patch(
        `/api/documents/vehicle-submissions/${submissionId}/review`,
        payloadData
    );
    return payload(response);
}
