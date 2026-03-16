import axios from "axios";
import {
    clearAccessToken,
    getAccessToken,
    setAccessToken,
} from "./tokenStore";

const API_BASE_URL =
    import.meta.env.VITE_API_BASE_URL?.trim()?.replace(/\/+$/, "") || "";

const apiClient = axios.create({
    baseURL: API_BASE_URL,
    withCredentials: true,
    headers: {
        "Content-Type": "application/json",
    },
});

// Auto add Authorization header to requests if access token is available
// Tự động thêm header Authorization vào các request nếu access token có sẵn
apiClient.interceptors.request.use((config) => {
    const token = getAccessToken();

    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
});

// Auto refresh access token on 401 responses and retry the original request
// Tự động refresh access token khi nhận được response 401 và thử lại request ban đầu
apiClient.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error?.config;
        const status = error?.response?.status;
        const requestUrl = originalRequest?.url || "";
        const isRefreshRequest = requestUrl.includes("/api/auth/refresh-token");
        const isLoginRequest = requestUrl.includes("/api/auth/login");

        // Only attempt refresh if we get a 401, haven't already tried to refresh, and it's not an auth-related request
        // Chỉ cố gắng refresh nếu nhận được 401, chưa thử refresh trước đó, và không phải là request liên quan đến auth
        if (
            status === 401 &&
            originalRequest &&
            !originalRequest._retry &&
            !isRefreshRequest &&
            !isLoginRequest
        ) {
            originalRequest._retry = true;

            try {
                await refreshAccessToken();
                return apiClient(originalRequest);
            } catch (refreshError) {
                clearAccessToken();
                throw refreshError;
            }
        }

        throw error;
    }
);

function extractAuthPayload(responseData) {
    return responseData?.data || {};
}

export async function register(payload) {
    const response = await apiClient.post("/api/auth/register", payload);
    const authPayload = extractAuthPayload(response.data);

    setAccessToken(authPayload.accessToken);

    return authPayload;
}

export async function login(payload) {
    const response = await apiClient.post("/api/auth/login", payload);
    const authPayload = extractAuthPayload(response.data);
    setAccessToken(authPayload.accessToken);

    return authPayload;
}

export async function refreshAccessToken() {
    const response = await apiClient.post("/api/auth/refresh-token", {});
    const authPayload = extractAuthPayload(response.data);

    setAccessToken(authPayload.accessToken);

    return authPayload;
}

export async function getMe() {
    const response = await apiClient.get("/api/auth/me");
    return extractAuthPayload(response.data);
}

export async function logout() {
    try {
        await apiClient.post("/api/auth/logout", {});
    } finally {
        clearAccessToken();
    }
}

export async function createStaffAccount(payload) {
    const response = await apiClient.post("/api/auth/staff", {
        firstname: payload.firstname,
        lastname: payload.lastname,
        email: payload.email || undefined,
        phone: payload.phone || undefined,
        password: payload.password,
        role: payload.role,
    });

    return extractAuthPayload(response.data);
}

export async function initializeAuth() {
    try {
        return await refreshAccessToken();
    } catch {
        clearAccessToken();
        return null;
    }
}

export { apiClient };
