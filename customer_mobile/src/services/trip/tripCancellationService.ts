import { QUERY_KEYS } from "../../constants";
import { CancelTripRequest, CancelTripResponse, TripCancelPolicy } from "../../types";
import { apiClient } from "../api/client";
import { ApiError } from "../api/errors";
import { mockDelay } from "../mock/mockDelay";
import { mockManagedTrips } from "../mock/tripManagementData";
import { tripRuntimeState } from "../mock/tripRuntimeState";

const USE_MOCK_TRIP_CANCEL = true;

function throwError(code: string, message: string, status: number): never {
  throw new ApiError({ code, message, status });
}

export const tripCancellationService = {
  getCancelPolicy: async (bookingId: string): Promise<TripCancelPolicy> => {
    if (USE_MOCK_TRIP_CANCEL) {
      await mockDelay(260);
      const trip = mockManagedTrips.find((item) => item.bookingId === bookingId) ?? mockManagedTrips[0];

      if (trip.status === "COMPLETED" || trip.status === "CANCELLED") {
        return {
          bookingId,
          canCancel: false,
          disabledReason: "Chuyến đã hoàn tất hoặc đã hủy.",
          reasons: [],
        };
      }

      const fee = trip.status === "IN_PROGRESS" ? 30000 : trip.status === "ARRIVED" ? 20000 : 0;

      return {
        bookingId,
        canCancel: true,
        warningText: fee > 0 ? "Hủy lúc này có thể phát sinh phí hủy." : "ạn có thể hủy miễn phí vào thời điểm này.",
        estimatedCancellationFee: fee,
        reasons: [
          "Thay đổi kế hoạch",
          "Đổi quá lâu",
          "Sai thông tin điểm đón/đến",
          "Lý do khác",
        ],
      };
    }

    const response = await apiClient.get<TripCancelPolicy>(`/bookings/${bookingId}/cancel-policy`);
    return response.data;
  },

  cancelTrip: async (payload: CancelTripRequest): Promise<CancelTripResponse> => {
    if (USE_MOCK_TRIP_CANCEL) {
      await mockDelay(400);

      const trip = mockManagedTrips.find((item) => item.bookingId === payload.bookingId) ?? mockManagedTrips[0];
      if (trip.status === "COMPLETED" || trip.status === "CANCELLED") {
        throwError("CANCEL_NOT_ALLOWED", "Khong the huy chuyen nay", 400);
      }

      const fee = trip.status === "IN_PROGRESS" ? 30000 : trip.status === "ARRIVED" ? 20000 : 0;
      trip.status = "CANCELLED";
      trip.updatedAt = new Date().toISOString();
      tripRuntimeState.forcedActiveStatus = "CANCELLED";

      return {
        bookingId: payload.bookingId,
        newStatus: "CANCELLED",
        cancellationFee: fee,
        message: "Da huy chuyen thanh cong",
      };
    }

    const response = await apiClient.post<CancelTripResponse>(`/bookings/${payload.bookingId}/cancel`, payload);
    return response.data;
  },
};

export const tripCancellationQueryKeys = {
  policy: (bookingId: string) => [...QUERY_KEYS.tripCancelPolicy, bookingId] as const,
};
