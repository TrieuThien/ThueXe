import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";

import { TRIP_STATUS_LABELS, TRIP_STATUS_STEPS, TRIP_STATUS_TONES } from "../../constants";
import { tripManagementQueryKeys, tripManagementService } from "../../services/trip/tripManagementService";
import { ManagedTrip, TripStatus } from "../../types";

export function useActiveTripQuery() {
  return useQuery({
    queryKey: tripManagementQueryKeys.active,
    queryFn: tripManagementService.getActiveTrip,
    refetchInterval: 5000,
  });
}

export function useTripHistoryQuery() {
  return useQuery({
    queryKey: tripManagementQueryKeys.history,
    queryFn: tripManagementService.getTripHistory,
  });
}

export function useTripDetailQuery(bookingId?: string) {
  return useQuery({
    queryKey: tripManagementQueryKeys.detail(bookingId ?? "none"),
    queryFn: () => tripManagementService.getTripDetail(bookingId ?? ""),
    enabled: Boolean(bookingId),
    refetchInterval: 5000,
  });
}

export function useDriverTrackingQuery(bookingId?: string, enabled = true) {
  return useQuery({
    queryKey: tripManagementQueryKeys.tracking(bookingId ?? "none"),
    queryFn: () => tripManagementService.getDriverTracking(bookingId ?? ""),
    enabled: Boolean(bookingId) && enabled,
    refetchInterval: 15_000,
  });
}

export function useTripStatusUi(status?: TripStatus) {
  return useMemo(() => {
    if (!status) {
      return {
        label: "Khong xac dinh",
        tone: "warning" as const,
        currentStep: -1,
        steps: TRIP_STATUS_STEPS,
      };
    }

    return {
      label: TRIP_STATUS_LABELS[status],
      tone: TRIP_STATUS_TONES[status],
      currentStep: TRIP_STATUS_STEPS.indexOf(status),
      steps: TRIP_STATUS_STEPS,
    };
  }, [status]);
}

export function useHasDriver(trip?: ManagedTrip | null) {
  return Boolean(trip?.driver && trip.status !== "PENDING");
}
