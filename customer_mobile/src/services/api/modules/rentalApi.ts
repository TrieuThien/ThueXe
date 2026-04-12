import { APP_CONFIG } from "../../../constants";
import { apiClient } from "../apiClient";

export interface RentalHistoryQuery {
  page?: number;
  limit?: number;
}

export const rentalApi = {
  getPackages: async (service_type: 1 | 2 | 3) =>
    apiClient.get(`${APP_CONFIG.customerApiPrefix}/rentals/packages`, { params: { service_type } }),
  estimateFare: async (payload: unknown) =>
    apiClient.post(`${APP_CONFIG.customerApiPrefix}/rentals/fare-estimate`, payload),
  createBooking: async (payload: unknown) => apiClient.post(`${APP_CONFIG.customerApiPrefix}/rentals/bookings`, payload),
  getCurrentBooking: async () => apiClient.get(`${APP_CONFIG.customerApiPrefix}/rentals/bookings/current`),
  getBookingHistory: async (params?: RentalHistoryQuery) =>
    apiClient.get(`${APP_CONFIG.customerApiPrefix}/rentals/bookings/history`, { params }),
  getBookingDetail: async (rentalId: string | number) =>
    apiClient.get(`${APP_CONFIG.customerApiPrefix}/rentals/bookings/${rentalId}`),
  cancelBooking: async (rentalId: string | number, payload?: { reason?: string }) =>
    apiClient.post(`${APP_CONFIG.customerApiPrefix}/rentals/bookings/${rentalId}/cancel`, payload ?? {}),
  getAvailableVehicles: async (start_datetime: string, end_datetime: string) =>
    apiClient.get(`${APP_CONFIG.customerApiPrefix}/rentals/vehicles/available`, { params: { start_datetime, end_datetime } }),
  getAvailableDrivers: async (start_datetime: string, end_datetime: string) =>
    apiClient.get(`${APP_CONFIG.customerApiPrefix}/rentals/drivers/available`, { params: { start_datetime, end_datetime } }),
};
