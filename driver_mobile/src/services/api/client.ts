import axios, { AxiosError, type AxiosRequestConfig } from 'axios';
import { API_TIMEOUT } from '../../constants/app';
import { tokenStorage } from '../storage/tokenStorage';
import { mockApiAdapter } from '../mock/mockServer';

type RetryableConfig = AxiosRequestConfig & { _retry?: boolean };

const baseConfig: AxiosRequestConfig = {
  baseURL: 'https://api.thuexe.local',
  timeout: API_TIMEOUT,
  adapter: mockApiAdapter
};

export const apiClient = axios.create(baseConfig);

let refreshPromise: Promise<string | null> | null = null;

const runRefreshToken = async (): Promise<string | null> => {
  const saved = await tokenStorage.loadTokens();
  if (!saved?.refreshToken) {
    return null;
  }

  try {
    const response = await axios.create(baseConfig).post('/auth/refresh', {
      refreshToken: saved.refreshToken
    });
    const nextTokens = response.data.data;
    await tokenStorage.saveTokens(nextTokens);
    return nextTokens.accessToken;
  } catch {
    await tokenStorage.clearTokens();
    return null;
  }
};

apiClient.interceptors.request.use(async (config) => {
  const tokens = await tokenStorage.loadTokens();
  if (tokens?.accessToken) {
    config.headers = {
      ...(config.headers as any),
      Authorization: `Bearer ${tokens.accessToken}`
    } as any;
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const original = error.config as RetryableConfig;
    if (error.response?.status !== 401 || original?._retry) {
      return Promise.reject(error);
    }

    original._retry = true;

    if (!refreshPromise) {
      refreshPromise = runRefreshToken();
    }

    const nextAccessToken = await refreshPromise;
    refreshPromise = null;

    if (!nextAccessToken) {
      return Promise.reject(error);
    }

    original.headers = {
      ...(original.headers as any),
      Authorization: `Bearer ${nextAccessToken}`
    } as any;

    return apiClient(original);
  }
);
