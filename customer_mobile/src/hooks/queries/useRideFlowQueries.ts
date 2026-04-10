import { useMutation, useQuery } from "@tanstack/react-query";

import {
  CreateRideBookingRequest,
  RidePricingEstimateRequest,
  RideRouteEstimateRequest,
} from "../../types";
import { rideFlowQueryKeys, rideFlowService } from "../../services/ride/rideFlowService";

export function useRideRouteEstimateMutation() {
  return useMutation({
    mutationFn: (payload: RideRouteEstimateRequest) => rideFlowService.getRouteEstimate(payload),
  });
}

export function useRideVehicleOptionsQuery(routeId?: string) {
  return useQuery({
    queryKey: rideFlowQueryKeys.vehicleOptions(routeId),
    queryFn: () => rideFlowService.getVehicleOptions(routeId ?? ""),
    enabled: Boolean(routeId),
  });
}

export function useRidePaymentMethodsQuery() {
  return useQuery({
    queryKey: ["ride", "payment-methods"],
    queryFn: () => rideFlowService.getPaymentMethods(),
  });
}

export function useRideCouponsQuery() {
  return useQuery({
    queryKey: ["ride", "coupons"],
    queryFn: () => rideFlowService.getAvailableCoupons(),
  });
}

export function useRidePricingQuery(payload?: RidePricingEstimateRequest) {
  return useQuery({
    queryKey: rideFlowQueryKeys.pricing(
      payload?.routeId,
      payload?.vehicleCode,
      payload?.paymentMethodId,
      payload?.couponCode,
      payload?.scheduledAt,
    ),
    queryFn: () => rideFlowService.estimatePricing(payload as RidePricingEstimateRequest),
    enabled: Boolean(payload?.routeId && payload?.vehicleCode && payload?.paymentMethodId),
  });
}

export function useCreateRideBookingMutation() {
  return useMutation({
    mutationFn: (payload: CreateRideBookingRequest) => rideFlowService.createRideBooking(payload),
  });
}

export function useDriverAllocationStatusQuery(bookingId?: string, enabled = true) {
  return useQuery({
    queryKey: rideFlowQueryKeys.driverAllocation(bookingId ?? "none"),
    queryFn: () => rideFlowService.getDriverAllocationStatus(bookingId ?? ""),
    enabled: Boolean(bookingId) && enabled,
    refetchInterval: 3500,
  });
}

export function useRetryDriverAllocationMutation() {
  return useMutation({
    mutationFn: (bookingId: string) => rideFlowService.retryDriverAllocation(bookingId),
  });
}
