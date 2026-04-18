import { apiClient } from "./authService";

function payload(response) {
    return response?.data?.data || response?.data || {};
}

export async function fetchVehicleTypes() {
    const response = await apiClient.get("/api/rentals/vehicle-types");
    return payload(response).items || [];
}

export async function listRentalPackages(params = {}) {
    const response = await apiClient.get("/api/rentals/packages", { params });
    return payload(response);
}

export async function createRentalPackage(data) {
    const response = await apiClient.post("/api/rentals/packages", data);
    return payload(response);
}

export async function updateRentalPackage(packageId, data) {
    const response = await apiClient.patch(`/api/rentals/packages/${packageId}`, data);
    return payload(response);
}

export async function toggleRentalPackageActive(packageId, active) {
    const response = await apiClient.patch(`/api/rentals/packages/${packageId}`, { active });
    return payload(response);
}
