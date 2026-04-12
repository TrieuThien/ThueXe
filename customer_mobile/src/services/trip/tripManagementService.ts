import { QUERY_KEYS } from "../../constants";
import {
  ActiveTripResponse,
  DriverTrackingSnapshot,
  ManagedTrip,
  TripHistoryResponse,
} from "../../types";
import { APP_CONFIG } from "../../constants";
import { apiClient } from "../api/client";

export const tripManagementService = {
  getActiveTrip: async (): Promise<ActiveTripResponse> => {
    const response = await apiClient.get<ActiveTripResponse>(`${APP_CONFIG.customerApiPrefix}/ride/bookings/current`);
    return response.data;
  },

  getTripHistory: async (): Promise<TripHistoryResponse> => {
    const response = await apiClient.get<TripHistoryResponse>(`${APP_CONFIG.customerApiPrefix}/ride/bookings/history`);
    return response.data;
  },

  getTripDetail: async (bookingId: string): Promise<ManagedTrip | null> => {
    const response = await apiClient.get<ManagedTrip>(`${APP_CONFIG.customerApiPrefix}/ride/bookings/${bookingId}`);
    return response.data;
  },

  getDriverTracking: async (bookingId: string): Promise<DriverTrackingSnapshot> => {
    const response = await apiClient.get<DriverTrackingSnapshot>(`${APP_CONFIG.customerApiPrefix}/ride/bookings/${bookingId}/tracking`);
    return response.data;
  },
};

export const tripManagementQueryKeys = {
  active: QUERY_KEYS.activeTrip,
  history: QUERY_KEYS.tripHistory,
  detail: (bookingId: string) => [...QUERY_KEYS.tripDetail, bookingId] as const,
  tracking: (bookingId: string) => [...QUERY_KEYS.driverTracking, bookingId] as const,
};
