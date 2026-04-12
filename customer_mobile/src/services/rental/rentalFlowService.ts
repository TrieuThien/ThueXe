import {
  CreateRentalBookingRequest,
  CreateRentalBookingResponse,
  RentalPackageListResponse,
  RentalPricingRequest,
  RentalPricingResponse,
  RentalSearchCriteria,
} from "../../types";
import { APP_CONFIG } from "../../constants";
import { apiClient } from "../api/client";

export const rentalFlowService = {
  searchPackages: async (criteria: RentalSearchCriteria): Promise<RentalPackageListResponse> => {
    const response = await apiClient.get<RentalPackageListResponse>(`${APP_CONFIG.customerApiPrefix}/rentals/packages`, {
      params: { service_type: criteria.serviceType === "RENTAL_CAR" ? 1 : criteria.serviceType === "RENTAL_DRIVER" ? 2 : 3 },
    });
    const payload = (response.data ?? {}) as {
      packages?: unknown[];
      items?: Array<{
        package_id?: number | string;
        package_name?: string;
        base_price?: number;
        deposit_amount?: number;
        distance_limit_km?: number;
        extra_time_fee?: number;
        extra_distance_fee?: number;
      }>;
      suggestions?: unknown[];
    };

    const items = Array.isArray(payload.packages)
      ? payload.packages
      : Array.isArray(payload.items)
        ? payload.items
        : [];

    const packages = items.map((item, index) => {
      const source = (item ?? {}) as {
        package_id?: number | string;
        package_name?: string;
        base_price?: number;
        deposit_amount?: number;
        distance_limit_km?: number;
        extra_time_fee?: number;
        extra_distance_fee?: number;
      };

      const packageId = String(source.package_id ?? `pkg-${index}`);
      const basePrice = Number(source.base_price ?? 0);

      return {
        packageId,
        packageName: source.package_name ?? "Gói thuê",
        serviceType: criteria.serviceType,
        basePrice,
        totalEstimatedPrice: basePrice,
        currency: "VND" as const,
        availableVehicles: 0,
        conditions: {
          securityDeposit: Number(source.deposit_amount ?? 0),
          distanceLimitKm: Number(source.distance_limit_km ?? 0),
          overtimeFeePerHour: Number(source.extra_time_fee ?? 0),
          overDistanceFeePerKm: Number(source.extra_distance_fee ?? 0),
        },
        highlights: [],
      };
    });

    const suggestions = Array.isArray(payload.suggestions)
      ? payload.suggestions.filter((item): item is string => typeof item === "string")
      : [];

    return {
      criteria,
      packages,
      suggestions,
    };
  },

  estimatePricing: async (payload: RentalPricingRequest): Promise<RentalPricingResponse> => {
    const response = await apiClient.post<RentalPricingResponse>(`${APP_CONFIG.customerApiPrefix}/rentals/fare-estimate`, payload);
    return response.data;
  },

  createRentalBooking: async (payload: CreateRentalBookingRequest): Promise<CreateRentalBookingResponse> => {
    const response = await apiClient.post<CreateRentalBookingResponse>(`${APP_CONFIG.customerApiPrefix}/rentals/bookings`, payload);
    return response.data;
  },
};
