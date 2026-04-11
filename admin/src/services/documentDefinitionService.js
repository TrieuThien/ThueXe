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

export async function getDocumentDefinitions(params = {}) {
    const response = await apiClient.get("/api/documents/definitions", {
        params: sanitizeQueryParams(params),
    });
    return payload(response);
}

export async function createDocumentDefinition(payloadData) {
    const response = await apiClient.post("/api/documents/definitions", payloadData);
    return payload(response);
}

export async function updateDocumentDefinition(documentId, payloadData) {
    const response = await apiClient.patch(`/api/documents/definitions/${documentId}`, payloadData);
    return payload(response);
}
