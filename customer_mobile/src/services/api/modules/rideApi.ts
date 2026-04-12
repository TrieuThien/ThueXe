import { APP_CONFIG } from "../../../constants";
import { apiClient } from "../apiClient";

export interface RideHistoryQuery {
  page?: number;
  limit?: number;
  status?: number;
}

export const rideApi = {
  estimateRoute: async (payload: unknown) =>
    apiClient.post(`${APP_CONFIG.customerApiPrefix}/ride/map/estimate-route`, payload),
  estimateFare: async (payload: unknown) => apiClient.post(`${APP_CONFIG.customerApiPrefix}/ride/fare-estimate`, payload),
  createBooking: async (payload: unknown) => apiClient.post(`${APP_CONFIG.customerApiPrefix}/ride/bookings`, payload),
  getCurrentBooking: async () => apiClient.get(`${APP_CONFIG.customerApiPrefix}/ride/bookings/current`),
  getBookingHistory: async (params?: RideHistoryQuery) =>
    apiClient.get(`${APP_CONFIG.customerApiPrefix}/ride/bookings/history`, { params }),
  getBookingDetail: async (bookingId: string | number) =>
    apiClient.get(`${APP_CONFIG.customerApiPrefix}/ride/bookings/${bookingId}`),
  cancelBooking: async (bookingId: string | number, payload?: { reason?: string }) =>
    apiClient.post(`${APP_CONFIG.customerApiPrefix}/ride/bookings/${bookingId}/cancel`, payload ?? {}),
  changePaymentMethod: async (bookingId: string | number, payment_type: number) =>
    apiClient.post(`${APP_CONFIG.customerApiPrefix}/ride/bookings/${bookingId}/change-payment-method`, { payment_type }),
  getBookingTracking: async (bookingId: string | number) =>
    apiClient.get(`${APP_CONFIG.customerApiPrefix}/ride/bookings/${bookingId}/tracking`),
};
