import { APP_CONFIG } from "../../../constants";
import { apiClient } from "../apiClient";

export const realtimeApi = {
  streamUrl: (events: string[] = []) => {
    const query = events.length > 0 ? `?events=${encodeURIComponent(events.join(","))}` : "";
    return `${APP_CONFIG.apiBaseUrl}${APP_CONFIG.customerApiPrefix}/realtime/stream${query}`;
  },
  getHealth: async () => apiClient.get(`${APP_CONFIG.customerApiPrefix}/realtime/health`),
  getBookingStatusFallback: async (bookingId: string | number) =>
    apiClient.get(`${APP_CONFIG.customerApiPrefix}/realtime/booking/${bookingId}/status`),
  getDriverLocationFallback: async (bookingId: string | number) =>
    apiClient.get(`${APP_CONFIG.customerApiPrefix}/realtime/booking/${bookingId}/driver-location`),
};
