/**
 * driverHireRentalApi.ts
 *
 * API calls cho tài xế thực hiện dịch vụ thuê tài xế:
 *  - Báo đã đến điểm đón
 *  - Bắt đầu / kết thúc dịch vụ
 *  - Tạm dừng / tiếp tục tính giờ
 *  - Lấy tổng kết
 */

import { apiClient } from './client';

export interface RentalSummary {
  rental_id: number;
  rental_code: string;
  status: string;
  customer_name: string;
  pickup_address: string;
  start_datetime: string;
  actual_end_datetime: string | null;
  total_elapsed_min: number;
  total_paused_min: number;
  billable_min: number;
  billable_hours: number;
  base_price: number;
  extra_time_fee: number;
  extra_distance_fee: number;
  actual_cost: number;
  driver_earnings: number;
  payment_status: string;
}

export const driverHireRentalApi = {
  /** POST /api/driver/rental/bookings/:rentalId/arrived */
  arrivedAtPickup: async (rentalId: string): Promise<void> => {
    await apiClient.post(`/api/driver/rental/bookings/${rentalId}/arrived`);
  },

  /** POST /api/driver/rental/bookings/:rentalId/start */
  startService: async (rentalId: string): Promise<void> => {
    await apiClient.post(`/api/driver/rental/bookings/${rentalId}/start`);
  },

  /** POST /api/driver/rental/bookings/:rentalId/pause */
  pauseService: async (rentalId: string): Promise<void> => {
    await apiClient.post(`/api/driver/rental/bookings/${rentalId}/pause`);
  },

  /** POST /api/driver/rental/bookings/:rentalId/resume */
  resumeService: async (rentalId: string): Promise<void> => {
    await apiClient.post(`/api/driver/rental/bookings/${rentalId}/resume`);
  },

  /** POST /api/driver/rental/bookings/:rentalId/complete */
  endService: async (rentalId: string, distanceTravelledKm?: number): Promise<void> => {
    await apiClient.post(`/api/driver/rental/bookings/${rentalId}/complete`, {
      distance_travelled_km: distanceTravelledKm,
    });
  },

  /** GET /api/driver/rental/bookings/:rentalId/summary */
  getSummary: async (rentalId: string): Promise<RentalSummary> => {
    const res = await apiClient.get(`/api/driver/rental/bookings/${rentalId}/summary`);
    return res.data.data as RentalSummary;
  },
};
