import { APP_CONFIG, QUERY_KEYS } from "../../constants";
import { CancelTripRequest, CancelTripResponse, TripCancelPolicy } from "../../types";
import { apiClient } from "../api/client";

function unwrapData<T>(payload: unknown): T {
  if (payload && typeof payload === "object" && "data" in (payload as Record<string, unknown>)) {
    return (payload as { data: T }).data;
  }
  return payload as T;
}

function toCancelResponse(payload: unknown, fallbackBookingId: string): CancelTripResponse {
  const raw = unwrapData<Record<string, unknown>>(payload);
  const booking = (raw?.booking as Record<string, unknown> | undefined) ?? {};
  const bookingId = String(booking?.id ?? raw?.bookingId ?? fallbackBookingId);
  const cancellationFee = Number(raw?.cancel_fee ?? raw?.cancellationFee ?? 0);
  return {
    bookingId,
    newStatus: "CANCELLED",
    cancellationFee: Number.isFinite(cancellationFee) ? cancellationFee : 0,
    message: "H?y chuy?n thành công.",
  };
}

export const tripCancellationService = {
  getCancelPolicy: async (bookingId: string): Promise<TripCancelPolicy> => {
    const response = await apiClient.get(`${APP_CONFIG.customerApiPrefix}/ride/bookings/${bookingId}/cancel-policy`);
    const raw = unwrapData<Record<string, unknown>>(response.data);
    return {
      bookingId: String(raw.bookingId ?? bookingId),
      canCancel: Boolean(raw.canCancel),
      disabledReason: raw.disabledReason ? String(raw.disabledReason) : undefined,
      warningText: raw.warningText ? String(raw.warningText) : undefined,
      estimatedCancellationFee: Number(raw.estimatedCancellationFee ?? 0),
      reasons: Array.isArray(raw.reasons) ? raw.reasons.map((r) => String(r)) : [],
    };
  },

  cancelTrip: async (payload: CancelTripRequest): Promise<CancelTripResponse> => {
    const response = await apiClient.post(
      `${APP_CONFIG.customerApiPrefix}/ride/bookings/${payload.bookingId}/cancel`,
      payload,
    );
    return toCancelResponse(response.data, String(payload.bookingId));
  },
};

export const tripCancellationQueryKeys = {
  policy: (bookingId: string) => [...QUERY_KEYS.tripCancelPolicy, bookingId] as const,
};
