import { APP_CONFIG } from "../../../constants";
import { apiClient } from "../apiClient";

export interface PaginationQuery {
  page?: number;
  limit?: number;
}

export const homeApi = {
  getHome: async () => apiClient.get(`${APP_CONFIG.customerApiPrefix}/home`),
  getBanners: async () => apiClient.get(`${APP_CONFIG.customerApiPrefix}/banners`),
  getRoutes: async () => apiClient.get(`${APP_CONFIG.customerApiPrefix}/routes`),
  getRides: async (routeId?: number) =>
    apiClient.get(`${APP_CONFIG.customerApiPrefix}/rides`, {
      params: routeId ? { routeId } : undefined,
    }),
  getAvailableCoupons: async (params?: PaginationQuery & { search?: string; rideId?: number; routeId?: number }) =>
    apiClient.get(`${APP_CONFIG.customerApiPrefix}/coupons/available`, { params }),
  getNotifications: async (params?: PaginationQuery) =>
    apiClient.get(`${APP_CONFIG.customerApiPrefix}/notifications`, { params }),
  getNotificationUnreadCount: async () => apiClient.get(`${APP_CONFIG.customerApiPrefix}/notifications/unread-count`),
};
