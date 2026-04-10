import { useMutation, useQuery } from "@tanstack/react-query";

import { QUERY_KEYS } from "../../constants";
import {
  CreateRentalBookingRequest,
  RentalPricingRequest,
  RentalSearchCriteria,
} from "../../types";
import { rentalFlowService } from "../../services/rental/rentalFlowService";

export function useRentalPackagesQuery(criteria?: RentalSearchCriteria) {
  return useQuery({
    queryKey: [
      ...QUERY_KEYS.rentalPackages,
      criteria?.serviceType ?? "none",
      criteria?.startAt ?? "none",
      criteria?.durationHours ?? 0,
      criteria?.pickupAddress ?? "none",
      criteria?.dropoffAddress ?? "none",
    ],
    queryFn: () => rentalFlowService.searchPackages(criteria as RentalSearchCriteria),
    enabled: Boolean(criteria),
  });
}

export function useRentalPricingQuery(payload?: RentalPricingRequest) {
  return useQuery({
    queryKey: [
      ...QUERY_KEYS.rentalPricing,
      payload?.packageId ?? "none",
      payload?.criteria.startAt ?? "none",
      payload?.criteria.durationHours ?? 0,
      payload?.couponCode ?? "none",
    ],
    queryFn: () => rentalFlowService.estimatePricing(payload as RentalPricingRequest),
    enabled: Boolean(payload?.packageId),
  });
}

export function useCreateRentalBookingMutation() {
  return useMutation({
    mutationFn: (payload: CreateRentalBookingRequest) => rentalFlowService.createRentalBooking(payload),
  });
}
