import { useMutation, useQuery } from "@tanstack/react-query";

import { QUERY_KEY_FACTORY, QUERY_KEYS } from "../../constants";
import {
  CreateRentalBookingRequest,
  RentalPricingRequest,
  RentalSearchCriteria,
} from "../../types";
import { rentalFlowService } from "../../services/rental/rentalFlowService";
import { rentalApi } from "../../services/api/modules/rentalApi";

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

/** Tìm gói thuê gần vị trí người dùng (GIS filter phía server) */
export function useNearbyPackagesQuery(params: { lat: number; lng: number; service_type?: number } | null) {
  return useQuery<{ items: any[]; total: number }>({
    queryKey: QUERY_KEY_FACTORY.rentalPackages.nearby(
      params?.lat ?? 0,
      params?.lng ?? 0,
      params?.service_type
    ),
    queryFn: async () => {
      const res = await rentalApi
        .getNearbyPackages({ lat: params!.lat, lng: params!.lng, service_type: params?.service_type as 1 | 2 | 3 | undefined });
      return res.data as { items: any[]; total: number };
    },
    enabled: Boolean(params && Number.isFinite(params.lat) && Number.isFinite(params.lng)),
    staleTime: 30_000, // 30s cache — vị trí không thay đổi quá nhanh
  });
}

export function useCreateVehicleBookingMutation() {
  return useMutation({
    mutationFn: (params: Parameters<typeof rentalFlowService.createVehicleRentalBooking>[0]) =>
      rentalFlowService.createVehicleRentalBooking(params),
  });
}

/** Lấy danh sách xe khả dụng của 1 gói thuê */
export function usePackageCarsQuery(packageId: number | string | null) {
  return useQuery({
    queryKey: QUERY_KEY_FACTORY.rentalPackages.cars(packageId ?? 0),
    queryFn: () =>
      rentalApi
        .getPackageCars(packageId!)
        .then((res) => res.data),
    enabled: Boolean(packageId),
    staleTime: 60_000,
  });
}
