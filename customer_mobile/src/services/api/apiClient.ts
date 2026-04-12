import axios, { AxiosError, AxiosInstance, AxiosRequestConfig, InternalAxiosRequestConfig } from "axios";

import { APP_CONFIG } from "../../constants";
import { useAuthStore } from "../../store";
import { ApiError } from "./errors";

export interface ApiResult<T> {
  data: T;
  error: null;
  message?: string;
}

interface ServerSuccessResponse<T> {
  success: true;
  message?: string;
  data: T;
}

interface ServerErrorResponse {
  success: false;
  message?: string;
  code?: string;
  error?: {
    code?: string;
    message?: string;
    fields?: unknown[];
  };
  details?: unknown;
}

const AUTH_FREE_ENDPOINTS = new Set<string>([
  "/api/customer/auth/login",
  "/api/customer/auth/register",
  "/api/customer/auth/verify-otp",
  "/api/customer/auth/forgot-password",
  "/api/customer/auth/reset-password",
  "/api/customer/auth/refresh-token",
]);

let isRefreshingToken = false;
let pendingRequests: Array<(token: string | null) => void> = [];

function normalizePath(url?: string): string {
  return String(url ?? "").split("?")[0];
}

function parseServerError(error: AxiosError<ServerErrorResponse>): ApiError {
  const status = error.response?.status ?? 0;
  const payload = error.response?.data;

  const code =
    payload?.error?.code ??
    payload?.code ??
    (status === 0 ? "NETWORK_ERROR" : status === 401 ? "UNAUTHORIZED" : status >= 500 ? "INTERNAL_ERROR" : "REQUEST_FAILED");
  const message = payload?.error?.message ?? payload?.message ?? error.message ?? "Request failed";

  return new ApiError({
    code,
    message,
    status,
    details: payload?.details ?? payload?.error?.fields,
  });
}

async function refreshAccessToken(client: AxiosInstance): Promise<string | null> {
  const authStore = useAuthStore.getState();
  const refreshToken = authStore.refreshToken;

  if (!refreshToken) {
    return null;
  }

  try {
    const response = await client.post<ServerSuccessResponse<{ accessToken: string; refreshToken?: string; user?: unknown }>>(
      `${APP_CONFIG.customerApiPrefix}/auth/refresh-token`,
      { refreshToken },
      { headers: { "x-skip-auth-refresh": "true" } },
    );

    const nextAccessToken = response.data?.data?.accessToken ?? null;
    const nextRefreshToken = response.data?.data?.refreshToken ?? refreshToken;

    if (!nextAccessToken) {
      return null;
    }

    useAuthStore.setState((state) => ({
      accessToken: nextAccessToken,
      refreshToken: nextRefreshToken,
      isAuthenticated: true,
    }));

    return nextAccessToken;
  } catch {
    return null;
  }
}

function createAxiosClient(): AxiosInstance {
  const client = axios.create({
    baseURL: APP_CONFIG.apiBaseUrl,
    timeout: 15000,
    headers: {
      "Content-Type": "application/json",
      "x-client-platform": "mobile",
    },
  });

  client.interceptors.request.use((config: InternalAxiosRequestConfig) => {
    const accessToken = useAuthStore.getState().accessToken;
    const path = normalizePath(config.url);
    const isAuthFree = AUTH_FREE_ENDPOINTS.has(path);

    if (!isAuthFree && accessToken) {
      config.headers.Authorization = `Bearer ${accessToken}`;
    }

    return config;
  });

  client.interceptors.response.use(
    (response) => response,
    async (error: AxiosError<ServerErrorResponse>) => {
      const status = error.response?.status;
      const originalConfig = (error.config ?? {}) as AxiosRequestConfig & {
        _retry?: boolean;
      };
      const path = normalizePath(originalConfig.url);
      const isAuthFree = AUTH_FREE_ENDPOINTS.has(path);
      const skipRefresh = originalConfig.headers?.["x-skip-auth-refresh"] === "true";

      if (
        status === 401 &&
        !originalConfig._retry &&
        !isAuthFree &&
        !skipRefresh &&
        path !== `${APP_CONFIG.customerApiPrefix}/auth/refresh-token`
      ) {
        if (isRefreshingToken) {
          return new Promise((resolve, reject) => {
            pendingRequests.push((newToken) => {
              if (!newToken) {
                reject(new ApiError({ code: "UNAUTHORIZED", message: "Session expired", status: 401 }));
                return;
              }

              if (!originalConfig.headers) {
                originalConfig.headers = {};
              }
              originalConfig.headers.Authorization = `Bearer ${newToken}`;
              resolve(client(originalConfig));
            });
          });
        }

        originalConfig._retry = true;
        isRefreshingToken = true;

        const refreshedToken = await refreshAccessToken(client);

        isRefreshingToken = false;
        pendingRequests.forEach((cb) => cb(refreshedToken));
        pendingRequests = [];

        if (!refreshedToken) {
          useAuthStore.getState().clearSession();
          throw new ApiError({
            code: "UNAUTHORIZED",
            message: "Session expired",
            status: 401,
          });
        }

        if (!originalConfig.headers) {
          originalConfig.headers = {};
        }
        originalConfig.headers.Authorization = `Bearer ${refreshedToken}`;
        return client(originalConfig);
      }

      throw parseServerError(error);
    },
  );

  return client;
}

const axiosClient = createAxiosClient();

async function normalizeResponse<T>(request: Promise<{ data: ServerSuccessResponse<T> }>): Promise<ApiResult<T>> {
  const response = await request;
  return {
    data: response.data.data,
    error: null,
    message: response.data.message,
  };
}

export const apiClient = {
  raw: axiosClient,
  get: <T>(path: string, config?: AxiosRequestConfig) =>
    normalizeResponse<T>(axiosClient.get<ServerSuccessResponse<T>>(path, config)),
  post: <T>(path: string, body?: unknown, config?: AxiosRequestConfig) =>
    normalizeResponse<T>(axiosClient.post<ServerSuccessResponse<T>>(path, body, config)),
  put: <T>(path: string, body?: unknown, config?: AxiosRequestConfig) =>
    normalizeResponse<T>(axiosClient.put<ServerSuccessResponse<T>>(path, body, config)),
  patch: <T>(path: string, body?: unknown, config?: AxiosRequestConfig) =>
    normalizeResponse<T>(axiosClient.patch<ServerSuccessResponse<T>>(path, body, config)),
  delete: <T>(path: string, config?: AxiosRequestConfig) =>
    normalizeResponse<T>(axiosClient.delete<ServerSuccessResponse<T>>(path, config)),
};
