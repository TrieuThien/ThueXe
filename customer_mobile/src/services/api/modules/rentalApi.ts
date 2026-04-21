import { APP_CONFIG } from "../../../constants";
import { apiClient } from "../apiClient";

export interface RentalHistoryQuery {
  page?: number;
  limit?: number;
}

export interface NearbyPackagesQuery {
  lat: number;
  lng: number;
  service_type?: 1 | 2 | 3;
}

export interface PackageCar {
  vehicle_id: number;
  owner_id: number;
  type_id: number;
  type_name: string;
  brand: string;
  model: string;
  year: string | null;
  color: string | null;
  license_plate: string;
  seat_count: number;
  transmission: "auto" | "manual";
  fuel_type: "petrol" | "diesel" | "electric" | "hybrid";
  status: string;
  owner_name: string | null;
  owner_phone: string | null;
  avg_rating: number | null;
  rating_count: number;
}

export const rentalApi = {
  getPackages: async (service_type: 1 | 2 | 3) =>
    apiClient.get(`${APP_CONFIG.customerApiPrefix}/rentals/packages`, { params: { service_type } }),

  estimateFare: async (payload: unknown) =>
    apiClient.post(`${APP_CONFIG.customerApiPrefix}/rentals/fare-estimate`, payload),

  createBooking: async (payload: unknown) =>
    apiClient.post(`${APP_CONFIG.customerApiPrefix}/rentals/bookings`, payload),

  getCurrentBooking: async () =>
    apiClient.get(`${APP_CONFIG.customerApiPrefix}/rentals/bookings/current`),

  getBookingHistory: async (params?: RentalHistoryQuery) =>
    apiClient.get(`${APP_CONFIG.customerApiPrefix}/rentals/bookings/history`, { params }),

  getBookingDetail: async (rentalId: string | number) =>
    apiClient.get(`${APP_CONFIG.customerApiPrefix}/rentals/bookings/${rentalId}`),

  cancelBooking: async (rentalId: string | number, payload?: { reason?: string }) =>
    apiClient.post(`${APP_CONFIG.customerApiPrefix}/rentals/bookings/${rentalId}/cancel`, payload ?? {}),

  getAvailableVehicles: async (start_datetime: string, end_datetime: string) =>
    apiClient.get(`${APP_CONFIG.customerApiPrefix}/rentals/vehicles/available`, {
      params: { start_datetime, end_datetime },
    }),

  getAvailableDrivers: async (start_datetime: string, end_datetime: string) =>
    apiClient.get(`${APP_CONFIG.customerApiPrefix}/rentals/drivers/available`, {
      params: { start_datetime, end_datetime },
    }),

  // ── GIS: tìm gói thuê gần vị trí người dùng ──────────────────────────────
  getNearbyPackages: async (params: NearbyPackagesQuery) =>
    apiClient.get("/api/mobile/rental-packages/nearby", { params }),

  // ── GIS: lấy xe khả dụng của gói thuê ────────────────────────────────────
  getPackageCars: async (packageId: number | string) =>
    apiClient.get(`/api/mobile/rental-packages/${packageId}/cars`),
};
