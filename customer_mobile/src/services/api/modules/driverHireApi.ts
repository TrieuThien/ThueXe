/**
 * driverHireApi.ts
 * API client cho luồng thuê tài xế tức thì / lịch hẹn.
 */

import apiClient from '../apiClient';

export interface CreateDriverHirePayload {
  package_id: number;
  booking_type: 'immediate' | 'scheduled';
  schedule_time?: string;   // ISO 8601, bắt buộc nếu scheduled
  duration_hours?: number;
  pickup_address: string;
  pickup_lat: number;
  pickup_lng: number;
  dropoff_address?: string;
  payment_type?: 1 | 2 | 3;
  note?: string;
}

export interface CreateDriverHireResponse {
  rental_id: number;
  rental_code: string;
  booking_type: 'immediate' | 'scheduled';
  status: string;
  package_name: string;
  start_datetime: string;
  end_datetime: string;
  base_price: number;
  deposit_amount: number;
  total_price: number;
  message: string;
}

export interface DriverInfo {
  driver_id: number;
  firstname: string;
  lastname: string;
  phone: string;
  photo_file: string | null;
  driver_rating: number;
  current_lat: number | null;
  current_lng: number | null;
}

export interface DriverHireBookingDetail {
  rental_id: number;
  rental_code: string;
  status: string;
  booking_type: string;
  matching_attempts: number;
  cancel_reason: string | null;
  driver: DriverInfo | null;
  package_name: string;
  start_datetime: string;
  end_datetime: string;
  pickup_address: string;
  pickup_lat: number | null;
  pickup_lng: number | null;
  base_price: number;
  total_price: number;
}

const BASE = '/api/customer/driver-hire';

export const driverHireApi = {
  /** POST /api/customer/driver-hire — tạo booking */
  create: async (payload: CreateDriverHirePayload): Promise<CreateDriverHireResponse> => {
    const res = await apiClient.post(BASE, payload);
    return res.data;
  },

  /** GET /api/customer/driver-hire/:bookingId — polling trạng thái */
  getStatus: async (bookingId: number): Promise<DriverHireBookingDetail> => {
    const res = await apiClient.get(`${BASE}/${bookingId}`);
    return res.data.booking;
  },

  /** POST /api/customer/driver-hire/:bookingId/cancel — hủy tìm tài xế */
  cancel: async (bookingId: number): Promise<void> => {
    await apiClient.post(`${BASE}/${bookingId}/cancel`);
  },
};
