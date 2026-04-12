import { HomeOverview } from "../types";
import { APP_CONFIG } from "../constants";
import { apiClient } from "./api/client";

function ensureArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

function normalizeHomeOverview(payload: Partial<HomeOverview> | null | undefined): HomeOverview {
  return {
    currentAddress: String(payload?.currentAddress ?? ""),
    banners: ensureArray(payload?.banners),
    quickDestinations: ensureArray(payload?.quickDestinations),
    recentRoutes: ensureArray(payload?.recentRoutes),
    popularServices: ensureArray(payload?.popularServices),
    featuredCoupons: ensureArray(payload?.featuredCoupons),
  };
}

export const homeService = {
  getHomeOverview: async (): Promise<HomeOverview> => {
    const response = await apiClient.get<HomeOverview>(`${APP_CONFIG.customerApiPrefix}/home`);
    return normalizeHomeOverview(response.data);
  },
};
