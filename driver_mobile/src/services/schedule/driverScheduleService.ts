import { apiClient } from '../api/client';
import type {
  CreateUnavailableSlotPayload,
  DriverScheduleResponse,
  GetDriverSchedulePayload,
  RentalBookingDetail,
  UpdateDriverScheduleSlotPayload
} from '../../types/schedule';

export const driverScheduleService = {
  async getDriverSchedule(payload: GetDriverSchedulePayload): Promise<DriverScheduleResponse> {
    const response = await apiClient.get('/driver/schedule', {
      params: payload
    });
    return response.data.data;
  },

  async createUnavailableSlot(payload: CreateUnavailableSlotPayload): Promise<DriverScheduleResponse> {
    const response = await apiClient.post('/driver/schedule/unavailable', payload);
    return response.data.data;
  },

  async updateScheduleSlot(payload: UpdateDriverScheduleSlotPayload): Promise<DriverScheduleResponse> {
    const response = await apiClient.patch('/driver/schedule/slot', payload);
    return response.data.data;
  },

  async getRentalBookingDetail(bookingId: string): Promise<RentalBookingDetail> {
    const response = await apiClient.get('/driver/rental-bookings/detail', {
      params: { bookingId }
    });
    return response.data.data;
  }
};
