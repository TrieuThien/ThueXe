import { apiClient } from "./authService";

function extractPayload(response) {
    return response?.data?.data || {};
}

export function getApiBaseUrl() {
    return import.meta.env.VITE_API_BASE_URL?.trim()?.replace(/\/+$/, "") || "";
}

export function getCarImageUrl(rideImg) {
    if (!rideImg) {
        return "";
    }

    if (/^https?:\/\//i.test(rideImg)) {
        return rideImg;
    }

    const baseUrl = getApiBaseUrl();

    if (!baseUrl) {
        return rideImg;
    }

    return `${baseUrl}${rideImg.startsWith("/") ? rideImg : `/${rideImg}`}`;
}

export function getCarIconUrl(iconType) {
    const normalizedIconType = Math.min(6, Math.max(1, Number(iconType) || 1));
    return `/car-icons/driver-icon-${normalizedIconType}.png`;
}

export async function fetchCars() {
    const response = await apiClient.get("/api/cars");
    return extractPayload(response).cars || [];
}

export async function createCar(payload) {
    const response = await apiClient.post("/api/cars", payload, {
        headers: {
            "Content-Type": "multipart/form-data",
        },
    });

    return extractPayload(response).car;
}

export async function updateCar(id, payload) {
    const response = await apiClient.put(`/api/cars/${id}`, payload, {
        headers: {
            "Content-Type": "multipart/form-data",
        },
    });

    return extractPayload(response).car;
}
