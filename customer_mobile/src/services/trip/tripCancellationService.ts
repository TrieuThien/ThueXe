import { APP_CONFIG, QUERY_KEYS } from "../../constants";
import { CancelTripRequest, CancelTripResponse, TripCancelPolicy } from "../../types";
import { apiClient } from "../api/client";

export const tripCancellationService = {
  getCancelPolicy: async (bookingId: string): Promise<TripCancelPolicy> => {
    const response = await apiClient.get<TripCancelPolicy>(`${APP_CONFIG.customerApiPrefix}/ride/bookings/${bookingId}`);
    return response.data;
  },

  cancelTrip: async (payload: CancelTripRequest): Promise<CancelTripResponse> => {
    const response = await apiClient.post<CancelTripResponse>(
      `${APP_CONFIG.customerApiPrefix}/ride/bookings/${payload.bookingId}/cancel`,
      payload,
    );
    return response.data;
  },
};

export const tripCancellationQueryKeys = {
  policy: (bookingId: string) => [...QUERY_KEYS.tripCancelPolicy, bookingId] as const,
};
